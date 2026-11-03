"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { apiUrl } from "@/lib/client";
import { initials } from "@/lib/utils";

interface StoredMessage {
  role: "USER" | "ASSISTANT";
  content: string;
}

interface ChatApiResponse {
  conversationId: string;
  leadId: string | null;
  reply: string;
  intents: { emergency_detected: boolean; ready_to_book: boolean };
}

const GREETING = "Hi! Got a question about roofing? I can help.";

export function WidgetChat({
  tenantId,
  tenantName,
  brandColor,
  logoUrl,
}: {
  tenantId: string;
  tenantName: string;
  brandColor: string;
  logoUrl: string | null;
}) {
  const storageKey = `autopilot_widget_${tenantId}`;
  const [messages, setMessages] = useState<StoredMessage[]>([]);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const [embedded, setEmbedded] = useState(false); // set after mount — must match server on first render
  const bottomRef = useRef<HTMLDivElement>(null);

  // Detect iframe embedding AFTER hydration (checking during render causes a
  // server/client mismatch: server says "not embedded", browser says "embedded").
  useEffect(() => {
    setEmbedded(window.parent !== window);
  }, []);

  // ---- hydrate from localStorage on first open ----
  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) {
        const parsed = JSON.parse(raw) as { conversationId?: string; messages?: StoredMessage[] };
        if (parsed.messages?.length) {
          setMessages(parsed.messages.slice(-50));
          setConversationId(parsed.conversationId ?? null);
        }
      }
    } catch {
      /* corrupted storage — start fresh */
    }
    setHydrated(true);
  }, [storageKey]);

  // ---- auto-greet when there's no history ----
  useEffect(() => {
    if (hydrated && messages.length === 0) {
      setMessages([{ role: "ASSISTANT", content: GREETING }]);
    }
  }, [hydrated, messages.length]);

  // ---- persist on change ----
  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(
        storageKey,
        JSON.stringify({ conversationId, messages: messages.slice(-50), savedAt: Date.now() })
      );
    } catch {
      /* storage full/blocked — chat still works, just no history */
    }
  }, [messages, conversationId, hydrated, storageKey]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, sending]);

  const send = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || sending) return;
      setInput("");
      setSending(true);
      setMessages((m) => [...m, { role: "USER", content: trimmed }]);

      try {
        const res = await fetch(apiUrl("/api/chat"), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ tenantId, message: trimmed, conversationId: conversationId ?? undefined, channel: "WEBSITE" }),
        });
        const json = (await res.json()) as
          | { success: true; data: ChatApiResponse }
          | { success: false; error: { message: string } };

        if (json.success) {
          setConversationId(json.data.conversationId);
          setMessages((m) => [...m, { role: "ASSISTANT", content: json.data.reply }]);
        } else {
          setMessages((m) => [
            ...m,
            { role: "ASSISTANT", content: "Sorry — something went wrong on our side. Please try again." },
          ]);
        }
      } catch {
        setMessages((m) => [
          ...m,
          { role: "ASSISTANT", content: "I can't reach the office right now — please try again in a moment." },
        ]);
      }
      setSending(false);
    },
    [sending, tenantId, conversationId]
  );

  function close() {
    try {
      window.parent?.postMessage({ type: "autopilot-widget-close" }, "*");
    } catch {
      /* not embedded */
    }
  }

  // Start a fresh conversation: wipe local history + forget the server-side thread.
  function resetChat() {
    try {
      localStorage.removeItem(storageKey);
    } catch {
      /* storage blocked — still reset in-memory */
    }
    setConversationId(null);
    setMessages([]); // the auto-greet effect re-adds the greeting
  }

  return (
    <div className="flex h-[100dvh] flex-col bg-white" style={{ colorScheme: "light" }}>
      {/* header */}
      <header className="flex items-center justify-between gap-2 px-4 py-3" style={{ backgroundColor: brandColor }}>
        <div className="flex min-w-0 items-center gap-2.5">
          {logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={logoUrl} alt={tenantName} className="h-8 w-8 rounded-lg object-cover" />
          ) : (
            <span
              className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/20 text-xs font-bold text-white"
              aria-hidden
            >
              {initials(tenantName)}
            </span>
          )}
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold leading-tight text-white">{tenantName}</p>
            <p className="text-[11px] leading-tight text-white/70">Typically replies in seconds</p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <button
            onClick={resetChat}
            aria-label="Start new chat"
            title="Start new chat"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-white/80 transition-colors hover:bg-white/10 hover:text-white"
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
              <path d="M3 12a9 9 0 1 0 2.64-6.36L3 8" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M3 3v5h5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          {embedded && (
            <button
              onClick={close}
              aria-label="Close chat"
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-white/80 transition-colors hover:bg-white/10 hover:text-white"
            >
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
              </svg>
            </button>
          )}
        </div>
      </header>

      {/* messages */}
      <div className="flex-1 space-y-2.5 overflow-y-auto bg-slate-50 px-3.5 py-4">
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === "USER" ? "justify-end" : "justify-start"}`}>
            <div
              className={`max-w-[82%] rounded-2xl px-3.5 py-2 text-[13.5px] leading-relaxed ${
                m.role === "USER"
                  ? "rounded-br-md text-white"
                  : "rounded-bl-md border border-slate-200 bg-white text-slate-800"
              }`}
              style={m.role === "USER" ? { backgroundColor: brandColor } : undefined}
            >
              {m.content}
            </div>
          </div>
        ))}

        {sending && (
          <div className="flex justify-start">
            <div className="flex items-center gap-1.5 rounded-2xl rounded-bl-md border border-slate-200 bg-white px-4 py-3">
              <span className="typing-dot h-1.5 w-1.5 rounded-full bg-slate-400" />
              <span className="typing-dot h-1.5 w-1.5 rounded-full bg-slate-400" />
              <span className="typing-dot h-1.5 w-1.5 rounded-full bg-slate-400" />
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* input */}
      <form
        className="flex items-center gap-2 border-t border-slate-200 bg-white p-3"
        onSubmit={(e) => {
          e.preventDefault();
          void send(input);
        }}
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Type your message…"
          className="h-11 flex-1 rounded-xl border border-slate-300 px-3.5 text-[14px] placeholder:text-slate-400 focus-visible:outline-2 focus-visible:outline-offset-1"
          style={{ outlineColor: brandColor }}
          disabled={sending}
          aria-label="Message"
        />
        <button
          type="submit"
          disabled={sending || !input.trim()}
          aria-label="Send message"
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-white transition-opacity disabled:opacity-40"
          style={{ backgroundColor: brandColor }}
        >
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
            <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </form>
    </div>
  );
}
