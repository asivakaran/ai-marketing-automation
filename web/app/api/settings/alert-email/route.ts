import { NextResponse, type NextRequest } from "next/server";
import { db } from "@/lib/db";
import { extractSession, verifySessionToken } from "@/lib/auth";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/** POST { email } — sets/updates the tenant's lead-alert email (Integration SMTP metadata). */
export async function POST(req: NextRequest) {
  const token = extractSession(req);
  const session = token ? await verifySessionToken(token) : null;
  if (!session) {
    return NextResponse.json(
      { success: false, error: { code: "UNAUTHORIZED", message: "Sign in first." } },
      { status: 401 }
    );
  }

  const body = (await req.json()) as { email?: string };
  const email = body.email?.trim().toLowerCase() ?? "";
  if (!email || email.length > 120 || !EMAIL_RE.test(email)) {
    return NextResponse.json(
      { success: false, error: { code: "INVALID_EMAIL", message: "Enter a valid email address." } },
      { status: 400 }
    );
  }

  const existing = await db.integration.findFirst({
    where: { tenantId: session.tenantId, provider: "SMTP" },
  });
  const meta = { ...((existing?.metadata ?? {}) as Record<string, unknown>), alertEmail: email };

  if (existing) {
    await db.integration.update({ where: { id: existing.id }, data: { metadata: meta, status: "CONNECTED" } });
  } else {
    await db.integration.create({
      data: { tenantId: session.tenantId, provider: "SMTP", status: "CONNECTED", metadata: meta },
    });
  }

  await db.auditLog.create({
    data: {
      tenantId: session.tenantId,
      userId: session.sub,
      action: "settings.updated",
      entity: "integration",
      meta: { provider: "SMTP", alertEmail: email },
    },
  });

  return NextResponse.json({ success: true, data: { alertEmail: email } });
}
