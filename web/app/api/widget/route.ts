import { NextResponse, type NextRequest } from "next/server";
import { db } from "@/lib/db";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS });
}

/**
 * Public endpoint used by widget.js on customer websites.
 * Returns the minimum branding needed to render the floating button.
 * GET /api/widget?tenantId=CLINK_apex
 */
export async function GET(req: NextRequest) {
  const tenantId = req.nextUrl.searchParams.get("tenantId")?.trim();
  if (!tenantId) {
    return NextResponse.json(
      { success: false, error: { code: "VALIDATION", message: "tenantId is required." } },
      { status: 400, headers: CORS }
    );
  }

  const tenant = await db.tenant.findUnique({
    where: { id: tenantId },
    select: { id: true, name: true, brandColor: true, logoUrl: true, isActive: true },
  });

  if (!tenant || !tenant.isActive) {
    return NextResponse.json(
      { success: false, error: { code: "TENANT_NOT_FOUND", message: "Unknown or inactive tenant." } },
      { status: 404, headers: CORS }
    );
  }

  return NextResponse.json(
    {
      success: true,
      data: {
        tenantId: tenant.id,
        name: tenant.name,
        brandColor: tenant.brandColor,
        logoUrl: tenant.logoUrl,
      },
    },
    { headers: CORS }
  );
}
