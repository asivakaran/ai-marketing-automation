# Build Roadmap — From Weekend Sprint to £5K System

The weekend sprint (Features 1-4) is DONE. This is the rest of the path, in priority order.
Each feature lists what it unlocks in pricing terms for selling to home services businesses.

## Where you are now (Weekend Sprint — complete)

- ✅ **1. Website Chat Widget** — embeds on any site via one script tag; captures leads 24/7
- ✅ **2. Real AI wiring** — OpenAI gpt-4o-mini when the key is set, deterministic mock mode otherwise
- ✅ **3. SMS lead alerts** — tenant's phone buzzes on hot leads; inbound SMS (STOP/HELP/AI reply)
- ✅ **4. Deployment guide** — Vercel + Neon, ~£0/month to start

**Worth today:** £500–1,500 setup + £150–300/month. A working lead-capture system with real URLs.

## Next features (in priority order)

| # | Feature | Time | What it unlocks |
|---|---|---|---|
| 5 | **Google Calendar booking** — AI offers only genuinely free slots, two-way sync, customer gets invite | ~5h | Real booking automation → £500 more |
| 6 | **Email sequences (SendGrid/SES)** — welcome, day-2 follow-up, day-14 reactivation, review request | ~5h | Highest-ROI channel; roofers send zero emails today |
| 7 | **Google Reviews automation** — auto-request 3 days post-job, AI-drafted responses, one-click publish | ~5h | More 5★ reviews = higher ranking = more leads |
| 8 | **Stripe billing** — checkout, customer portal, dunning, deactivation on non-payment | ~4h | You can bill clients without manual invoices |
| 9 | **Instagram + Facebook DMs** — same AI, same pipeline, social inbox tab | ~5h | Under-45s message; first responder wins |
| 10 | **GoHighLevel sync** — push leads into the CRM many trades already pay £297/mo for | ~4h | Removes the #1 "we already use…" objection |
| 11 | **AI Voice agent** — inbound answering + outbound follow-up calls | ~8h | After-hours coverage; recovers 15-20% of dead leads |

Full build specs (including paste-ready prompts per feature) live in your original roadmap doc —
treat this file as the checklist and the pricing ladder.

## The pricing ladder this supports

| Milestone | System | Setup | Monthly |
|---|---|---|---|
| Weekend sprint only (today) | Lead capture + alerts | £500–1,500 | £150–300 |
| + Features 5-7 (calendar, email, reviews) | Full follow-up system | £1,500–3,000 | £300 |
| + Features 8-11 (billing, social, GHL, voice) | Enterprise AI sales platform | £5,000 | £500 |

## Rules of engagement

1. **Sell the slice you have.** Do not build Features 5-11 before the first paying client — the case study closes deals, not the feature count.
2. **One feature at a time**, test locally, run `npx tsc --noEmit` after each.
3. **Mock modes stay** — they are what makes the demo free.
4. **Never break the existing dashboard** — it is the product tour.
