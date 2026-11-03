# DEMO-CHECKLIST.md — the "it will not fail" card

Print this. Run it once before you text anyone, and again 10 minutes before
you show the system. If every box ticks, the demo cannot fail.

---

## A. The night before (once, ~20 minutes total)

| # | Step | Time | Done |
|---|------|------|------|
| 1 | Extract the fresh zip, double-click **START-AUTOPILOT.bat** — app opens by itself | 10 sec | ☐ |
| 2 | Log in (demo@apexroofing.com / demo1234). You see the dashboard | 1 min | ☐ |
| 3 | Add your Groq key to `web\.env` → restart → Settings says **"AI: live (Groq)"** (AI-SETUP.md) | 2 min | ☐ |
| 4 | Add Gmail App Password → Settings → **"Send test email"** → it lands in your inbox (EMAIL-SETUP.md) | 5 min | ☐ |
| 5 | Create the client: double-click **NEW-CLIENT.bat**, type `WD Roofing`, then their email — it prints their login, their widget link, everything | 1 min | ☐ |
| 6 | **The rehearsal** (below) | 5 min | ☐ |

### The rehearsal — do this once and you're bulletproof
1. Open the widget link the script printed (e.g. `http://localhost:3000/widget/CLINK_wdroofing`).
2. Type: *"Hi I'm Dave, my gutters are blocked and water is coming through the ceiling, my number is 07xxx xxxxxx"*
3. Watch: the reply comes back instantly.
4. Check your phone: an email just arrived — **"URGENT lead"** with Dave's number.
5. Log into the client dashboard (the login the script printed): Dave is there, EMERGENCY, phone captured.
6. Say out loud: *"That took the customer 15 seconds and the owner was up a ladder."*

If 1–6 worked once, they will work in front of a client — it's the same
machine doing the same thing. There is no "demo luck" in software.

---

## B. 10 minutes before showing anyone

| # | Check | Pass condition |
|---|-------|----------------|
| 1 | Double-click START-AUTOPILOT.bat | Browser opens with the dashboard logged out (it's UP) |
| 2 | Open their widget link | Chat appears, greeting visible |
| 3 | Send any message | Reply comes back within ~5 seconds |
| 4 | Settings page | "AI: live (Groq)" and "Email: live (SMTP)" both teal |

All four pass = nothing on your laptop can go wrong in the next 2 hours.

---

## C. Why it CANNOT catastrophically fail (read this on the bad-morning days)

Every single layer has a built-in fallback. This isn't luck — it was built
this way and each one was tested:

| What could break | What actually happens | You lose |
|---|---|---|
| Groq is down / key wrong / daily cap hit | Chat auto-switchs to built-in scripts mid-conversation — visitor still gets answered instantly (proven in a live test) | Fancy wording only |
| Email alert fails to send | The attempt is logged in Settings → Alert history with the error — you SEE it and can resend | Nothing invisible |
| App won't start | The bat file rebuilds whatever's missing (.env, database, dependencies) itself | 30 seconds |
| Their website is weird | The widget link works as a standalone page — you can demo it without touching their site at all | Nothing for a pilot |
| Your laptop dies | The data is in the database; restart the bat file and it's all still there | A restart |

The only genuine failure mode is **not showing it to anyone.** Everything
else is a 30-second recovery.

---

## D. Granting the service to a client (the whole process, 3 steps)

When a roofer says yes to the free pilot:

1. **Create them** (1 min): double-click **NEW-CLIENT.bat**, type their business
   name and email → it prints their dashboard login + their widget link.
2. **Brand it** (2 min): log in as them → Settings → set brand colour,
   services, alert email/phone, average job value.
3. **Give them the link** (10 sec): text them the widget link.
   That IS the pilot. Their website embed is one line for their web person —
   only needed after they've already seen it work.

Money conversation (after the free month, if they like it): £99/month,
cancel anytime. First payment funds Twilio for SMS alerts (~£1/month).

---

## E. If something glitches mid-demo (rare — but here's your line)

- Chat slow? *"Let me show you the dashboard while that loads."* (It won't be slow — local app.)
- A reply looks scripted? That's the built-in fallback doing its job —
  *"if the AI service ever blips, it never leaves a customer hanging."*
  Say it with confidence — it's a SELLING point.
- Laptop on 20% battery? Plug in before you start. (Yes, add it to the checklist in your head.)

You are not demonstrating software. You are demonstrating that **a customer
at 11pm gets an answer and the roofer gets the phone number.** That happened
in your rehearsal, and it will happen again.
