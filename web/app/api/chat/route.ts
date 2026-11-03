import { NextResponse, type NextRequest } from "next/server";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { extractSession, verifySessionToken, type SessionPayload } from "@/lib/auth";
import { generateChatResponse, isMockMode, normalizeUK, type ChatTurn, type ExtractedLeadFields } from "@/lib/ai";
import { sendSMS } from "@/lib/twilio";
import { sendEmail } from "@/lib/email";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS });
}

function bad(code: string, message: string, status: number) {
  return NextResponse.json({ success: false, error: { code, message } }, { status, headers: CORS });
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as {
      tenantId?: string;
      message?: string;
      conversationId?: string;
      channel?: "WEBSITE" | "SMS" | "INSTAGRAM" | "FACEBOOK";
    };

    const tenantId = body.tenantId?.trim();
    const message = body.message?.trim().slice(0, 1000);
    if (!tenantId || !message) return bad("VALIDATION", "tenantId and message are required.", 400);

    const tenant = await db.tenant.findUnique({
      where: { id: tenantId },
      select: { id: true, name: true, isActive: true },
    });
    if (!tenant || !tenant.isActive) return bad("TENANT_NOT_FOUND", "Unknown or inactive tenant.", 404);

    // Session is OPTIONAL — the widget is public. When present, enforce tenant scoping.
    let session: SessionPayload | null = null;
    const token = extractSession(req);
    if (token) session = await verifySessionToken(token);
    if (session && session.tenantId !== tenant.id) {
      return bad("FORBIDDEN", "Session does not belong to this tenant.", 403);
    }

    // ---- conversation ----
    let conversation = body.conversationId
      ? await db.conversation.findFirst({
          where: { id: body.conversationId, tenantId: tenant.id },
          include: { lead: true },
        })
      : null;

    if (!conversation) {
      conversation = await db.conversation.create({
        data: {
          tenantId: tenant.id,
          channel: body.channel ?? "WEBSITE",
          status: "OPEN",
        },
        include: { lead: true },
      });
    }
    if (conversation.status === "CLOSED") {
      await db.conversation.update({ where: { id: conversation.id }, data: { status: "OPEN" } });
    }

    // ---- history ----
    const priorMessages = await db.message.findMany({
      where: { conversationId: conversation.id },
      orderBy: { sentAt: "asc" },
      take: 20,
    });
    const history: ChatTurn[] = priorMessages
      .filter((m) => m.role === "USER" || m.role === "ASSISTANT")
      .map((m) => ({ role: m.role as "USER" | "ASSISTANT", content: m.content }));

    // ---- save user message ----
    await db.message.create({
      data: { tenantId: tenant.id, conversationId: conversation.id, role: "USER", content: message },
    });

    // ---- AI ----
    const result = await generateChatResponse({
      tenant: { id: tenant.id, name: tenant.name },
      history,
      message,
    });

    // ---- lead capture ----
    const ex: ExtractedLeadFields = result.extracted;
    if (ex.phone) {
      try {
        ex.phone = normalizeUK(ex.phone);
      } catch {
        /* leave as-is */
      }
    }
    let lead = conversation.lead;
    const wantLead = Boolean(ex.phone || ex.name);
    // Set when this turn CREATES a brand-new lead, or captures a phone number
    // a lead didn't have before — these are the moments the tenant must hear about.
    let createdNewLead = false;
    let phoneJustCaptured = false;

    if (wantLead) {
      if (!lead && ex.phone) {
        lead = await db.lead.findFirst({ where: { tenantId: tenant.id, phone: ex.phone } });
      }
      if (!lead) {
        createdNewLead = true;
        lead = await db.lead.create({
          data: {
            tenantId: tenant.id,
            name: ex.name ?? null,
            phone: ex.phone ?? null,
            source: conversation.channel === "SMS" ? "SMS" : "WEBSITE_CHAT",
            status: "NEW",
            serviceNeeded: ex.service_needed ?? null,
            postcode: ex.postcode ?? null,
            urgency: result.intents.emergency_detected ? "EMERGENCY" : "NORMAL",
            lastMessageAt: new Date(),
          },
        });
      } else {
        if (!lead.phone && ex.phone) phoneJustCaptured = true;
        lead = await db.lead.update({
          where: { id: lead.id },
          data: {
            name: lead.name ?? ex.name ?? null,
            phone: lead.phone ?? ex.phone ?? null,
            serviceNeeded: lead.serviceNeeded ?? ex.service_needed ?? null,
            postcode: lead.postcode ?? ex.postcode ?? null,
            urgency:
              result.intents.emergency_detected && lead.urgency !== "EMERGENCY"
                ? "EMERGENCY"
                : lead.urgency,
            lastMessageAt: new Date(),
          },
        });
      }
      if (conversation.leadId !== lead.id) {
        await db.conversation.update({
          where: { id: conversation.id },
          data: { leadId: lead.id },
        });
        conversation = { ...conversation, leadId: lead.id, lead };
      }
    } else if (lead) {
      await db.lead.update({ where: { id: lead.id }, data: { lastMessageAt: new Date() } });
    }

    // ---- save assistant message ----
    await db.message.create({
      data: {
        tenantId: tenant.id,
        conversationId: conversation.id,
        role: "ASSISTANT",
        content: result.reply,
        meta: ({
          intents: result.intents,
          extracted: result.extracted,
          mockMode: isMockMode(),
        } as unknown) as Prisma.InputJsonValue,
      },
    });
    const now = new Date();
    await db.conversation.update({ where: { id: conversation.id }, data: { lastMessageAt: now } });

    // ---- SMS + email alerts to the tenant (async, never blocks the chat) ----
    // Fires the moment there is something worth waking the roofer for:
    //   URGENT        — emergency flagged (leak pouring in, "asap", "tonight")
    //   NEW_LEAD      — a visitor just left their phone number (new lead, or
    //                    an existing lead that had no number until now)
    //   READY_TO_BOOK — they asked for a quote / survey / appointment
    const reason = result.intents.emergency_detected
      ? "URGENT"
      : createdNewLead || phoneJustCaptured
        ? "NEW_LEAD"
        : "READY_TO_BOOK";
    const shouldAlert =
      result.intents.emergency_detected ||
      result.intents.ready_to_book ||
      (createdNewLead && Boolean(lead?.phone)) ||
      phoneJustCaptured;

    if (shouldAlert) {
      void fireTenantAlert(tenant.id, lead?.id ?? null, reason, result.extracted, message).catch((e) =>
        console.error("[chat] tenant alert failed:", e)
      );
    }

    return NextResponse.json(
      {
        success: true,
        data: {
          conversationId: conversation.id,
          leadId: lead?.id ?? null,
          leadName: lead?.name ?? null,
          reply: result.reply,
          intents: result.intents,
          mockMode: isMockMode(),
        },
      },
      { headers: CORS }
    );
  } catch (err) {
    console.error("[chat]", err);
    return bad("SERVER_ERROR", "Chat failed. Try again.", 500);
  }
}

