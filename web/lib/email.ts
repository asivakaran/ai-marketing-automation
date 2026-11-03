/**
 * lib/email.ts — lead alert emails via SMTP (nodemailer) with a free mock fallback.
 *
 * - SMTP_* env vars blank -> MOCK MODE: every email is logged to the console.
 *   (zero-cost: the app still works end-to-end for demos and pilots)
 * - SMTP_* present        -> real email through any SMTP account.
 *   Zero-cost production recipe: a Gmail account + an App Password
 *   (Google Account → Security → 2-Step Verification → App passwords).
 *   Gmail SMTP is free, sends to ANY address, and handles pilot volumes
 *   (~500/day) comfortably.
 */
export interface EmailResult {
  success: boolean;
  mock: boolean;
  messageId?: string;
  error?: string;
}

export function isSmtpConfigured(): boolean {
  return Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS && process.env.SMTP_FROM);
}

function transportOptions() {
  const port = Number(process.env.SMTP_PORT || 587);
  // If SMTP_SECURE is unset, infer: 465 = implicit TLS, anything else = STARTTLS.
  const secure = process.env.SMTP_SECURE ? process.env.SMTP_SECURE === "true" : port === 465;
  return {
    host: process.env.SMTP_HOST!,
    port,
    secure,
    auth: { user: process.env.SMTP_USER!, pass: process.env.SMTP_PASS! },
  };
}

export async function sendEmail(params: {
  to: string;
  subject: string;
  text: string;
  html?: string;
  tenantId?: string;
}): Promise<EmailResult> {
  if (!isSmtpConfigured()) {
    console.log(
      `[MOCK EMAIL] to=${params.to}${params.tenantId ? ` (tenant ${params.tenantId})` : ""} :: ${params.subject} :: ${params.text.slice(0, 140).replace(/\n/g, " | ")}`
    );
    return { success: true, mock: true };
  }

  try {
    const nodemailer = await import("nodemailer");
    const transporter = nodemailer.createTransport(transportOptions());
    const info = await transporter.sendMail({
      from: process.env.SMTP_FROM!,
      to: params.to,
      subject: params.subject,
      text: params.text,
      html: params.html ?? params.text,
    });
    return { success: true, mock: false, messageId: info.messageId };
  } catch (err) {
    console.error("[smtp] send failed:", err);
    return { success: false, mock: false, error: err instanceof Error ? err.message : String(err) };
  }
}
