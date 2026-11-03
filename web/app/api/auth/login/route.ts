import { NextResponse, type NextRequest } from "next/server";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { createSessionToken, sessionCookieOptions } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as { email?: string; password?: string };
    const email = body.email?.trim().toLowerCase();
    const password = body.password ?? "";

    if (!email || !password) {
      return NextResponse.json(
        { success: false, error: { code: "VALIDATION", message: "Email and password are required." } },
        { status: 400 }
      );
    }

    const user = await db.user.findUnique({
      where: { email },
      include: { tenant: { select: { id: true, name: true, isActive: true } } },
    });
    if (!user || !(await bcrypt.compare(password, user.passwordHash)) || !user.tenant.isActive) {
      return NextResponse.json(
        { success: false, error: { code: "INVALID_CREDENTIALS", message: "Invalid email or password." } },
        { status: 401 }
      );
    }

    await db.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
    await db.auditLog.create({
      data: {
        tenantId: user.tenantId,
        userId: user.id,
        action: "auth.login",
        entity: "user",
        entityId: user.id,
        meta: { email: user.email },
      },
    });

    const token = await createSessionToken({
      userId: user.id,
      tenantId: user.tenantId,
      email: user.email,
      name: user.name,
      role: user.role,
    });

    const res = NextResponse.json({
      success: true,
      data: {
        user: { id: user.id, email: user.email, name: user.name, role: user.role },
        tenant: { id: user.tenant.id, name: user.tenant.name },
      },
    });
    res.cookies.set({ ...sessionCookieOptions, value: token });
    return res;
  } catch (err) {
    console.error("[auth/login]", err);
    return NextResponse.json(
      { success: false, error: { code: "SERVER_ERROR", message: "Could not sign in." } },
      { status: 500 }
    );
  }
}
