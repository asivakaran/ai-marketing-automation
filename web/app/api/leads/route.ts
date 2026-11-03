import { NextResponse, type NextRequest } from "next/server";
import { db } from "@/lib/db";
import { extractSession, verifySessionToken } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const token = extractSession(req);
  const session = token ? await verifySessionToken(token) : null;
  if (!session) {
    return NextResponse.json(
      { success: false, error: { code: "UNAUTHORIZED", message: "Sign in first." } },
      { status: 401 }
    );
  }

  const status = req.nextUrl.searchParams.get("status");
  const leads = await db.lead.findMany({
    where: {
      tenantId: session.tenantId,
      ...(status ? { status: (status as never) } : {}),
    },
    orderBy: { createdAt: "desc" },
    take: 100,
    select: {
      id: true, name: true, phone: true, email: true, source: true, status: true,
      serviceNeeded: true, postcode: true, urgency: true, value: true, lastMessageAt: true,
      createdAt: true,
    },
  });

  return NextResponse.json({ success: true, data: { leads } });
}
