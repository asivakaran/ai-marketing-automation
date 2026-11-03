import { NextResponse, type NextRequest } from "next/server";
import { db } from "@/lib/db";
import { extractSession, verifySessionToken } from "@/lib/auth";
import { sendSMS } from "@/lib/twilio";

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
    where: { tenantId: session.tenantId, provider: "TWILIO" },
  });
  const meta = (integration?.metadata ?? null) as Record<string, unknown> | null;
  const alertPhone = typeof meta?.alertPhone === "string" ? meta.alertPhone : null;
  if (!alertPhone) {
    return NextResponse.json(
      { success: false, error: { code: "NO_ALERT_PHONE", message: "Set an alert phone first." } },
      { status: 400 }
    );
  }

  const result = await sendSMS({
    to: alertPhone,
    tenantId: session.tenantId,
    body: "✅ Test alert from AutoPilot Marketing OS — if you can read this, lead alerts are working.",
  });

  // Record the attempt honestly — Settings > Alert history shows it too.
  try {
    await db.alertLog.create({
      data: {
        tenantId: session.tenantId,
        channel: "SMS",
        reason: "TEST",
        status: result.success ? (result.mock ? "MOCK" : "SENT") : "FAILED",
        toAddress: alertPhone,
        error: result.success ? null : (result.error ?? "send failed").slice(0, 200),
      },
    });
  } catch (e) {
    console.error("[test-sms] failed to write AlertLog:", e);
  }

  return NextResponse.json({
    success: true,
    data: { sentTo: alertPhone, mock: result.mock, sid: result.sid ?? null },
  });
}
