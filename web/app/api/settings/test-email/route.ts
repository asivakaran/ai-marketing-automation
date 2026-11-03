import { NextResponse, type NextRequest } from "next/server";
import { db } from "@/lib/db";
import { extractSession, verifySessionToken } from "@/lib/auth";
import { sendEmail } from "@/lib/email";

export async function POST(req: NextRequest) {
  const token = extractSession(req);
  const session = token ? await verifySessionToken(token) : null;
  if (!session) {
    return NextResponse.json(
      { success: false, error: { code: "UNAUTHORIZED", message: "Sign in first." } },
      { status: 401 }
    );
  }

  const integration = await db.integration.findFirst({
    where: { tenantId: session.tenantId, provider: "SMTP" },
  });
  const meta = (integration?.metadata ?? null) as Record<string, unknown> | null;
  const alertEmail = typeof meta?.alertEmail === "string" ? meta.alertEmail : null;
  if (!alertEmail) {
    return NextResponse.json(
      { success: false, error: { code: "NO_ALERT_EMAIL", message: "Set an alert email first." } },
      { status: 400 }
    );
  }

  const result = await sendEmail({
    to: alertEmail,
    tenantId: session.tenantId,
    subject: "✅ Test alert — your lead alerts are working",
    text: [
      "This is a test alert from AutoPilot Marketing OS.",
      "",
      "The moment someone on your website leaves their name and number,",
      "you'll get an email like this within seconds — their details, what",
      "they need, and a link to claim the job.",
      "",
      "You will also get an SMS if an alert phone is set in Settings.",
    ].join("\n"),
  });

  // Record the attempt honestly — Settings > Alert history shows it too.
  try {
    await db.alertLog.create({
      data: {
        tenantId: session.tenantId,
        channel: "EMAIL",
        reason: "TEST",
        status: result.success ? (result.mock ? "MOCK" : "SENT") : "FAILED",
        toAddress: alertEmail,
        error: result.success ? null : (result.error ?? "send failed").slice(0, 200),
      },
    });
  } catch (e) {
    console.error("[test-email] failed to write AlertLog:", e);
  }

  return NextResponse.json({
    success: true,
    data: { sentTo: alertEmail, mock: result.mock, messageId: result.messageId ?? null },
  });
}
