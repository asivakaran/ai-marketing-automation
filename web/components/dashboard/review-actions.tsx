"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { apiFetch } from "@/lib/client";
import { Sparkles, ThumbsUp } from "lucide-react";

export function ReviewActions({ reviewId, draft }: { reviewId: string; draft: string | null }) {
  const [busy, setBusy] = useState<"draft" | "respond" | null>(null);
  const [text, setText] = useState(draft);
  const [published, setPublished] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function generateDraft() {
    setBusy("draft");
    setError(null);
    const res = await apiFetch<{ draft: string }>("/api/reviews", {
      method: "POST",
      body: JSON.stringify({ action: "generate-draft", reviewId }),
    });
    if (res.success && res.data) setText(res.data.draft);
    else setError(res.error?.message ?? "Could not draft a response.");
    setBusy(null);
  }

  async function respond() {
    if (!text?.trim()) return;
    setBusy("respond");
    setError(null);
    const res = await apiFetch("/api/reviews", {
      method: "POST",
      body: JSON.stringify({ action: "respond", reviewId, response: text }),
    });
    if (res.success) setPublished(true);
    else setError(res.error?.message ?? "Could not publish.");
    setBusy(null);
  }

  if (published) {
    return (
      <div className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50/60 p-3 text-sm">
        <p className="text-xs font-medium text-emerald-800">Response saved</p>
        <p className="mt-1">{text}</p>
      </div>
    );
  }

  return (
    <div className="mt-3 space-y-2">
      {text !== null && text !== undefined ? (
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={3}
          className="w-full rounded-lg border border-border p-2.5 text-sm focus-visible:outline-2 focus-visible:outline-accent"
          placeholder="AI draft response — edit before publishing"
        />
      ) : null}

      <div className="flex flex-wrap gap-2">
        <Button variant="outline" size="sm" onClick={generateDraft} disabled={busy !== null}>
          <Sparkles className="h-3.5 w-3.5" aria-hidden />
          {busy === "draft" ? "Drafting…" : text ? "Redraft with AI" : "Draft a response"}
        </Button>
        {text?.trim() && (
          <Button size="sm" onClick={respond} disabled={busy !== null}>
            <ThumbsUp className="h-3.5 w-3.5" aria-hidden />
            {busy === "respond" ? "Saving…" : "Save response"}
          </Button>
        )}
      </div>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
