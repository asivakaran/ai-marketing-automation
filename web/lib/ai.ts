/**
 * lib/ai.ts — single dispatch point for all AI chat.
 *
 * - No key               -> MOCK MODE (deterministic, believable, free).
 * - GROQ_API_KEY set     -> calls Groq (FREE — console.groq.com, no card).
 *                          OpenAI-compatible endpoint, model openai/gpt-oss-120b.
 * - OPENAI_API_KEY set   -> calls OpenAI gpt-4o-mini (paid alternative).
 * All three return the SAME shape. Any provider error falls back to mock
 * so the widget NEVER goes dark — worst case it answers with built-in scripts.
 *
 * Optional .env overrides: AI_MODEL, AI_BASE_URL (any OpenAI-compatible API).
 * Setup recipe: AI-SETUP.md (2 minutes, free).
 */
import { buildChatbotSystemPrompt } from "@/prompts/chatbot-system";

export interface ChatIntents {
  emergency_detected: boolean;
  ready_to_book: boolean;
}

export interface ExtractedLeadFields {
  name?: string;
  phone?: string;
  service_needed?: string;
  postcode?: string;
}

export interface ChatResult {
  reply: string;
  intents: ChatIntents;
  extracted: ExtractedLeadFields;
}

export interface ChatTurn {
  role: "USER" | "ASSISTANT";
  content: string;
}

export interface ChatContext {
  tenant: { id: string; name: string };
  history: ChatTurn[];
  message: string;
}

export type AiProvider = "mock" | "groq" | "openai";

export function aiProvider(): AiProvider {
  if (process.env.GROQ_API_KEY && process.env.GROQ_API_KEY.trim() !== "") return "groq";
  if (process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY.trim() !== "") return "openai";
  return "mock";
}

export function isMockMode(): boolean {
  return aiProvider() === "mock";
}

export async function generateChatResponse(ctx: ChatContext): Promise<ChatResult> {
  const provider = aiProvider();
  if (provider === "mock") return mockGenerate(ctx);
  try {
    return await llmGenerate(ctx, provider);
  } catch (err) {
    console.warn(`[ai] ${provider} call failed — falling back to mock. Error:`, err);
    return mockGenerate(ctx);
  }
}

// ---------------------------------------------------------- LLM (Groq / OpenAI)
// Both providers speak the same OpenAI-compatible chat API, so one code path
// serves both. Groq free tier: 1,000 chats/day per model — far beyond pilot volume.

const PROVIDER_DEFAULTS: Record<"groq" | "openai", { baseUrl: string; model: string }> = {
  groq: { baseUrl: "https://api.groq.com/openai/v1", model: "openai/gpt-oss-120b" },
  openai: { baseUrl: "https://api.openai.com/v1", model: "gpt-4o-mini" },
};

/** Extract a JSON object from an LLM reply even if it arrives wrapped in
 *  markdown fences or with stray text around it. Returns null if not found. */
function extractJson(raw: string): Record<string, unknown> | null {
  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = (fenced ? fenced[1] : raw).trim();
  const start = candidate.indexOf("{");
  const end = candidate.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) return null;
  try {
    return JSON.parse(candidate.slice(start, end + 1)) as Record<string, unknown>;
  } catch {
    return null;
  }
}

async function llmGenerate(ctx: ChatContext, provider: "groq" | "openai"): Promise<ChatResult> {
  const { default: OpenAI } = await import("openai");
  const defaults = PROVIDER_DEFAULTS[provider];
  const client = new OpenAI({
    apiKey: provider === "groq" ? process.env.GROQ_API_KEY : process.env.OPENAI_API_KEY,
    baseURL: process.env.AI_BASE_URL?.trim() || defaults.baseUrl,
  });
  const model = process.env.AI_MODEL?.trim() || defaults.model;
  const messages: Array<{ role: "system" | "user" | "assistant"; content: string }> = [
    { role: "system", content: buildChatbotSystemPrompt(ctx.tenant.name) },
    ...ctx.history.slice(-10).map((t) => ({
      role: (t.role === "USER" ? "user" : "assistant") as "user" | "assistant",
      content: t.content,
    })),
    { role: "user", content: ctx.message },
  ];

  const request = (jsonMode: boolean) =>
    client.chat.completions.create({
      model,
      temperature: 0.7,
      messages: jsonMode
        ? messages
        : [...messages, { role: "system", content: "Respond with ONLY a valid JSON object — no other text." }],
      ...(jsonMode ? { response_format: { type: "json_object" as const } } : {}),
    });

  let raw = "";
  try {
    const completion = await request(true);
    raw = completion.choices[0]?.message?.content ?? "";
  } catch (err) {
    // Some models reject response_format — retry once in plain mode.
    if (!String(err).toLowerCase().includes("response_format")) throw err;
    console.warn(`[ai] ${model} rejected json mode — retrying plain`);
    const completion = await request(false);
    raw = completion.choices[0]?.message?.content ?? "";
  }

  const parsed = extractJson(raw) as null | {
    reply?: unknown;
    emergency_detected?: unknown;
    ready_to_book?: unknown;
    extracted?: {
      name?: unknown;
      phone?: unknown;
      service_needed?: unknown;
      postcode?: unknown;
    };
  };

  if (!parsed || typeof parsed.reply !== "string" || !parsed.reply.trim()) {
    throw new Error(`${provider} returned no usable reply`);
  }

  return {
    reply: parsed.reply.trim(),
    intents: {
      emergency_detected: parsed.emergency_detected === true,
      ready_to_book: parsed.ready_to_book === true,
    },
    extracted: {
      name: typeof parsed.extracted?.name === "string" ? parsed.extracted.name : undefined,
      phone: typeof parsed.extracted?.phone === "string" ? parsed.extracted.phone : undefined,
      service_needed:
        typeof parsed.extracted?.service_needed === "string" ? parsed.extracted.service_needed : undefined,
      postcode: typeof parsed.extracted?.postcode === "string" ? parsed.extracted.postcode : undefined,
    },
  };
}

