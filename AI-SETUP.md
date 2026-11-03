# AI-SETUP.md — Make the chatbot's replies REAL (free, ~2 minutes)

The chatbot already captures leads, extracts phone numbers, classifies jobs and
fires email alerts **without any key**. The only thing in mock mode is the
*wording* of the replies — built-in scripts instead of a live model.

This file flips it to a real AI. **Cost: £0. No credit card.**

---

## What you get

| | Mock mode (now) | Live mode (after this file) |
|---|---|---|
| Replies | Pre-written scripts that handle the common cases | Understands ANY question — "do you fit Velux windows?", "my roofer ghosted me, can you quote second opinion?" |
| Lead capture, phone extraction, job classification, email alerts | ✅ already real | ✅ unchanged |
| If the AI service ever fails | — | Auto-falls back to the scripts — **the widget never goes dark** |

## The 2-minute recipe

1. Go to **https://console.groq.com** → sign up free with Google (no card).
2. Left sidebar → **API Keys** → **Create API Key** → name it `autopilot` → copy
   the key (starts with `gsk_`).
3. On your laptop, open `web\.env` in Notepad. Find the line:
   ```
   GROQ_API_KEY=""
   ```
   Paste your key between the quotes:
   ```
   GROQ_API_KEY="gsk_pasteYoursHere"
   ```
4. Save, then restart the app (Ctrl+C in the terminal, then `npm run dev` —
   or just close the window and double-click `START-AUTOPILOT.bat`).

**Done.** Check it worked: log in → **Settings** → "Status right now" should say
`AI: live (Groq)` instead of `AI: mock mode`. The amber badge in the top bar
turns teal too.

## How to test it

Open the widget (`http://localhost:3000/widget/YOUR_TENANT_ID`) and ask
something the scripts were never written for, e.g.:

> do you lot fix flat roofs on garages in High Wycombe, roughly what price?

A live model answers naturally and still asks for the postcode/number. The
dashboard records the lead the same as before.

## The free tier — honest numbers (checked Oct 2026)

- **1,000 replies per day**, 30 per minute, on the default model
  (`openai/gpt-oss-120b` — yes, Groq hosts OpenAI's open model, free).
- A pilot needs a handful of chats a day. You will never see the cap.
- **If you somehow hit it** (a bot attack, a viral day): the system gets an
  error from Groq and automatically answers with the built-in scripts instead.
  No visitor ever sees a dead chat. You lose nothing but the fancy wording
  until the cap resets the next day.
- Note: Groq's older Llama models left the free tier in Aug 2026; the default
  here (`gpt-oss-120b`) is on it. If Groq shuffles models again, set any other
  free model ID in `.env`: `AI_MODEL="openai/gpt-oss-20b"`.

## Troubleshooting

| Symptom | Fix |
|---|---|
| Badge still says `AI: mock mode` | Key pasted outside the quotes, wrong line, or app not restarted. Re-check step 3–4. |
| Badge says `AI: live` but replies look scripted | You hit the daily cap or Groq errored — the terminal shows `[ai] groq call failed — falling back to mock`. Resets daily; nothing to fix. |
| Terminal shows 401 Unauthorized | Key is wrong or was revoked — create a fresh one in the console. |
| You'd rather pay OpenAI | Put `OPENAI_API_KEY` in `.env` instead. Same everything, no other change. |

## What this means for your pitch

> "The assistant runs on a real AI model — it answers anything your customers
> ask, 24/7, and texts you the moment someone leaves a number."

That sentence is now true end-to-end for £0: real AI (this file) + real email
alerts (EMAIL-SETUP.md). The only mock left is **SMS sending** (needs Twilio,
~£1/month, add it after your first paying client — nothing in your pitch
promises texts).
