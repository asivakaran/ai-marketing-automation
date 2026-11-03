/**
 * lib/twilio.ts — SMS via Twilio with a mock fallback.
 *
 * - TWILIO_* env vars blank -> MOCK MODE: every SMS is logged to the console.
 * - Credentials present      -> real SMS via the twilio npm package.
 * UK mobile numbers are normalized to +447xxxxxxxxx on the way out.
 */
import { createHmac, timingSafeEqual } from "crypto";
import { normalizeUK } from "@/lib/ai";

export interface SmsResult {
  success: boolean;
  mock: boolean;
  sid?: string;
  error?: string;
}

export function isTwilioConfigured(): boolean {
  return Boolean(
    process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_PHONE
  );
}

export function normalizeOutbound(to: string): string {
  try {
    return normalizeUK(to);
  } catch {
    return to;
  }
}

export async function sendSMS(params: {
  to: string;
  body: string;
  tenantId?: string;
}): Promise<SmsResult> {
  const to = normalizeOutbound(params.to);

  if (!isTwilioConfigured()) {
    console.log(`[MOCK SMS] to=${to}${params.tenantId ? ` (tenant ${params.tenantId})` : ""} :: ${params.body}`);
    return { success: true, mock: true };
  }

  try {
    const { default: twilio } = await import("twilio");
    const client = twilio(process.env.TWILIO_ACCOUNT_SID!, process.env.TWILIO_AUTH_TOKEN!);
    const message = await client.messages.create({
      to,
      from: normalizeOutbound(process.env.TWILIO_PHONE!),
      body: params.body,
    });
    return { success: true, mock: false, sid: message.sid };
  } catch (err) {
    console.error("[twilio] send failed:", err);
    return { success: false, mock: false, error: err instanceof Error ? err.message : String(err) };
  }
}

/**
 * Verifies X-Twilio-Signature (HMAC-SHA1 over url + sorted params, base64).
 * Manual implementation on purpose: deterministic, zero ambiguity, no dependency
 * on the twilio package's export shape.
 */
export function verifyTwilioSignature(input: {
  authToken: string;
  signature: string;
  url: string;
  params: Record<string, string>;
}): boolean {
  const { authToken, signature, url, params } = input;
  const data = Object.keys(params)
    .sort()
    .map((k) => `${k}${params[k] ?? ""}`)
    .join("");
  const expected = createHmac("sha1", authToken).update(url + data).digest("base64");
  const a = Buffer.from(expected);
  const b = Buffer.from(signature);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}
