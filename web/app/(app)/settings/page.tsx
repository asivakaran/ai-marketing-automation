import { getSession } from "@/lib/session";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { aiProvider, isMockMode } from "@/lib/ai";
import { isTwilioConfigured } from "@/lib/twilio";
import { isSmtpConfigured } from "@/lib/email";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { TwilioAlertForm, EmailAlertForm, AvgJobValueForm } from "@/components/dashboard/settings-forms";
import type { AlertLog, Subscription } from "@prisma/client";

const REASON_LABEL: Record<string, string> = {
  NEW_LEAD: "New lead",
  URGENT: "Urgent",
  READY_TO_BOOK: "Ready to book",
  TEST: "Test",
};

function statusTone(status: string): "green" | "amber" | "red" | "neutral" {
  if (status === "SENT") return "green";
  if (status === "MOCK") return "amber";
  if (status === "FAILED") return "red";
  return "neutral";
}

export default async function SettingsPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  const tenant = await db.tenant.findUniqueOrThrow({
    where: { id: session.tenantId },
    include: { integrations: true, subscription: true },
  });

  const subscription: Subscription | null = tenant.subscription[0] ?? null;

  const twilio = tenant.integrations.find((i) => i.provider === "TWILIO");
  const twilioMeta = (twilio?.metadata ?? null) as Record<string, unknown> | null;
  const alertPhone = typeof twilioMeta?.alertPhone === "string" ? twilioMeta.alertPhone : "";

  const smtp = tenant.integrations.find((i) => i.provider === "SMTP");
  const smtpMeta = (smtp?.metadata ?? null) as Record<string, unknown> | null;
  const alertEmail = typeof smtpMeta?.alertEmail === "string" ? smtpMeta.alertEmail : "";

  const alerts: AlertLog[] = await db.alertLog.findMany({
    where: { tenantId: tenant.id },
    orderBy: { createdAt: "desc" },
    take: 10,
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
        <p className="text-sm text-muted-foreground">Integrations, alerts and the website widget</p>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Lead alerts (Twilio SMS)</CardTitle>
            <CardDescription>
              The moment the AI captures a phone number — or flags an emergency — this phone gets a text within seconds.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <TwilioAlertForm initialPhone={alertPhone} liveTwilio={isTwilioConfigured()} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Lead alerts (email — free)</CardTitle>
            <CardDescription>
              Same alerts by email, sent the second someone leaves their number. Works at zero cost with any Gmail account + App Password — the recommended channel while you're starting out.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <EmailAlertForm initialEmail={alertEmail} liveSmtp={isSmtpConfigured()} />
          </CardContent>
        </Card>

        <Card className="xl:col-span-2">
          <CardHeader>
            <CardTitle>Alert history — what actually went out</CardTitle>
            <CardDescription>
              Every lead alert this system attempted, and its real outcome. Nothing is hidden: if it says Mock, nothing was sent.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!isSmtpConfigured() && (
              <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
                <p className="font-medium">Email alerts are in mock mode right now.</p>
                <p className="mt-1">
                  They're logged below and on the server console — but nothing is actually sent. Make them real in about
                  5 minutes, free: follow <b>EMAIL-SETUP.md</b> (a Gmail account + App Password), then press "Send test
                  email" above and watch this list flip to <b>Sent</b>.
                </p>
              </div>
            )}
            {alerts.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No alerts yet — one appears here the moment a website visitor leaves their name or number.
              </p>
            ) : (
              <div className="max-h-72 overflow-y-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
                      <th className="pb-2 pr-3 font-medium">When</th>
                      <th className="pb-2 pr-3 font-medium">Channel</th>
                      <th className="pb-2 pr-3 font-medium">Reason</th>
                      <th className="pb-2 pr-3 font-medium">Status</th>
                      <th className="pb-2 font-medium">Sent to</th>
                    </tr>
                  </thead>
                  <tbody>
                    {alerts.map((a) => (
                      <tr key={a.id} className="border-b border-border/50 last:border-0">
                        <td className="py-2 pr-3 whitespace-nowrap text-muted-foreground">
                          {a.createdAt.toLocaleString("en-GB", {
                            day: "numeric",
                            month: "short",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </td>
                        <td className="py-2 pr-3">
                          <Badge tone={a.channel === "EMAIL" ? "teal" : "slate"}>{a.channel === "EMAIL" ? "Email" : "SMS"}</Badge>
                        </td>
                        <td className="py-2 pr-3">{REASON_LABEL[a.reason] ?? a.reason}</td>
                        <td className="py-2 pr-3">
                          <Badge tone={statusTone(a.status)}>{a.status.charAt(0) + a.status.slice(1).toLowerCase()}</Badge>
                          {a.error && <p className="mt-0.5 text-xs text-red-600">{a.error}</p>}
                        </td>
                        <td className="py-2 text-muted-foreground">{a.toAddress}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Average job value</CardTitle>
            <CardDescription>
              Powers the "estimated pipeline" figure on your Overview — booked jobs × this value. Make it match what you actually invoice.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <AvgJobValueForm initialValue={tenant.avgJobValue} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Website chat widget</CardTitle>
            <CardDescription>
              Paste this on any website — the floating chat button appears bottom-right and captures leads 24/7.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="rounded-lg bg-slate-900 p-3">
              <code className="block break-all text-xs text-teal-300">
                {`<script src="${process.env.NEXT_PUBLIC_APP_URL ?? "https://your-app.vercel.app"}/widget.js" data-tenant="${tenant.id}"></script>`}
              </code>
            </div>
            <p className="text-xs text-muted-foreground">
              Options: <code className="rounded bg-muted px-1">data-auto-open="false"</code> disables the
              30-second auto-open. Works on any site (WordPress, Wix, hand-coded HTML).
            </p>
            <div className="rounded-lg border border-border p-3 text-sm">
              <p className="font-medium">Status right now</p>
              <div className="mt-2 flex flex-wrap gap-2">
                <Badge tone={isMockMode() ? "amber" : "teal"}>
                  {isMockMode() ? "AI: mock mode" : `AI: live (${aiProvider() === "groq" ? "Groq" : "OpenAI"})`}
                </Badge>
                <Badge tone={isTwilioConfigured() ? "teal" : "amber"}>
                  {isTwilioConfigured() ? "SMS: live (Twilio)" : "SMS: mock mode"}
                </Badge>
                <Badge tone={isSmtpConfigured() ? "teal" : "amber"}>
                  {isSmtpConfigured() ? "Email: live (SMTP)" : "Email: mock mode"}
                </Badge>
                <Badge tone="slate">Widget URL: /widget/{tenant.id}</Badge>
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                Mock modes are free and safe for demos. AI goes live for FREE with a Groq key (<code className="rounded bg-muted px-1">GROQ_API_KEY</code> — see AI-SETUP.md). Email goes live for free with SMTP settings (Gmail App Password — EMAIL-SETUP.md). Only SMS costs money (~£1/mo, Twilio), and only after your first sale.
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Integrations</CardTitle>
            <CardDescription>Everything wired through one Integration table</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="divide-y divide-border text-sm">
              {tenant.integrations.map((i) => (
                <div key={i.id} className="flex items-center justify-between py-2.5 first:pt-0 last:pb-0">
                  <span className="font-medium">{i.provider}</span>
                  <Badge tone={i.status === "CONNECTED" ? "green" : "neutral"}>{i.status.toLowerCase()}</Badge>
                </div>
              ))}
            </div>
            <p className="mt-3 text-xs text-muted-foreground">
              Google (Calendar + Business Profile), Meta, GHL and SendGrid land with Features 3–8 on the roadmap.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Subscription</CardTitle>
            <CardDescription>Billed via Stripe</CardDescription>
          </CardHeader>
          <CardContent className="text-sm">
            {subscription ? (
              <div className="space-y-1.5">
                <p>
                  Plan: <span className="font-semibold">{subscription.plan}</span>{" "}
                  <Badge tone={subscription.status === "ACTIVE" ? "green" : "amber"}>
                    {subscription.status.toLowerCase()}
                  </Badge>
                </p>
                <p className="text-muted-foreground">
                  £{subscription.monthlyPrice}/mo · setup fee £{subscription.setupFeeAmount}{" "}
                  {subscription.setupFeePaid ? "(paid)" : "(unpaid)"}
                </p>
                {subscription.currentPeriodEnd && (
                  <p className="text-muted-foreground">
                    Renews {subscription.currentPeriodEnd.toLocaleDateString("en-GB", { day: "numeric", month: "long" })}
                  </p>
                )}
              </div>
            ) : (
              <p className="text-muted-foreground">No subscription on file.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
