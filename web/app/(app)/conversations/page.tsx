import { getSession } from "@/lib/session";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { ChatPanel } from "@/components/dashboard/chat-panel";
import { timeAgo } from "@/lib/utils";
import { apiUrl } from "@/lib/client";
import Link from "next/link";
import type { Message, Conversation } from "@prisma/client";

export default async function ConversationsPage({
  searchParams,
}: {
  searchParams: Promise<{ c?: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/login");
  const tenantId = session.tenantId;
  const params = await searchParams;

  const conversations = await db.conversation.findMany({
    where: { tenantId },
    orderBy: { lastMessageAt: "desc" },
    include: { lead: true },
  });

  let selected: (Conversation & { lead: { name: string | null } | null }) | null =
    conversations.find((c) => c.id === params.c) ?? conversations[0] ?? null;

  let initialMessages: Message[] = [];
  let tenantName = session.name ?? "there";
  if (selected) {
    initialMessages = await db.message.findMany({
      where: { conversationId: selected.id },
      orderBy: { sentAt: "asc" },
    });
    const tenant = await db.tenant.findUnique({ where: { id: tenantId }, select: { name: true } });
    tenantName = tenant?.name ?? tenantName;
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Conversations</h1>
        <p className="text-sm text-muted-foreground">
          Reply as the assistant — messages go through the same AI pipeline as the website widget.
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-[320px,1fr]">
        <div className="space-y-2">
          {conversations.map((c) => (
            <Link
              key={c.id}
              href={apiUrl(`/conversations?c=${c.id}`)}
              className={`block rounded-xl border p-3 transition-colors ${
                selected?.id === c.id
                  ? "border-slate-900 bg-white shadow-sm"
                  : "border-border bg-white hover:bg-muted/50"
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <p className="truncate text-sm font-medium">{c.lead?.name ?? "Anonymous visitor"}</p>
                <span className="text-xs text-muted-foreground">{timeAgo(c.lastMessageAt)}</span>
              </div>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {c.channel === "WEBSITE" ? "Website chat" : c.channel === "SMS" ? "SMS" : c.channel} ·{" "}
                {c.lead?.phone ?? c.lead?.postcode ?? "no details yet"}
              </p>
            </Link>
          ))}
          {conversations.length === 0 && (
            <p className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
              No conversations yet. They appear when someone chats on the widget.
            </p>
          )}
        </div>

        {selected ? (
          <ChatPanel
            key={selected.id}
            tenantId={tenantId}
            tenantName={tenantName}
            conversationId={selected.id}
            initialMessages={initialMessages.map((m) => ({
              id: m.id,
              role: m.role === "SYSTEM" ? "ASSISTANT" : m.role,
              content: m.content,
            }))}
            title={selected.lead?.name ?? "Anonymous visitor"}
          />
        ) : (
          <div className="flex items-center justify-center rounded-xl border border-dashed border-border p-10 text-sm text-muted-foreground">
            Select a conversation
          </div>
        )}
      </div>
    </div>
  );
}
