import { NextResponse, type NextRequest } from "next/server";
import { db } from "@/lib/db";
import { extractSession, verifySessionToken } from "@/lib/auth";
import { normalizeUK } from "@/lib/ai";

/** POST { phone } — sets/updates the tenant's lead-alert phone (Integration TWILIO metadata). */
export async function POST(req: NextRequest) {
  const token = extractSession(req);
  const session = token ? await verifySessionToken(token) : null;
  if (!session) {
    return NextResponse.json(
      { success: false, error: { code: "UNAUTHORIZED", message: "Sign in first." } },
      { status: 401 }
    );
  }

  const body = (await req.json()) as { phone?: string };
  const raw = body.phone?.trim() ?? "";
  if (!raw) {
    return NextResponse.json(
      { success: false, error: { code: "VALIDATION", message: "phone is required." } },
      { status: 400 }
    );
  }

  let normalized: string;
  try {
    normalized = normalizeUK(raw);
  } catch {
    normalized = raw;
  }
  if (!/^\+447\d{9}$/.test(normalized)) {
    return NextResponse.json(
      { success: false, error: { code: "INVALID_PHONE", message: "Enter a valid UK mobile (07… or +447…)." } },
      { status: 400 }
    );
  }

  const existing = await db.integration.findFirst({
    where: { tenantId: session.tenantId, provider: "TWILIO" },
  });
  const meta = { ...((existing?.metadata ?? {}) as Record<string, unknown>), alertPhone: normalized };

  if (existing) {
    await db.integration.update({ where: { id: existing.id }, data: { metadata: meta, status: "CONNECTED" } });
  } else {
    await db.integration.create({
      data: { tenantId: session.tenantId, provider: "TWILIO", status: "CONNECTED", metadata: meta },
    });
  }

  await db.auditLog.create({
    data: {
      tenantId: session.tenantId,
      userId: session.sub,
      action: "settings.updated",
      entity: "integration",
      meta: { provider: "TWILIO", alertPhone: normalized },
    },
  });

  return NextResponse.json({ success: true, data: { alertPhone: normalized } });
}
