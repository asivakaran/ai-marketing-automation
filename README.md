# AutoPilot Marketing OS

AI lead capture and follow-up for home services businesses (roofers, plumbers, electricians).
Visitors chat on the business's website → the AI qualifies them → the owner's phone buzzes with the lead while they're up a ladder.

## Status: Weekend Sprint complete

| Feature | State |
|---|---|
| **Embeddable chat widget** (works on any website via one script tag) | ✅ built + E2E verified |
| **Real AI replies — FREE via Groq (gpt-oss-120b), or OpenAI — with automatic mock fallback** | ✅ built + E2E verified (real code path proven against a live OpenAI-compatible endpoint); activates with `GROQ_API_KEY` — see **AI-SETUP.md** |
| **Email lead alerts** (sent the moment a visitor leaves their number) | ✅ built + E2E verified with a real SMTP send — free via Gmail App Password, see **EMAIL-SETUP.md** |
| **Twilio SMS lead alerts** (+ inbound replies, STOP/HELP) | ✅ built (mock verified E2E; real path activates with `TWILIO_*`) |
| **Alert history** (Settings shows every alert + whether it actually went out) | ✅ built + E2E verified |
| **Deployment** | ✅ guide written — `web/DEPLOY.md` |

Everything runs in **mock mode with zero API keys** — free and safe for demos. Two channels go REAL for £0: AI replies (Groq key, ~2 min — **AI-SETUP.md**) and email alerts (Gmail App Password, ~5 min — **EMAIL-SETUP.md**).

> **▶ Just want to run it on your laptop and sell it? Open `LAPTOP-GUIDE.md`** — tested step-by-step setup, the 5-minute sales demo, and how to get paid. Sales scripts and pricing live in `docs/SALES_KIT.md`; going live for a client is `web/DEPLOY.md`. Before your first demo, make it real for £0: AI replies (**AI-SETUP.md**, 2 min) and lead-alert emails (**EMAIL-SETUP.md**, 5 min).

## Quickstart (local)

```bash
cd web
npm install                # also runs prisma generate
npm run db:push         # create SQLite dev.db
npm run db:seed            # demo tenant + 50 leads
npm run dev                # http://localhost:3000
```

- **Dashboard login:** `demo@apexroofing.com` / `demo1234`
- **Widget on a fake roofer site:** http://localhost:3000/test-widget-demo.html
- **Widget page standalone:** http://localhost:3000/widget/CLINK_apex
- **Embed on any site:**
  `<script src="https://your-app-url/widget.js" data-tenant="CLINK_apex"></script>`

## Repo layout

```
web/        Next.js 16 app (App Router, TS strict, Prisma, Tailwind 4)
  app/        routes: dashboard pages + public widget + REST APIs
  lib/        auth (JWT), ai (Groq/OpenAI + mock fallback), twilio, db, client helpers
  prisma/     schema (15 models, incl. AlertLog) + seed
  prompts/    chatbot system prompt
  public/     widget.js (the embed script) + demo host page
workers/    Python FastAPI + Celery (optional — not needed by the weekend features)
docs/       build roadmap, architecture, screenshots
```

## API surface

| Route | Auth | Purpose |
|---|---|---|
| `POST /api/chat` | public (session optional) | the one chat endpoint used by widget + dashboard; captures leads, fires SMS alerts |
| `GET /api/widget?tenantId=` | public | branding for the floating button |
| `POST /api/auth/login` / `logout` | public / session | JWT cookie `autopilot_session` |
| `GET /api/leads` | session | tenant-scoped lead list |
| `POST /api/reviews` | session | generate-draft / respond |
| `POST /api/settings/alert-phone`, `POST /api/settings/test-sms` | session | lead-alert config (SMS) |
| `POST /api/settings/alert-email`, `POST /api/settings/test-email` | session | lead-alert config (email) |
| `POST /api/twilio/inbound` | Twilio signature | customer texts back — STOP/HELP/AI reply |

## Going to production

See **web/DEPLOY.md** — Vercel + Neon + (optional) Upstash, ~£0 to start.
For the rest of the product roadmap (Google Calendar, email sequences, reviews automation, voice, Meta, GHL), see **docs/BUILD_ROADMAP.md**.
