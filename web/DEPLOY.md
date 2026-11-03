# DEPLOY — From localhost to a real URL

This guide takes the app from your laptop to a production URL in about an hour.
Stack: **Vercel** (Next.js) + **Neon** (Postgres) + **Upstash** (Redis, optional) — total running cost starts at **£0**.

---

## Read this first — what you own, and where the product lives

**You own all of it.** The code in this folder is the entire product. It has no
licence server, no phone-home, no vendor tag — if every outside service vanished
tomorrow, your install would keep running. Nothing in the app says anything
about who built it.

The product lives in three places, and only ONE of them is what you sell:

| Home | Where | Who sees it | Role |
|---|---|---|---|
| 1. Your laptop | `localhost:3000` | You | Building + in-person demos |
| 2. **Your client's website** | one `<script>` line on THEIR site | **Their customers — this is the product** | The chat bubble visitors talk to |
| 3. Your hosted URL | `yourname.vercel.app` (free) or your own domain (~£10/yr) | Prospects you text | Demo links you can send |

The demo link you were given lives on a **rehearsal server** — a borrowed
stage for showing the concept. It is not the product and never reaches a
client's customers. Home 2 is what a roofer pays for, and it sits on **their**
website, under **their** name.

**When to do this guide:** the evening your first client says yes (their
website embed needs a real hosted origin — `localhost` doesn't work on a
public site). Until then your laptop + demo link is all you need. When you
sit down to do it, do it in a chat with your assistant — every step below has
a plain-English meaning and you'll get each one explained as you click.

After this guide your links look like `https://yourname.vercel.app/widget/...`
— and with a domain, `https://chat.yourbrand.co.uk/widget/...`. No borrowed
stage anywhere in the chain.

---

## 0. Prerequisites

- A GitHub account (free)
- Node 20+ locally
- The repo pushed to GitHub:

> Not a git person? Don't panic-read this. When your first client says yes,
> open a chat with your assistant and do this page together — each command
> below gets explained in one plain sentence as you run it.

**Creating the repo on github.com first:** New repository → name it
`ai-marketing-automation` → set it **Private** (your sales playbook is in the
docs) → Create. **Do NOT tick "Add a README"** — an empty repo is what we want.

Then, one line at a time (each is explained — paste, Enter, read the output):

```bash
cd /d D:\ai-marketing-automation     :: go to the project folder

git init                              :: start the repo (safe to repeat)

git config --global user.name "YOUR-NAME"
git config --global user.email "THE-EMAIL-YOU-SIGNED-UP-TO-GITHUB-WITH"
     :: one-time passport for your laptop. Without this the commit is
     :: REFUSED silently - and the push then fails with
     :: "src refspec master does not match any". That error means
     :: "no save was ever made" - come back and do these lines.

git add .                             :: stage every file (junk is auto-skipped)
git commit -m "AutoPilot Marketing OS - first version"   :: THE SAVE. Never skip.
git log --oneline                     :: PROOF a save exists: shows 1+ lines.
     :: If you see a line here, the scary error is already dead.

git branch -M main                    :: pin the branch name to main, whatever
     :: git called it before (kills the master/main mismatch forever)
git remote add origin https://github.com/YOU/ai-marketing-automation.git
     :: "remote origin already exists" = you did this before. Harmless, skip on.
git push -u origin main               :: the upload. First time: a window pops
     :: up asking you to log in to GitHub - that's normal, sign in.
```

If the push says **! [rejected]** (you ticked "Add a README" by accident):
`git push -u origin main --force` — safe ONLY because the repo is brand new
with nothing of yours in it yet.

---

## 1. Database — Neon Postgres (free tier)

