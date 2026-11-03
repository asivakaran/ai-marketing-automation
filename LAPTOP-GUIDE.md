# START HERE — Run It & Sell It From Your Laptop

Everything below was tested end-to-end from a fresh unzip: install → demo login → dashboard → chat widget → AI reply. Total cost: **£0**. No API keys needed — the app runs in mock mode automatically.

Your laptop becomes two things: **your demo room** (show customers) and **your office** (run the business). Here's both.

---

## Part 1 — One-time setup (~15 minutes)

### Step 1. Install Node.js (free)

1. Go to **https://nodejs.org**
2. Download the **LTS** version (big green button — currently "22.x LTS")
3. Run the installer. Windows: keep clicking Next, **make sure "Add to PATH" stays ticked** (it is by default).

### Step 2. Unzip the project

Unzip `autopilot-marketing-os.zip` anywhere you like, e.g.:

- **Windows:** `C:\autopilot` (right-click the zip → Extract All)
- **Mac:** double-click the zip

### Step 3. Open a terminal in that folder

- **Windows:** open the `ai-marketing-automation\web` folder in File Explorer, click the address bar, type `cmd`, press Enter. A black window opens already in the right place.
- **Mac:** open Terminal, then type `cd ` (with a space) and drag the `web` folder onto the window, press Enter.

You should now be inside the **`web`** folder. Everything below runs here.

### Step 4. Run the 5 setup commands (one at a time)

**Windows (Command Prompt):**

```
copy env.example.txt .env
npm install
npm run db:push
npm run db:seed
npm run dev
```

**Mac (Terminal):**

```
cp env.example.txt .env
npm install
npm run db:push
npm run db:seed
npm run dev
```

What each one does:

| Command | What it does | How long |
|---|---|---|
| `copy env.example.txt .env` | creates your settings file (already filled in for free demo mode) | instant |
| `npm install` | downloads the building blocks (~200 packages) | 2–5 min — go get a drink |
| `npm run db:push` | creates your local database file | ~5 sec |
| `npm run db:seed` | fills it with a realistic demo roofing company + 50 leads | ~5 sec |
| `npm run dev` | **starts your app** | ~1 sec |

### Step 5. You're live

When you see `✓ Ready` and `Local: http://localhost:3000`:

1. Open your browser → **http://localhost:3000**
2. Log in: **demo@apexroofing.com** / **demo1234**
3. That's your product. It runs 100% on your laptop. No internet needed after install. No accounts, no keys, no bills.

> **Port note:** if something else on your laptop already uses port 3000, Next.js automatically picks 3001 and prints `Local: http://localhost:3001` — use whatever URL it prints.

---

## Part 2 — Every day after (10 seconds)

**Easiest (Windows):** double-click **`START-AUTOPILOT.bat`** (in the project root, next to this guide). It starts the app, opens your browser, and self-heals anything missing (creates `.env`, database, or installs packages on a fresh unzip). Keep the black window open — closing it stops the app.

By hand:

```
cd web          (or open cmd in the web folder like Step 3)
npm run dev
```

Then http://localhost:3000. To close it: click the terminal window and press **Ctrl+C** (Windows) / **Control+C** (Mac), or just close the window.

> **The app is not always-on.** It only exists while that terminal window is alive. Laptop restarted, window closed, or Ctrl+C = app off, and the browser will say `ERR_CONNECTION_REFUSED` until you start it again. That error never means the app is broken — it means it isn't running.

**Reset the demo data to factory-fresh** (before showing a new customer):

```
npm run db:seed
```

It wipes and reseeds — takes 5 seconds, so every demo starts spotless.

---

## Part 3 — Your demo cheat card

