import { getSession } from "@/lib/session";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LeadsBarChart, SourceDonut } from "@/components/dashboard/charts";
import { timeAgo, money } from "@/lib/utils";
import { AlertTriangle, CalendarDays, TrendingUp, Users } from "lucide-react";
import Link from "next/link";
import { apiUrl } from "@/lib/client";

export default async function DashboardPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  const tenantId = session.tenantId;

  const [leads, appointments, reviews, conversations, tenant] = await Promise.all([
    db.lead.findMany({ where: { tenantId }, orderBy: { createdAt: "desc" } }),
    db.appointment.findMany({
      where: { tenantId },
      orderBy: { startsAt: "asc" },
      include: { lead: { select: { name: true } } },
    }),
    db.review.findMany({ where: { tenantId }, orderBy: { reviewedAt: "desc" } }),
    db.conversation.findMany({ where: { tenantId }, orderBy: { lastMessageAt: "desc" }, take: 6, include: { lead: true } }),
    db.tenant.findUniqueOrThrow({ where: { id: tenantId }, select: { avgJobValue: true } }),
  ]);

  const now = new Date();
  const thisMonth = leads.filter((l) => l.createdAt.getMonth() === now.getMonth());
  const won = leads.filter((l) => l.status === "CLOSED_WON");
  const booked = leads.filter((l) => l.status === "BOOKED" || l.status === "CLOSED_WON");
  const convRate = leads.length ? Math.round((booked.length / leads.length) * 100) : 0;
  const avgRating = reviews.length ? (reviews.reduce((a, r) => a + r.rating, 0) / reviews.length).toFixed(1) : "—";
  const revenue = won.reduce((a, l) => a + (l.value ?? 0), 0);

  // last 6 months buckets
  const months: Array<{ label: string; leads: number; won: number }> = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const label = d.toLocaleDateString("en-GB", { month: "short" });
    const inBucket = leads.filter(
      (l) => l.createdAt.getFullYear() === d.getFullYear() && l.createdAt.getMonth() === d.getMonth()
    );
    months.push({
      label,
      leads: inBucket.length,
      won: inBucket.filter((l) => l.status === "CLOSED_WON").length,
    });
  }

  const sourceCounts = new Map<string, number>();
  for (const l of leads) sourceCounts.set(l.source, (sourceCounts.get(l.source) ?? 0) + 1);
  const sources = [...sourceCounts.entries()].map(([source, count]) => ({ source, count }));

  const upcoming = appointments.filter((a) => a.status === "SCHEDULED" && a.startsAt >= now).slice(0, 4);
  const emergencies = leads.filter((l) => l.urgency === "EMERGENCY").length;

  // The money view: booked jobs x average job value (tuned per tenant in Settings).
  const avgJobValue = tenant.avgJobValue;
  const pipelineEstimate = booked.length * avgJobValue;

  const kpis = [
    { label: "Leads this month", value: String(thisMonth.length), sub: `${leads.length} all-time`, icon: Users },
    { label: "Booked jobs", value: String(booked.length), sub: `${convRate}% of all leads`, icon: TrendingUp },
    { label: "Revenue won", value: money(revenue), sub: `${won.length} jobs closed`, icon: TrendingUp },
    { label: "Google rating", value: String(avgRating), sub: `${reviews.length} reviews`, icon: TrendingUp },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Overview</h1>
          <p className="text-sm text-muted-foreground">Last 6 months of activity</p>
        </div>
        {emergencies > 0 && (
          <Badge tone="red" className="gap-1.5">
            <AlertTriangle className="h-3 w-3" aria-hidden /> {emergencies} emergency lead{emergencies > 1 ? "s" : ""} on file
          </Badge>
        )}
      </div>

      {/* Money view — the number a business owner actually buys on */}
      <Card className="overflow-hidden border-slate-800 bg-gradient-to-br from-slate-900 via-slate-900 to-slate-800 text-white">
        <CardContent className="p-6">
          <div className="flex flex-wrap items-end justify-between gap-6">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                Estimated pipeline
              </p>
              <p className="mt-1 text-4xl font-semibold tabular-nums text-teal-300">
                {money(pipelineEstimate)}
              </p>
              <p className="mt-1 text-sm text-slate-400">
                {booked.length} booked job{booked.length === 1 ? "" : "s"} × {money(avgJobValue)} average job value
                <span className="text-slate-500"> · tune it in Settings</span>
              </p>
            </div>
            <div className="grid grid-cols-3 gap-6 text-center">
              <div>
                <p className="text-2xl font-semibold tabular-nums">{leads.length}</p>
                <p className="text-xs text-slate-400">leads captured</p>
              </div>
              <div>
                <p className="text-2xl font-semibold tabular-nums">{convRate}%</p>
                <p className="text-xs text-slate-400">lead → booked</p>
              </div>
              <div>
                <p className="text-2xl font-semibold tabular-nums">{money(revenue)}</p>
                <p className="text-xs text-slate-400">won &amp; invoiced</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        {kpis.map((k) => (
          <Card key={k.label}>
            <CardContent className="p-5">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{k.label}</p>
              <p className="mt-1.5 text-2xl font-semibold tabular-nums">{k.value}</p>
              <p className="mt-1 text-xs text-muted-foreground">{k.sub}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Lead flow</CardTitle>
            <CardDescription>New leads vs jobs won, per month</CardDescription>
          </CardHeader>
          <CardContent>
            <LeadsBarChart data={months} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Leads by source</CardTitle>
            <CardDescription>Where enquiries come from</CardDescription>
          </CardHeader>
          <CardContent>
            <SourceDonut data={sources} />
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Upcoming appointments</CardTitle>
            <CardDescription>Next scheduled visits</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {upcoming.length === 0 && <p className="text-sm text-muted-foreground">Nothing scheduled.</p>}
            {upcoming.map((a) => (
              <div key={a.id} className="flex items-start gap-3">
                <span className="mt-0.5 flex h-8 w-8 items-center justify-center rounded-lg bg-slate-900 text-white">
                  <CalendarDays className="h-4 w-4" aria-hidden />
                </span>
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{a.title ?? "Appointment"}</p>
                  <p className="text-xs text-muted-foreground">
                    {a.lead?.name ?? "Unnamed"} ·{" "}
                    {a.startsAt.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" })}{" "}
                    {a.startsAt.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}
                  </p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Latest conversations</CardTitle>
            <CardDescription>Most recent chats across channels</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {conversations.map((c) => (
              <Link
                key={c.id}
                href={apiUrl(`/conversations?c=${c.id}`)}
                className="flex items-center justify-between gap-3 rounded-lg border border-border p-3 hover:bg-muted/60"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{c.lead?.name ?? "Anonymous visitor"}</p>
                  <p className="text-xs text-muted-foreground">
                    {c.channel === "WEBSITE" ? "Website chat" : c.channel.toLowerCase()} · {timeAgo(c.lastMessageAt)}
                  </p>
                </div>
                <Badge tone={c.status === "OPEN" ? "teal" : "neutral"}>{c.status.toLowerCase()}</Badge>
              </Link>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
