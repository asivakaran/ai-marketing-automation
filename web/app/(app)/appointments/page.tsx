import { getSession } from "@/lib/session";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { timeAgo } from "@/lib/utils";
import type { AppointmentStatus } from "@prisma/client";

const TONE: Record<AppointmentStatus, "teal" | "green" | "red" | "amber" | "neutral"> = {
  SCHEDULED: "teal",
  COMPLETED: "green",
  CANCELLED: "red",
  NO_SHOW: "amber",
};

export default async function AppointmentsPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  const appointments = await db.appointment.findMany({
    where: { tenantId: session.tenantId },
    orderBy: { startsAt: "desc" },
    include: { lead: { select: { name: true, phone: true, postcode: true } } },
  });

  const now = new Date();
  const upcoming = appointments.filter((a) => a.status === "SCHEDULED" && a.startsAt >= now).reverse();
  const past = appointments.filter((a) => !(a.status === "SCHEDULED" && a.startsAt >= now));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Appointments</h1>
        <p className="text-sm text-muted-foreground">{upcoming.length} upcoming · {past.length} in the history</p>
      </div>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Upcoming</h2>
        {upcoming.length === 0 && (
          <p className="rounded-xl border border-dashed border-border p-6 text-sm text-muted-foreground">
            Nothing scheduled.
          </p>
        )}
        {upcoming.map((a) => (
          <Card key={a.id}>
            <CardContent className="flex flex-wrap items-center justify-between gap-3 p-5">
              <div className="min-w-0">
                <p className="font-medium">{a.title ?? "Appointment"}</p>
                <p className="text-sm text-muted-foreground">
                  {a.lead?.name ?? "Anonymous"} · {a.lead?.phone ?? "—"} · {a.lead?.postcode ?? "—"}
                </p>
                {a.notes && <p className="mt-1 text-xs text-amber-700">📋 {a.notes}</p>}
              </div>
              <div className="text-right">
                <p className="text-sm font-semibold tabular-nums">
                  {a.startsAt.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" })}
                </p>
                <p className="text-sm tabular-nums text-muted-foreground">
                  {a.startsAt.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })} –{" "}
                  {a.endsAt.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}
                </p>
                <div className="mt-1 flex justify-end">
                  <Badge tone={TONE[a.status]}>{a.status.toLowerCase()}</Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">History</h2>
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
                    <th className="px-4 py-3 font-medium">When</th>
                    <th className="px-4 py-3 font-medium">Job</th>
                    <th className="px-4 py-3 font-medium">Lead</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {past.map((a) => (
                    <tr key={a.id} className="border-b border-border/60 last:border-0">
                      <td className="px-4 py-3 text-xs text-muted-foreground">{timeAgo(a.startsAt)}</td>
                      <td className="px-4 py-3">{a.title ?? "Appointment"}</td>
                      <td className="px-4 py-3">{a.lead?.name ?? "—"}</td>
                      <td className="px-4 py-3">
                        <Badge tone={TONE[a.status]}>{a.status.toLowerCase().replace("_", " ")}</Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
