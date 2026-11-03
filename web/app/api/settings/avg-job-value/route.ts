import { NextResponse, type NextRequest } from "next/server";
import { db } from "@/lib/db";
import { extractSession, verifySessionToken } from "@/lib/auth";

/** POST { value } — sets the tenant's average job value (whole £). Drives the
 *  "estimated pipeline" figure on the dashboard: booked jobs x avg job value. */
export async function POST(req: NextRequest) {
  const token = extractSession(req);
  const session = token ? await verifySessionToken(token) : null;
  if (!session) {
    return NextResponse.json(
      { success: false, error: { code: "UNAUTHORIZED", message: "Sign in first." } },
      { status: 401 }
    );
  }

  const body = (await req.json()) as { value?: number | string };
  const raw = typeof body.value === "string" ? Number(body.value) : body.value;
  const value = Math.round(Number(raw));
  if (!Number.isFinite(value) || value < 50 || value > 100_000) {
    return NextResponse.json(
      {
        success: false,
        error: { code: "INVALID_VALUE", message: "Enter an average job value between £50 and £100,000." },
      },
      { status: 400 }
    );
  }

  const tenant = await db.tenant.update({
    where: { id: session.tenantId },
    data: { avgJobValue: value },
    select: { avgJobValue: true },
  });

  await db.auditLog.create({
    data: {
      tenantId: session.tenantId,
      userId: session.sub,
      action: "settings.updated",
      entity: "tenant",
      meta: { avgJobValue: value },
    },
  });

  return NextResponse.json({ success: true, data: { avgJobValue: tenant.avgJobValue } });
}
