"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { apiFetch } from "@/lib/client";
import { Send } from "lucide-react";

interface ChatMessage {
  id: string;
  role: "USER" | "ASSISTANT";
  content: string;
}

interface ChatResponse {
  conversationId: string;
  leadId: string | null;
  reply: string;
  intents: { emergency_detected: boolean; ready_to_book: boolean };
  mockMode: boolean;
}

export function ChatPanel({
  tenantId,
  tenantName,
  conversationId,
  initialMessages,
  title,
}: {
  tenantId: string;
  tenantName: string;
  conversationId: string;
  initialMessages: ChatMessage[];
  title: string;
}) {
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [hint, setHint] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, sending]);

  async function send() {
    const text = input.trim();
    if (!text || sending) return;
    setInput("");
    setSending(true);
    setMessages((m) => [...m, { id: `local-${Date.now()}`, role: "USER", content: text }]);

    const res = await apiFetch<ChatResponse>("/api/chat", {
      method: "POST",
      body: JSON.stringify({ tenantId, message: text, conversationId }),
    });

    if (res.success && res.data) {
      setMessages((m) => [...m, { id: `a-${Date.now()}`, role: "ASSISTANT", content: res.data!.reply }]);
      if (res.data.intents.emergency_detected) setHint("🚨 flagged emergency — the tenant alert has been sent");
      else if (res.data.intents.ready_to_book) setHint("📌 marked ready to book — the tenant alert has been sent");
      else setHint(null);
    } else {
      setMessages((m) => [
        ...m,
        { id: `e-${Date.now()}`, role: "ASSISTANT", content: "Sorry — something went wrong. Try again." },
      ]);
      setHint(null);
    }
    setSending(false);
  }

  return (
    <div className="flex h-[640px] flex-col overflow-hidden rounded-xl border border-border bg-white">
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <div>
          <p className="text-sm font-semibold">{title}</p>
          <p className="text-xs text-muted-foreground">Replying as the {tenantName} assistant</p>
        </div>
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto p-4">
        {messages.map((m) => (
          <div key={m.id} className={`flex ${m.role === "USER" ? "justify-end" : "justify-start"}`}>
            <div
              className={`max-w-[80%] rounded-2xl px-3.5 py-2 text-sm leading-relaxed ${
                m.role === "USER"
                  ? "rounded-br-md bg-slate-900 text-white"
                  : "rounded-bl-md bg-muted text-foreground"
              }`}
            >
              {m.content}
            </div>
          </div>
        ))}
        {sending && (
          <div className="flex justify-start">
            <div className="flex items-center gap-1.5 rounded-2xl rounded-bl-md bg-muted px-4 py-3">
              <span className="typing-dot h-1.5 w-1.5 rounded-full bg-slate-500" />
              <span className="typing-dot h-1.5 w-1.5 rounded-full bg-slate-500" />
              <span className="typing-dot h-1.5 w-1.5 rounded-full bg-slate-500" />
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {hint && (
        <p className="border-t border-border bg-amber-50/60 px-4 py-2 text-xs text-amber-800">{hint}</p>
      )}

      <form
        className="flex items-center gap-2 border-t border-border p-3"
        onSubmit={(e) => {
          e.preventDefault();
          void send();
        }}
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Type a reply…"
          className="h-10 flex-1 rounded-lg border border-border px-3 text-sm focus-visible:outline-2 focus-visible:outline-accent"
          disabled={sending}
        />
        <Button type="submit" size="icon" disabled={sending || !input.trim()} aria-label="Send">
          <Send className="h-4 w-4" aria-hidden />
        </Button>
      </form>
    </div>
  );
}
