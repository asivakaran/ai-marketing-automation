# EMAIL-SETUP.md — Make lead alerts REAL (free, ~5 minutes)

This one file removes the biggest gap between what AutoPilot **is** and what it
**promises**: the moment a visitor on your client's website leaves their phone
number, a real email lands in the client's inbox within seconds — name, number,
what they need, and a link to claim the job.

Until you do this, email alerts are **mock mode**: they get logged on the server
(in Settings → "Alert history" you'll see them marked **Mock**), but nothing is
actually sent. No inbox, no ping. This doc flips that switch.

**Cost: £0. Time: about 5 minutes. You need: any Gmail account.**

---

## Step 1 — Pick the Gmail account that will SEND the alerts

You can use your own Gmail, but a dedicated one looks more professional and
keeps your personal inbox clean. Example: `autopilot.alerts.yourname@gmail.com`.

> The alerts are SENT FROM this account, TO whatever email you set in each
> client's dashboard (Settings → Lead alerts → Alert email). The client can use
> any inbox — Gmail, Outlook, their business email. Anything.

## Step 2 — Turn on 2-Step Verification (required by Google)

1. Go to **myaccount.google.com** and sign in to that Gmail account.
2. Left menu → **Security**.
3. Find **2-Step Verification**. If it's OFF, click it and follow the steps
   (usually just adding your phone number). Google requires this before it lets
   you create App Passwords.

## Step 3 — Create an App Password

1. Still in **Security**, use the search bar at the top of the page and type
   **App passwords** (or go to `myaccount.google.com/apppasswords`).
2. You may need to sign in again. Then: name it something like `autopilot`
   and click **Create**.
3. Google shows you a **16-character password** like `abcd efgh ijkl mnop`.
   Copy it somewhere safe (you'll paste it once and never need it again).

> An App Password is NOT your Gmail password. It's a separate key that only
> sends email — exactly what we want. You can delete it any time and alerts
> simply stop until you make a new one.

## Step 4 — Put it in your .env file

1. Open your app folder: `D:\ai-marketing-automation\web`
2. Open the file called **.env** in Notepad (if you only see `env.example.txt`,
   copy it and rename the copy to `.env` first).
3. Find the SMTP section and fill it in like this — replace the two values
   with YOUR Gmail address and YOUR 16-character App Password (no spaces
   needed, but spaces are fine too):

```
SMTP_HOST="smtp.gmail.com"
SMTP_PORT="465"
SMTP_SECURE="true"
SMTP_USER="autopilot.alerts.yourname@gmail.com"
SMTP_PASS="abcdefghijklmnop"
SMTP_FROM="AutoPilot Alerts <autopilot.alerts.yourname@gmail.com>"
```

4. Save the file.

## Step 5 — Restart and PROVE it works

1. If the app is running: click its window and press **Ctrl+C**, then start it
   again with `START-AUTOPILOT.bat`.
2. Log in → **Settings**. The status badge should now say
   **"Email: live (SMTP)"** instead of "Email: mock mode".
3. Scroll to **Lead alerts (email)** → enter the inbox you want alerts to go
   to → **Save** → click **Send test email**.
4. Check that inbox (and the spam folder the first time — mark it "Not spam").
   You should see: **"✅ Test alert — your lead alerts are working"**.
5. Scroll to **Alert history** — the row should now say **Sent**, not Mock.

That's it. Email alerts are now 100% real, for £0.

---

## The full proof — test it like a customer would

1. Open the widget demo (`public/test-widget-demo.html`, or your preview link).
2. Type: `Hi, my gutters are leaking badly — my name's Dave, my number is 07700 900123`
3. Within seconds, the alert inbox gets an email:
   **"🔔 New lead: Guttering — Dave — +447700900123"** with a big
   **Open dashboard & claim** button.
4. Settings → Alert history shows the real record: Email → **Sent**.

## If it doesn't work

| What you see | What it means | Fix |
|---|---|---|
| Test email says "mock" still | .env not saved, or app not restarted | Save .env, Ctrl+C, run START-AUTOPILOT.bat again |
| Error: "Invalid login" / "Username and Password not accepted" | 2-Step Verification is off, or the App Password was copied wrong | Re-check Step 2 and 3; paste the password again (copy it without spaces if it keeps failing) |
| Nothing arrives | First email often lands in spam | Check spam, mark "Not spam" — after that they arrive normally |
| "Self signed certificate" or timeout errors | Antivirus/VPN intercepting the connection | Try without VPN; add Node.js to antivirus exceptions |
| Alerts arrive but say "SKIPPED (no alert email set)" | The client's alert email wasn't saved | Settings → Lead alerts → type it → Save |

Gmail lets you send up to ~500 emails/day — you'd need 500 leads a day to hit
that. At 3 clients, you'll use maybe 20 a month.

---

## What you can now honestly say (pitch lines that are TRUE)

> "The second someone on your website leaves their number — even at 11pm —
> you get an email with their name, number and what they need. Check it in the
> morning, call them before anyone else does."

> "You can watch it happen in Settings: every alert we've ever sent you is
> logged, and whether it actually went out. Nothing hidden."

> "The chat answers their questions instantly, and if it's an emergency
> — water pouring in — the email says URGENT at the top."

**What you still can't promise (yet):** SMS texts to their phone. That needs a
Twilio account (~£1/month, has to be opened by someone 18+, so a parent) —
add it after your first paying client, never before.
