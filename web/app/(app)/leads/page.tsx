import { getSession } from "@/lib/session";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { timeAgo, money, formatPhone } from "@/lib/utils";
import { apiUrl } from "@/lib/client";
import Link from "next/link";
import type { LeadStatus, LeadUrgency } from "@prisma/client";

const STATUS_TONE: Record<LeadStatus, "neutral" | "green" | "amber" | "red" | "teal" | "slate"> = {
  NEW: "teal",
  CONTACTED: "neutral",
  QUALIFIED: "neutral",
  BOOKED: "amber",
  CLOSED_WON: "green",
  CLOSED_LOST: "red",
  ARCHIVED: "slate",
};

const URGENCY_TONE: Record<LeadUrgency, "red" | "amber" | "neutral"> = {
  EMERGENCY: "red",
  HIGH: "amber",
  NORMAL: "neutral",
};

export default async function LeadsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; q?: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/login");
  const tenantId = session.tenantId;
  const params = await searchParams;

  const status = params.status as LeadStatus | undefined;
  const q = params.q?.trim();

  const leads = await db.lead.findMany({
    where: {
      tenantId,
      ...(status ? { status } : {}),
      ...(q
        ? {
            OR: [
              { name: { contains: q } },
              { postcode: { contains: q } },
              { serviceNeeded: { contains: q } },
            ],
          }
        : {}),
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  const statuses: LeadStatus[] = ["NEW", "CONTACTED", "QUALIFIED", "BOOKED", "CLOSED_WON", "CLOSED_LOST"];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Leads</h1>
          <p className="text-sm text-muted-foreground">{leads.length} shown · newest first</p>
        </div>
        <form className="flex gap-2" action="/leads">
          <input
            type="search"
            name="q"
            defaultValue={q ?? ""}
            placeholder="Search name, postcode, service…"
            className="h-9 w-56 rounded-lg border border-border bg-white px-3 text-sm"
          />
          {status && <input type="hidden" name="status" value={status} />}
          <button className="h-9 rounded-lg bg-slate-900 px-3 text-sm font-medium text-white" type="submit">
            Search
          </button>
        </form>
      </div>

      <div className="flex flex-wrap gap-2">
        <Link
          href={apiUrl("/leads")}
          className={`rounded-full px-3 py-1.5 text-xs font-medium ${!status ? "bg-slate-900 text-white" : "bg-white border border-border"}`}
        >
          All
        </Link>
        {statuses.map((s) => (
          <Link
            key={s}
            href={apiUrl(`/leads?status=${s}`)}
            className={`rounded-full px-3 py-1.5 text-xs font-medium ${status === s ? "bg-slate-900 text-white" : "bg-white border border-border"}`}
          >
            {s.replace("_", " ").toLowerCase()}
          </Link>
        ))}
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[820px] text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <th className="px-4 py-3 font-medium">Lead</th>
                  <th className="px-4 py-3 font-medium">Service</th>
                  <th className="px-4 py-3 font-medium">Source</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Urgency</th>
                  <th className="px-4 py-3 font-medium">Value</th>
                  <th className="px-4 py-3 font-medium">Last activity</th>
                </tr>
              </thead>
              <tbody>
                {leads.map((lead) => (
                  <tr key={lead.id} className="border-b border-border/60 last:border-0 hover:bg-muted/40">
                    <td className="px-4 py-3">
                      <p className="font-medium">{lead.name ?? "Anonymous"}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatPhone(lead.phone)} · {lead.postcode ?? "—"}
                      </p>
                    </td>
                    <td className="px-4 py-3">{lead.serviceNeeded ?? "—"}</td>
                    <td className="px-4 py-3 text-xs">{lead.source.replace("_", " ").toLowerCase()}</td>
                    <td className="px-4 py-3">
                      <Badge tone={STATUS_TONE[lead.status]}>{lead.status.replace("_", " ").toLowerCase()}</Badge>
                    </td>
                    <td className="px-4 py-3">
                      {lead.urgency !== "NORMAL" ? (
                        <Badge tone={URGENCY_TONE[lead.urgency]}>{lead.urgency.toLowerCase()}</Badge>
                      ) : (
                        <span className="text-xs text-muted-foreground">normal</span>
                      )}
                    </td>
                    <td className="px-4 py-3 tabular-nums">{money(lead.value)}</td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">
                      {lead.lastMessageAt ? timeAgo(lead.lastMessageAt) : timeAgo(lead.createdAt)}
                    </td>
                  </tr>
                ))}
                {leads.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-4 py-10 text-center text-sm text-muted-foreground">
                      No leads match this filter.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