// ---------------------------------------------------------------- Mock

const SERVICE_KEYWORDS: Array<[RegExp, string]> = [
  [/leak|damp|water stain|ceiling/i, "Roof leak"],
  [/gutter/i, "Guttering"],
  [/flat roof/i, "Flat roof"],
  [/chimney/i, "Chimney"],
  [/fascia|soffit/i, "Fascia & soffits"],
  [/loft|insulat/i, "Loft insulation"],
  [/tile|slate|missing/i, "Missing tiles"],
  [/moss/i, "Moss removal"],
  [/pointing|repoint/i, "Repointing"],
  [/storm|wind damage/i, "Storm damage"],
  [/roof/i, "Roof"],
];

const EMERGENCY_RE =
  /(pouring|pouring in|emergency|urgent|can'?t wait|flood|water(?:'?s| is)? coming (in|through)|soaking|bucket|right now|asap|tonight)/i;
const BOOKING_RE =
  /(book|quote|survey|appointment|come (round|out|over)|available|how much|price|cost|estimate|tomorrow|this week|next week|fit me in)/i;
const GREETING_RE = /^(hi|hey|hello|yo|hiya|good (morning|afternoon|evening))\b/i;
const THANKS_RE = /(thanks|thank you|cheers|ta)\b/i;

// Words that are never a name. Catches "I'm in HP13" -> "In Hp" misfires and
// "I'm Dave in High Wycombe" trailing-preposition captures.
const NAME_STOPWORDS = new Set([
  "a", "an", "the", "not", "just", "wondering", "looking", "after", "interested",
  "in", "at", "on", "from", "near", "based", "sorry", "hoping", "trying",
  "having", "getting", "happy", "available", "here", "back", "going", "asking",
  "emailing", "calling", "messaging", "chasing", "wanting", "needing", "seeing",
  "writing", "texting", "phoning", "reaching", "urgent", "ready", "new",
  // connectors that follow a first name: "I'm Dave and my number is..."
  "and", "but", "or", "so", "then", "if", "when", "while", "because", "cos",
  "plus", "also", "my", "me", "you", "we", "its", "it's", "ive", "i've",
]);

