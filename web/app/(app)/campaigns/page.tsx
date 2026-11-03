import { getSession } from "@/lib/session";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { timeAgo } from "@/lib/utils";
import type { CampaignStatus } from "@prisma/client";

const TONE: Record<CampaignStatus, "neutral" | "green" | "amber" | "teal" | "red"> = {
  DRAFT: "neutral",
  SCHEDULED: "teal",
  SENDING: "amber",
  SENT: "green",
  PAUSED: "amber",
};

export default async function CampaignsPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  const campaigns = await db.campaign.findMany({
    where: { tenantId: session.tenantId },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Campaigns</h1>
          <p className="text-sm text-muted-foreground">Email & SMS campaigns to your leads</p>
        </div>
        <Badge tone="slate">Real email sending (SendGrid/SES) arrives with Feature 5 on the roadmap</Badge>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        {campaigns.map((c) => {
          const openRate = c.recipientCount ? Math.round((c.openCount / c.recipientCount) * 100) : 0;
          const clickRate = c.recipientCount ? Math.round((c.clickCount / c.recipientCount) * 100) : 0;
          return (
            <Card key={c.id}>
              <CardContent className="p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-semibold">{c.name}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {c.type === "EMAIL" ? "✉️ Email" : "💬 SMS"} ·{" "}
                      {c.sentAt ? `sent ${timeAgo(c.sentAt)}` : c.scheduledAt ? `scheduled ${timeAgo(c.scheduledAt)}` : "not sent"}
                    </p>
                  </div>
                  <Badge tone={TONE[c.status]}>{c.status.toLowerCase()}</Badge>
                </div>

                {(c.subject || c.body) && (
                  <div className="mt-3 rounded-lg bg-muted/70 p-3 text-sm">
                    {c.subject && <p className="font-medium">{c.subject}</p>}
                    {c.body && <p className="mt-1 text-foreground/80">{c.body}</p>}
                  </div>
                )}

                <div className="mt-4 grid grid-cols-3 gap-3 text-center">
                  <div className="rounded-lg border border-border p-2.5">
                    <p className="text-lg font-semibold tabular-nums">{c.recipientCount}</p>
                    <p className="text-xs text-muted-foreground">recipients</p>
                  </div>
                  <div className="rounded-lg border border-border p-2.5">
                    <p className="text-lg font-semibold tabular-nums">{c.type === "SMS" ? "—" : `${openRate}%`}</p>
                    <p className="text-xs text-muted-foreground">open rate</p>
                  </div>
                  <div className="rounded-lg border border-border p-2.5">
                    <p className="text-lg font-semibold tabular-nums">{clickRate}%</p>
                    <p className="text-xs text-muted-foreground">click rate</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
