import { NextResponse, type NextRequest } from "next/server";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { generateChatResponse } from "@/lib/ai";
import { sendSMS, verifyTwilioSignature } from "@/lib/twilio";

/**
 * POST /api/twilio/inbound — webhook Twilio calls when a customer texts back.
 * No session: security comes from X-Twilio-Signature (HMAC-SHA1).
 *
 * - STOP  -> opt the lead out, confirm unsubscribe, never message again
 * - HELP  -> help text
 * - else  -> AI replies over SMS
 */
export async function POST(req: NextRequest) {
  const form = await req.formData().catch(() => null);
  if (!form) {
    return NextResponse.json(
      { success: false, error: { code: "VALIDATION", message: "Expected form-encoded body." } },
      { status: 400 }
    );
  }

  const params: Record<string, string> = {};
  for (const [key, value] of form.entries()) {
    if (typeof value === "string") params[key] = value;
  }
  const from = params["From"] ?? "";
  const body = (params["Body"] ?? "").trim();
  const signature = req.headers.get("x-twilio-signature") ?? "";

  await db.webhookEvent.create({
    data: {
      source: "twilio",
      eventType: "inbound.sms",
      payload: { from, body: body.slice(0, 200), signature: signature.slice(0, 12) + "…" },
      status: "RECEIVED",
    },
  });

  // ---- signature verification ----
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  if (authToken) {
    const url = `${(process.env.NEXT_PUBLIC_APP_URL ?? req.nextUrl.origin).replace(/\/$/, "")}/api/twilio/inbound`;
    const ok = verifyTwilioSignature({ authToken, signature, url, params });
    if (!ok) {
      console.warn("[twilio/inbound] rejected — bad X-Twilio-Signature");
      return NextResponse.json(
        { success: false, error: { code: "BAD_SIGNATURE", message: "Invalid Twilio signature." } },
        { status: 403 }
      );
    }
  } else if (process.env.NODE_ENV === "production") {
    return NextResponse.json(
      { success: false, error: { code: "UNCONFIGURED", message: "TWILIO_AUTH_TOKEN not set." } },
      { status: 503 }
    );
  } else {
    console.warn("[twilio/inbound] dev mode: signature NOT verified (no TWILIO_AUTH_TOKEN)");
  }

  if (!from || !body) {
    return NextResponse.json(
      { success: false, error: { code: "VALIDATION", message: "From and Body are required." } },
      { status: 400 }
    );
  }

  // ---- find lead by phone ----
  let phone = from;
  try {
    phone = from.startsWith("+44") ? from : from.replace(/^44/, "+44");
    if (phone.startsWith("07")) phone = "+44" + phone.slice(1);
  } catch {
    /* keep raw */
  }

  const lead = await db.lead.findFirst({
    where: { phone },
    include: { tenant: { select: { id: true, name: true, isActive: true } } },
  });
  if (!lead || !lead.tenant.isActive) {
    return NextResponse.json(
      { success: true, data: { handled: false, reason: "No matching lead." } },
      { status: 200 }
    );
  }

  const optedOut = Boolean(lead.notes?.includes("[opted-out]"));

  // ---- STOP ----
  if (/^stop$/i.test(body)) {
    await db.lead.update({
      where: { id: lead.id },
      data: { notes: `${lead.notes ?? ""} [opted-out]`.trim() },
    });
    await sendSMS({ to: phone, body: "You've been unsubscribed. Reply HELP for help." });
    return NextResponse.json({ success: true, data: { handled: true, action: "opted-out" } });
  }

  // ---- HELP ----
  if (/^help$/i.test(body)) {
    await sendSMS({
      to: phone,
      body: `${lead.tenant.name}: reply BOOK to arrange a visit, or call the office. Reply STOP to stop messages.`,
    });
    return NextResponse.json({ success: true, data: { handled: true, action: "help" } });
  }

  // ---- opted-out leads are never re-messaged ----
  if (optedOut) {
    return NextResponse.json({ success: true, data: { handled: true, action: "ignored-opted-out" } });
  }

  // ---- AI reply over SMS ----
  let conversation = await db.conversation.findFirst({
    where: { leadId: lead.id, channel: "SMS", status: "OPEN" },
  });
  if (!conversation) {
    conversation = await db.conversation.create({
      data: { tenantId: lead.tenantId, leadId: lead.id, channel: "SMS", status: "OPEN" },
    });
  }

  await db.message.create({
    data: { tenantId: lead.tenantId, conversationId: conversation.id, role: "USER", content: body },
  });

  const history = await db.message.findMany({
    where: { conversationId: conversation.id, role: { in: ["USER", "ASSISTANT"] } },
    orderBy: { sentAt: "desc" },
    take: 10,
  });

  const result = await generateChatResponse({
    tenant: { id: lead.tenant.id, name: lead.tenant.name },
    history: history.reverse().map((m) => ({ role: m.role as "USER" | "ASSISTANT", content: m.content })).slice(0, -1),
    message: body,
  });

  await db.message.create({
    data: {
      tenantId: lead.tenantId,
      conversationId: conversation.id,
      role: "ASSISTANT",
      content: result.reply,
      meta: ({ intents: result.intents, via: "twilio-inbound" } as unknown) as Prisma.InputJsonValue,
    },
  });
  await db.conversation.update({ where: { id: conversation.id }, data: { lastMessageAt: new Date() } });
  await db.lead.update({ where: { id: lead.id }, data: { lastMessageAt: new Date() } });

  await sendSMS({ to: phone, body: result.reply });

  return NextResponse.json({ success: true, data: { handled: true, action: "ai-replied" } });
}
