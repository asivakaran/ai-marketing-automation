import { getSession } from "@/lib/session";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ReviewActions } from "@/components/dashboard/review-actions";
import { Star } from "lucide-react";
import { timeAgo } from "@/lib/utils";

function Stars({ rating }: { rating: number }) {
  return (
    <span className="flex items-center gap-0.5" aria-label={`${rating} out of 5`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Star
          key={n}
          className={`h-3.5 w-3.5 ${n <= rating ? "fill-amber-400 text-amber-400" : "text-slate-300"}`}
          aria-hidden
        />
      ))}
    </span>
  );
}

export default async function ReviewsPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  const reviews = await db.review.findMany({
    where: { tenantId: session.tenantId },
    orderBy: { reviewedAt: "desc" },
  });

  const avg = reviews.length ? (reviews.reduce((a, r) => a + r.rating, 0) / reviews.length).toFixed(1) : "—";

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Reviews</h1>
          <p className="text-sm text-muted-foreground">{reviews.length} reviews · {avg} average</p>
        </div>
        <Badge tone="slate">Connect Google Business Profile to publish responses automatically (roadmap)</Badge>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        {reviews.map((r) => (
          <Card key={r.id}>
            <CardContent className="p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold">{r.authorName}</p>
                  <div className="mt-1 flex items-center gap-2">
                    <Stars rating={r.rating} />
                    <span className="text-xs text-muted-foreground">
                      {r.platform === "GOOGLE" ? "Google" : "Facebook"} · {timeAgo(r.reviewedAt)}
                    </span>
                  </div>
                </div>
                <Badge
                  tone={r.status === "RESPONDED" ? "green" : r.status === "DRAFTED" ? "amber" : "neutral"}
                >
                  {r.status.toLowerCase()}
                </Badge>
              </div>

              <p className="mt-3 text-sm leading-relaxed text-foreground/90">{r.content}</p>

              {r.response && (
                <div className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50/60 p-3 text-sm">
                  <p className="text-xs font-medium text-emerald-800">Published response</p>
                  <p className="mt-1 text-foreground/90">{r.response}</p>
                </div>
              )}

              {!r.response && <ReviewActions reviewId={r.id} draft={r.draftResponse} />}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