type AlertReason = "URGENT" | "NEW_LEAD" | "READY_TO_BOOK";

async function fireTenantAlert(
  tenantId: string,
  leadId: string | null,
  reason: AlertReason,
  extracted: ExtractedLeadFields,
  message: string
): Promise<void> {
  const [smsIntegration, emailIntegration] = await Promise.all([
    db.integration.findFirst({ where: { tenantId, provider: "TWILIO" } }),
    db.integration.findFirst({ where: { tenantId, provider: "SMTP" } }),
  ]);
  const smsMeta = (smsIntegration?.metadata ?? null) as Record<string, unknown> | null;
  const alertPhone = typeof smsMeta?.alertPhone === "string" ? smsMeta.alertPhone : null;
  const emailMeta = (emailIntegration?.metadata ?? null) as Record<string, unknown> | null;
  const alertEmail = typeof emailMeta?.alertEmail === "string" ? emailMeta.alertEmail : null;

  const lead = leadId ? await db.lead.findUnique({ where: { id: leadId } }) : null;
  const name = lead?.name ?? extracted.name ?? "Unnamed visitor";
  const phone = lead?.phone ?? extracted.phone ?? null;
  const phoneLabel = phone ?? "no number yet";
  const service = lead?.serviceNeeded ?? extracted.service_needed ?? "general enquiry";
  const postcode = lead?.postcode ?? extracted.postcode ?? null;

  const reasonLine =
    reason === "URGENT"
      ? "URGENT enquiry on your website — flagged as an emergency"
      : reason === "NEW_LEAD"
        ? "A visitor just left their number on your website"
        : "A website visitor is ready to book";
  const subject =
    reason === "URGENT"
      ? `🔥 URGENT lead: ${service} — ${name}`
      : reason === "NEW_LEAD"
        ? `🔔 New lead: ${service} — ${name}${phone ? ` — ${phone}` : ""}`
        : `📅 ${name} is ready to book — ${service}`;

  const smsBody =
    reason === "URGENT"
      ? `🔥 URGENT lead from your website — ${name}, ${phoneLabel}, ${service}. Call them back NOW.`
      : `🔔 New lead from your website — ${name}, ${phoneLabel}, ${service}. Reply YES to claim.`;

  // Each channel is independent — one failing must never block the other.
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "";
  const [smsResult, emailResult] = await Promise.allSettled([
    alertPhone
      ? sendSMS({ to: alertPhone, tenantId, body: smsBody })
      : Promise.resolve(null),
    alertEmail
      ? sendEmail({
          to: alertEmail,
          tenantId,
          subject,
          text: [
            `${reasonLine}.`,
            "",
            `Name: ${name}`,
            `Phone: ${phoneLabel}`,
            `Service: ${service}`,
            postcode ? `Postcode: ${postcode}` : null,
            `Enquiry: "${message.slice(0, 200)}"`,
            "",
            "Open the dashboard to claim it:",
            appUrl ? `${appUrl}/leads` : "(set NEXT_PUBLIC_APP_URL in .env to link your dashboard)",
          ]
            .filter((x): x is string => x !== null)
            .join("\n"),
          html: [
            `<div style="font-family:system-ui,sans-serif;max-width:520px">`,
            `<h2 style="margin:0 0 12px">${reason === "URGENT" ? '🔥 <span style="color:#dc2626">URGENT lead</span>' : reason === "NEW_LEAD" ? "🔔 New lead" : "📅 Ready to book"}${service ? ` — ${service}` : ""}</h2>`,
            `<p style="margin:0 0 12px;color:#334155">${reasonLine}.</p>`,
            `<table style="font-size:14px;line-height:1.7">`,
            `<tr><td style="color:#64748b;padding-right:12px">Name</td><td><b>${name}</b></td></tr>`,
            phone
              ? `<tr><td style="color:#64748b;padding-right:12px">Phone</td><td><b><a href="tel:${phone}" style="color:#0d9488">${phone}</a></b></td></tr>`
              : `<tr><td style="color:#64748b;padding-right:12px">Phone</td><td>not left yet — check the chat</td></tr>`,
            `<tr><td style="color:#64748b;padding-right:12px">Service</td><td>${service}</td></tr>`,
            postcode ? `<tr><td style="color:#64748b;padding-right:12px">Postcode</td><td>${postcode}</td></tr>` : "",
            `</table>`,
            `<p style="margin:16px 0;color:#475569;font-size:13px">They said: <i>"${message.slice(0, 200).replace(/</g, "&lt;")}"</i></p>`,
            appUrl ? `<p style="margin:16px 0"><a href="${appUrl}/leads" style="background:#0d9488;color:#fff;padding:10px 18px;border-radius:8px;text-decoration:none">Open dashboard &amp; claim</a></p>` : "",
            `<p style="color:#94a3b8;font-size:12px">Sent by your AutoPilot website assistant — captured automatically, 24/7.</p>`,
            `</div>`,
          ].join(""),
        })
      : Promise.resolve(null),
  ]);

  // ---- Record what ACTUALLY happened, so Settings > Alert history always tells the truth ----
  const log = async (channel: "EMAIL" | "SMS", to: string, r: { success: boolean; mock: boolean; error?: string } | null) => {
    try {
      await db.alertLog.create({
        data: {
          tenantId,
          leadId,
          channel,
          reason,
          status: !r ? "SKIPPED" : r.success ? (r.mock ? "MOCK" : "SENT") : "FAILED",
          toAddress: to,
          error: r && !r.success ? (r.error ?? "send failed").slice(0, 200) : null,
        },
      });
    } catch (e) {
      console.error("[alert] failed to write AlertLog:", e);
    }
  };

  const unwrap = (p: PromiseSettledResult<{ success: boolean; mock: boolean; error?: string } | null>) =>
    p.status === "fulfilled" ? p.value : { success: false, mock: false, error: String((p as PromiseRejectedResult).reason).slice(0, 200) };

  await Promise.all([
    log("SMS", alertPhone ?? "(no alert phone set)", unwrap(smsResult)),
    log("EMAIL", alertEmail ?? "(no alert email set)", unwrap(emailResult)),
  ]);
}