1. Sign up at [neon.tech](https://neon.tech) → **New Project** → name it `autopilot` → region: **AWS London (eu-west-2)** (closest to UK users).
2. Copy the **pooled connection string** from the dashboard:
   `postgresql://user:pass@ep-xxx-pooler.eu-west-2.aws.neon.tech/autopilot?sslmode=require`
3. Keep it safe — this becomes `DATABASE_URL`.

> Local dev uses SQLite (`file:./dev.db`). Production switches to Postgres in **step 3b** — it is a one-line schema change plus a migrate.

---

## 2. Redis — Upstash (free tier, optional for this build)

The weekend build does not need Redis (chat + SMS run in-process in Next.js). Create one only if you also run the Python workers (Celery):

1. Sign up at [upstash.com](https://upstash.com) → **Create Database** → name `autopilot-redis`.
2. Copy the REST or Redis URL (`redis://...`) — this becomes `REDIS_URL`.

---

## 3. Deploy the Next.js app — Vercel (free tier)

1. Sign up at [vercel.com](https://vercel.com) with your GitHub account.
2. **Add New → Project → Import** your `ai-marketing-automation` repo.
3. Vercel asks for the **Root Directory** — set it to `web/` (the Next.js app lives there, not at the repo root).
4. Framework preset: **Next.js** (auto-detected). Build command `next build` is already correct.
5. Add environment variables (below) under **Project → Settings → Environment Variables**.
6. Click **Deploy**. First build takes ~2 minutes.

### 3b. The one-line Postgres switch

In `web/prisma/schema.prisma`, change the datasource provider:

```prisma
datasource db {
  provider = "postgresql"   // was "sqlite" for local dev
  url      = env("DATABASE_URL")
}
```

Commit + push — Vercel rebuilds. Then run the migration **once** from your laptop, pointing at Neon:

```bash
cd web
DATABASE_URL="postgresql://…your-neon-string…?sslmode=require" npx prisma migrate deploy
# or, for a brand-new database:
DATABASE_URL="postgresql://…" npx prisma db push
```

Seed it (first deploy only — this creates the demo tenant; skip it for a clean customer install):

```bash
DATABASE_URL="postgresql://…" npm run db:seed
```

### Adding each new client (one command)

When a client says yes, create their tenant **in the production database** from your laptop:

```bash
cd web
DATABASE_URL="postgresql://…your-neon-string…?sslmode=require" npm run new-client -- "WD Roofing" "info@wdroofing.org"
```

It prints their tenant ID (e.g. `CLINK_wdroofing`), their dashboard login, and the exact widget line to paste on their website — using `NEXT_PUBLIC_APP_URL` if set, so the URL is correct for production. Give them the login details by phone or in person (never in a group chat), and have them change the password in Settings.

---

## 4. Environment variables checklist

Set these in Vercel → Settings → Environment Variables (all environments):

| Variable | Value | Notes |
|---|---|---|
| `DATABASE_URL` | Neon pooled connection string | from step 1, keep `?sslmode=require` |
| `JWT_SECRET` | random 32+ chars | `openssl rand -hex 32` |
| `ENCRYPTION_KEY` | random 32+ chars | `openssl rand -hex 32` |
| `NEXT_PUBLIC_APP_URL` | `https://app.yourdomain.co.uk` | or your `*.vercel.app` URL to start |
| `OPENAI_API_KEY` | `sk-…` | blank = mock mode (safe while demoing) |
| `TWILIO_ACCOUNT_SID` | `AC…` | blank = mock SMS |
| `TWILIO_AUTH_TOKEN` | from Twilio console | signs the inbound webhook |
| `TWILIO_PHONE` | `+447…` | your Twilio number |
| `SMTP_HOST` | `smtp.gmail.com` | blank = mock email. Free with a Gmail App Password |
| `SMTP_PORT` | `465` | 465 = implicit TLS (Gmail); 587 = STARTTLS |
| `SMTP_SECURE` | `true` / blank | blank auto-detects from the port |
| `SMTP_USER` | `you@gmail.com` | the Gmail address |
| `SMTP_PASS` | App Password | Google Account → Security → 2-Step Verification → App passwords |
| `SMTP_FROM` | `AutoPilot <you@gmail.com>` | what the tenant sees in their inbox |
| `REDIS_URL` | `redis://…` | only if you run the Python workers |
| `WORKER_API_URL` | `https://workers.yourdomain.com` | only if you deploy `workers/` |

Redeploy after saving (`Deployments → … → Redeploy`) so the new env vars are picked up.

---

## 5. Domain

**Option A — free to start (recommended):** use `yourapp.vercel.app`. Zero setup, SSL included. Good enough for demos this week.

**Option B — custom domain (£10/year for .co.uk):**
1. Buy the domain (Namecheap / Cloudflare Registrar).
2. Vercel → Project → **Settings → Domains → Add** → `app.yourdomain.co.uk`.
3. Vercel shows the DNS records to create at your registrar (an `A` record `76.76.21.21` and/or `CNAME` to `cname.vercel-dns.com`).
4. SSL is automatic — provisioning takes a few minutes.
5. Update `NEXT_PUBLIC_APP_URL` to the final domain and redeploy.

---

## 6. Webhooks to register (when you add real keys)

| Provider | URL to register | Where |
|---|---|---|
| Twilio — SMS | `https://app.yourdomain.co.uk/api/twilio/inbound` | Phone Number → Messaging → "A message comes in" (HTTP POST) |
| Twilio — Voice | `https://app.yourdomain.co.uk/api/twilio/voice` (Feature 6, not built yet) | Phone Number → Voice |

---

## 7. Post-deploy checklist

Run through this after every deploy:

- [ ] Visit `https://your-url/login` — sign in with `demo@apexroofing.com` / `demo1234`
- [ ] Dashboard loads: KPI cards + two charts render
- [ ] **Conversations** — open one, send a message, AI replies
- [ ] Open `https://your-url/widget/CLINK_apex` — the widget page loads standalone
- [ ] Open `https://your-url/test-widget-demo.html` — floating button appears bottom-right
- [ ] Chat from the demo page → message appears in the dashboard under Conversations
- [ ] Say something urgent ("roof is leaking badly, it's an emergency") → alert SMS fires (check server logs, or your phone if Twilio keys are set)
- [ ] Bad `tenantId` (e.g. `/widget/CLINK_nope`) → shows "Chat is currently unavailable"

---

## 8. Cost breakdown

| Service | Cost |
|---|---|
| Vercel Hobby | £0 (100GB bandwidth) |
| Neon Free | £0 (0.5GB — thousands of leads) |
| Upstash Free | £0 (10K commands/day — only if running workers) |
| Twilio UK number | ~£1/month + ~3p/SMS |
| OpenAI GPT-4o-mini | ~£5/month at small volume (a few hundred chats) |
| Domain | ~£10/year |

**Realistic totals:**
- 1 client: ~£1/month + usage
- 5 clients: ~£5–10/month
- 25 clients: ~£50/month (Neon Launch + Vercel Pro by then)

At £300/month per client, infrastructure never exceeds a rounding error.

---

## 9. Running the Python workers (optional)

The weekend features run entirely in Next.js — the workers are only needed once you build the deeper roadmap (calendar sync, campaign sends, review outreach). To run them locally:

```bash
cd workers
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
uvicorn app:app --port 8000          # FastAPI health/API
celery -A celery_app worker -B -l info  # Celery worker + beat
```

Deploy them on Railway (£5/month) when you get there — not before your first paying client.

---

## Troubleshooting

| Symptom | Fix |
|---|---|
| `error: src refspec master/main does not match any` | No commit exists yet. Usually `user.name`/`user.email` were never set, so the commit was refused. Run the two `git config --global` lines, then `git add .` and `git commit -m "..."` again, then `git branch -M main`, then push. |
| `Author identity unknown` / `Please tell me who you are` | Same fix: the two `git config --global` lines. |
| `remote origin already exists` | Harmless — the link is already set. Just run the push. |
| Login says "Invalid email or password" | DB not seeded — run `db:seed` against the production `DATABASE_URL` |
| Widget button doesn't appear on a site | The embed script must use the FULL app origin: `<script src="https://your-url/widget.js" data-tenant="CLINK_apex">` |
| "Prisma Client did not initialize" | Run `npx prisma generate` (postinstall does this automatically on Vercel) |
| Inbound SMS returns 403 | Twilio signs the URL it called — make sure `NEXT_PUBLIC_APP_URL` exactly matches the public URL registered in Twilio |
| Database "already in sync" but tables missing | You're pointing at the old SQLite file — check `DATABASE_URL` |