| What | URL / login | When to use it |
|---|---|---|
| **Dashboard login** | http://localhost:3000/login → `demo@apexroofing.com` / `demo1234` | start & end of demo |
| **Fake roofer website** (looks like a real business's site) | http://localhost:3000/test-widget-demo.html | the "wow" moment |
| **Widget standalone** | http://localhost:3000/widget/CLINK_apex | backup link |
| **Login page** | the login screen | never show this to customers |

---

## Part 4 — The sales demo, exact clicks (5 minutes)

Do this **in person** with your laptop, or **on a video call** sharing your screen. Have your phone in your hand — it plays the customer. Full scripts and pricing: see `docs/SALES_KIT.md`.

1. **Open the fake roofer site** (`test-widget-demo.html`). Say nothing clever yet — just: *"This is a website like yours. Watch what a customer sees at 11pm."*
2. **Click the chat bubble** (bottom-right). Type as the customer: *"My roof is leaking badly in the storm, water's coming through the ceiling — how fast can someone come out? I'm in HP13."*
3. **The AI replies** — asking for their number, qualifying the job. Give it your real mobile number.
4. **The alert lands** (mock SMS is logged in the terminal + alert email if configured). On a real install, their phone buzzes. Say: *"That's a customer you'd have lost. You were asleep."* Then stay quiet for 3 seconds. The silence sells it.
5. **Log into the dashboard.** Land on the Overview page and point at the **pipeline value first**: *"Every chat becomes a lead, every lead has a value. This screen is your money."* Show Leads, then Live Chat. Don't show Settings or every page — 3 screens max, then shut up and ask for the pilot.

The ask: *"Two weeks free on your actual website. If it doesn't capture a single lead, I take it off and you've lost nothing. If it works, we talk numbers. Fair?"*

### Screen-share setup (free, 2 minutes)

- **Google Meet** (meet.google.com) — free, no install, works in Chrome. Start a meeting → "Present now" → share **just the browser window**, not your whole screen (so notifications don't pop up mid-demo).
- Turn on **Do Not Disturb / Focus** before demoing so nothing interrupts you.
- Have `test-widget-demo.html` open in one tab and the dashboard logged in, in another.

---

## Part 5 — When they say yes (the workflow)

Your laptop demos it. The **pilot runs on the free cloud** (a customer's real website can't reach your localhost):

1. **They agree to the free 14-day pilot** → send the one-page pilot agreement (in `docs/SALES_KIT.md`) — parent/guardian countersigns.
2. **Create their client account** — one command (in the `web` folder):

   ```
   Double-click NEW-CLIENT.bat (in the main folder) and type:
   Business name: WD Roofing    Email: info@wdroofing.org
   ```

   It prints: their **tenant ID** (e.g. `CLINK_wdroofing`), their **dashboard login** (email + generated password), and **the exact one-line script for their website**. You don't "find" a tenant ID anywhere — **you create it** with this command, and the widget line comes out ready to paste.

3. **Deploy one free instance for them** → follow `web/DEPLOY.md` (Vercel free + Neon free = £0). First time takes ~1 hour; after that ~15 minutes. For the cloud, DEPLOY.md shows the matching command (NEW-CLIENT.bat only works on your laptop install).
4. **They paste one line** into their website (or their web guy does — you can email it). It looks like:
   `<script src="https://your-app.vercel.app/widget.js" data-tenant="CLINK_wdroofing"></script>`
   (The URL must be your **deployed** app's URL — never localhost. The command prints the right line once deployed.)
5. **Leads get captured for real.** Screenshot everything — that's your case study.
6. **At the end of the pilot, convert (founding-client offer):** *"You're one of my first three clients — the setup is free, it's £99/month, cancel anytime, and if it's worked I'd love a quick testimonial."*
7. **AI and email are already free** — Groq key (AI-SETUP.md, £0) + Gmail App Password (EMAIL-SETUP.md, £0). Only SMS costs money: their first monthly payment funds Twilio (~£1/month) — add the key in Vercel settings. Margin stays ~95%.

Repeat. Every client after the first is faster.

**Personalized demo trick:** before demoing to a specific business, double-click **NEW-CLIENT.bat** and type their business name, then open `localhost:3000/widget/CLINK_theirbusiness` — the chat bubble shows **their business name**. Watching "their own" assistant work is 10x more convincing than a generic demo.

---

## Part 6 — Getting paid (the 13-year-old reality, UK)

- **Bank transfer is your friend.** Teen accounts like **Starling Kite, GoHenry, NatWest Adapt, HSBC MyAccount** give you a real sort code + account number that can receive UK Faster Payments — anyone can pay you, free, same day. Put the details on a simple invoice.
- **Or** a parent/guardian's PayPal or Stripe account handles card payments (both require 18+).
- **Contracts:** under-18s can't be legally bound to a contract in England & Wales, so have a parent or guardian sign or countersign the agreement. It also answers the "you're how old?" objection instantly: *"The product works either way — and an adult signs the paperwork."*
- **Invoice like a pro:** free templates in Google Docs ("invoice template"), number them 001, 002… Payment terms: 50% upfront, 50% on go-live for setups; monthly fees by standing transfer.

---

## Part 7 — If something goes wrong

| Problem | Fix |
|---|---|
| **"localhost refused to connect" / ERR_CONNECTION_REFUSED** | The app isn't running — the laptop restarted, the terminal was closed, or you hit the URL before `✓ Ready` appeared. Start it (Part 2), wait for `Local: http://localhost:3000`, then refresh the browser. This error **never** means the code is broken. |
| Opening localhost **on your phone or another computer** | `localhost` means "this same machine". It only works in a browser **on the laptop running the app**. To show it on other devices you need the deployed URL (`web/DEPLOY.md`). |
| Address bar shows **https**://localhost | Delete the "s" — type **http**://localhost:3000. The local app doesn't speak https. |
| `npm: command not found` / `not recognized` | Node didn't install with PATH. Reinstall Node.js, keep "Add to PATH" ticked, then **close and reopen** the terminal. |
| `npm install` seems frozen | It's downloading. Give it 5 minutes. Only worry past 10. |
| Browser shows nothing at localhost:3000 | Read the terminal — the app prints the real URL there (it may have picked port 3001). Also check `✓ Ready` appeared. |
| Login says "Invalid email or password" | Database not seeded. Stop the server (Ctrl+C), run `npm run db:seed`, then `npm run dev` again. |
| Weird state after experimenting | Full reset: stop server → delete the `dev.db` file inside `web\prisma\` → `npm run db:push` → `npm run db:seed` → `npm run dev`. |
| Port 3000 in use | Harmless — Next.js auto-switches to 3001 and tells you in the terminal. |
| **Chromebook** | You can't run Node normally on ChromeOS. Either enable **Linux development environment** (Settings → Advanced → Developers) and run the commands in its terminal, or keep using the hosted preview link for demos. |

**Two golden rules:** 1) never share your `.env` file or the passwords in it; 2) if a command errors, the LAST lines of red text are the actual error — read them before panicking, they usually say exactly what's wrong.
