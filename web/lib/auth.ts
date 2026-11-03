import { SignJWT, jwtVerify, type JWTPayload } from "jose";
import type { NextRequest } from "next/server";

export const SESSION_COOKIE = "autopilot_session";
const encoder = new TextEncoder();

function getSecret(): Uint8Array {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.length < 16) {
    throw new Error("JWT_SECRET must be set (min 16 chars) — see .env.example");
  }
  return encoder.encode(secret);
}

export interface SessionPayload extends JWTPayload {
  sub: string; // user id
  tenantId: string;
  email: string;
  name: string | null;
  role: string;
}

export async function createSessionToken(payload: {
  userId: string;
  tenantId: string;
  email: string;
  name: string | null;
  role: string;
}): Promise<string> {
  return new SignJWT({
    tenantId: payload.tenantId,
    email: payload.email,
    name: payload.name,
    role: payload.role,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(payload.userId)
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(getSecret());
}

/** Reads the session from the `autopilot_session` cookie or `Authorization: Bearer` header. */
export function extractSession(req: NextRequest): string | null {
  const header = req.headers.get("authorization");
  if (header?.toLowerCase().startsWith("bearer ")) {
    const token = header.slice(7).trim();
    if (token) return token;
  }
  const cookie = req.cookies.get(SESSION_COOKIE)?.value;
  return cookie ?? null;
}

export async function verifySessionToken(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret(), { algorithms: ["HS256"] });
    if (!payload.sub || typeof payload.tenantId !== "string") return null;
    return payload as SessionPayload;
  } catch {
    return null;
  }
}

export const sessionCookieOptions = {
  name: SESSION_COOKIE,
  httpOnly: true,
  sameSite: "lax" as const,
  path: "/",
  maxAge: 60 * 60 * 24 * 7, // 7 days
  secure: process.env.NODE_ENV === "production",
};