function extractName(text: string): string | undefined {
  const m =
    text.match(/(?:my name is|i'?m|i am|this is|it'?s|name'?s)\s+([a-z][a-z'-]{1,20}(?:\s+[a-z][a-z'-]{1,20})?)/i) ??
    text.match(/^([A-Z][a-z'-]{1,20})\s+(?:here|speaking)/);
  if (!m || !m[1]) return undefined;
  const words = m[1].toLowerCase().split(/\s+/);
  // "I'm Dave in High Wycombe" -> capture "Dave in" -> drop trailing stopword -> "Dave"
  while (words.length > 1 && NAME_STOPWORDS.has(words[words.length - 1]!)) words.pop();
  // "I'm in HP13" -> first word "in" -> not a name at all
  if (!words.length || NAME_STOPWORDS.has(words[0]!)) return undefined;
  return words
    .map((w) => w[0]!.toUpperCase() + w.slice(1))
    .join(" ");
}

function extractPhone(text: string): string | undefined {
  const m = text.match(/(\+?\s?44\s?7\d{3}[\s-]?\d{6})|(07\d{3}[\s-]?\d{6})/);
  if (!m || !m[0]) return undefined;
  return normalizeUK(m[0]);
}

export function normalizeUK(input: string): string {
  let s = input.replace(/[\s()-]/g, "");
  if (s.startsWith("+44")) return s;
  if (s.startsWith("44")) return `+${s}`;
  if (s.startsWith("07")) return `+44${s.slice(1)}`;
  return s;
}

function isFullPostcode(p?: string): boolean {
  return !!p && /\d[A-Z]{2}$/.test(p);
}

function extractPostcode(text: string): string | undefined {
  // Full "HP13 7XZ" always wins when present.
  const full = text.match(/\b([A-Z]{1,2}\d[A-Z\d]?\s*\d[A-Z]{2})\b/i);
  if (full?.[1]) return full[1].toUpperCase().replace(/\s+/, " ");
  // Fall back to the outward half alone ("I'm in HP13" -> "HP13") so the
  // assistant never re-asks for a location the customer already gave.
  const out = text.match(/\b([A-Z]{1,2}\d{1,2}[A-Z]?)\b(?![a-z0-9])/i);
  if (out?.[1]) return out[1].toUpperCase();
  return undefined;
}

function extractService(text: string): string | undefined {
  for (const [re, label] of SERVICE_KEYWORDS) {
    if (re.test(text)) return label;
  }
  return undefined;
}

function pick<T>(options: T[], seed: string): T {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) % 9973;
  return options[h % options.length]!;
}

function mockGenerate(ctx: ChatContext): ChatResult {
  const all = [...ctx.history.map((t) => t.content), ctx.message].join(" \n ");
  const msg = ctx.message;
  const lower = msg.toLowerCase();

  const extracted: ExtractedLeadFields = {
    name: extractName(all),
    phone: extractPhone(all),
    postcode: extractPostcode(all),
    service_needed: extractService(all),
  };

  const emergency = EMERGENCY_RE.test(all);
  const booking = BOOKING_RE.test(msg);
  const intents: ChatIntents = { emergency_detected: emergency, ready_to_book: booking };

  const t = ctx.tenant.name;
  let reply: string;

  if (GREETING_RE.test(msg) && msg.length < 30) {
    reply = pick(
      [
        `Hi there! What can ${t} help you with today — a repair, a quote, or a survey?`,
        `Hello! Is it a roof issue, gutters, or something else you need help with?`,
      ],
      msg
    );
  } else if (emergency && !extracted.phone) {
    reply = pick(
      [
        `That needs urgent attention — I'll get someone from ${t} to call you back within the hour. What's the best number to reach you on?`,
        `I've flagged this as urgent. Drop me your number and I'll have a roofer call you back within the hour.`,
      ],
      msg
    );
  } else if (emergency && extracted.phone) {
    const svc = extracted.service_needed ? ` (${extracted.service_needed.toLowerCase()})` : "";
    reply = `Got it — I've marked this as an emergency${svc} and passed your details to ${t}. Someone will call you back within the hour. If water is coming in, put a bucket down and move soft furnishings out of the way if you can.`;
  } else if (/how much|price|cost|quote/i.test(msg)) {
    reply = extracted.postcode
      ? `It depends on the job, but I can arrange a free no-obligation survey at ${extracted.postcode} — Dave can take a look and give you a fixed price. Shall I book you in?`
      : `It depends on the job I'm afraid — but I can arrange a free no-obligation survey and a fixed quote. What's your postcode?`;
  } else if (booking && !extracted.postcode) {
    reply = extracted.phone
      ? `Happy to help — I've got your number. What's your postcode, and does a morning or afternoon suit you better?`
      : pick(
        [
          `Happy to arrange that — a free survey usually takes 20-30 minutes. What's your postcode, and does a morning or afternoon suit you better?`,
          `No problem. Drop me your postcode and a preferred day, and I'll get a slot booked in for you.`,
        ],
        msg
      );
  } else if (booking && extracted.postcode) {
    const p = extracted.postcode;
    reply = isFullPostcode(p)
      ? `Great — how about Thursday morning? Dave can be at ${p} between 9 and 11. Shall I pencil that in?`
      : `Great — ${extracted.phone ? `I've got your number, and ` : ""}we can get someone around the ${p} area. What's the rest of your postcode, and does a morning or afternoon suit better?`;
  } else if (extracted.phone && !extracted.name) {
    reply = `Perfect, I've got ${extracted.phone}. And what's your name, so the surveyor knows who to ask for?`;
  } else if (extracted.name && !extracted.phone) {
    reply = `Nice to meet you, ${extracted.name}. What's the best number to reach you on in case we need to confirm anything?`;
  } else if (extracted.postcode && !extracted.service_needed) {
    reply = `Noted — ${extracted.postcode} is in our area. What's the issue you're having?`;
  } else if (extracted.service_needed && !extracted.phone && !booking) {
    reply = pick(
      [
        `Sorry to hear that — ${extracted.service_needed} is something we deal with every week. Is it urgent, or can it wait for a survey? Either way, what's the best number for you?`,
        `That's a common one, and usually straightforward to sort. What's the best number to reach you on so we can take a few details?`,
      ],
      msg
    );
  } else if (extracted.service_needed && extracted.phone) {
    reply = `Thanks — I've noted ${extracted.service_needed}${extracted.postcode ? ` at ${extracted.postcode}` : ""} and passed your number to ${t}. Someone will be in touch shortly to arrange a look.`;
  } else if (THANKS_RE.test(lower) && msg.length < 40) {
    reply = `Any time! I'm here 24/7 if anything else comes up. 🙂`;
  } else {
    reply = pick(
      [
        `Happy to help with that. To point you in the right direction — is it a repair you need, or are you after a quote for something bigger?`,
        `Could you tell me a bit more about the issue? Then I'll get the right person to call you back.`,
      ],
      msg
    );
  }

  return { reply, intents, extracted };
}
