# Architecture

## Request flow (weekend build)

```
Visitor on roofer's website
  └─ <script src="APP/widget.js" data-tenant="CLINK_apex">   ← one line to embed
       └─ floating button (inline-styled, zero CSS leakage)
            └─ iframe → APP/widget/CLINK_apex                ← served by our Next.js app
                 └─ POST /api/chat  { tenantId, message, conversationId? }
                      ├─ lib/ai.ts  → OpenAI gpt-4o-mini  (or mock responses if no key)
                      ├─ lead capture: name/phone/postcode/service extracted → Lead table
                      └─ emergency or ready-to-book?
                            └─ lib/twilio.ts → SMS to owner's mobile (or mock log if no keys)

Owner's phone buzzes: "🔥 New lead from your website — Sarah, +447…, Roof leak, URGENT. Reply YES to claim."

Customer texts back (Twilio webhook)
  └─ POST /api/twilio/inbound  (X-Twilio-Signature verified)
       ├─ STOP → [opted-out] in lead.notes, never messaged again
       ├─ HELP → help text
       └─ otherwise → AI replies over SMS
```

## Key design decisions

1. **One chat endpoint for everything.** The website widget, the dashboard chat, and inbound SMS all funnel through `POST /api/chat` → `generateChatResponse()`. Public (no session) for the widget, session-scoped for the dashboard. The AI response shape is identical in mock and live mode: `{ reply, intents, extracted }`.
2. **Mock mode is a feature, not a stub.** No `OPENAI_API_KEY` → deterministic, believable qualification responses. No `TWILIO_*` → SMS alerts are logged to the server console. This makes the whole system demoable for £0, and every OpenAI failure falls back to mock so the widget never goes dark.
3. **Tenant isolation.** Every table carries `tenantId`. Public endpoints (`/api/chat`, `/api/widget`) accept a `tenantId` param and verify the tenant exists + is active; session endpoints derive `tenantId` from the JWT and reject mismatches.
4. **Widget isolation.** `widget.js` injects exactly two elements into the host page (a button and an iframe), all inline-styled. No CDN dependencies, no CSS leakage, works on WordPress/Wix/hand-coded HTML alike.
5. **SQLite locally, Postgres in production.** One-line provider switch in `prisma/schema.prisma` + `DATABASE_URL` (see DEPLOY.md). The sandbox exports a global `DATABASE_URL` — run local commands with `DATABASE_URL="file:./dev.db"` if it collides.
6. **XTransformPort-aware client helpers** (`lib/client.ts`, `widget.js`). A sandbox-preview nicety that is a no-op in any normal deployment.

## Data model (14 models)

`Tenant` → `User`, `Lead`, `Conversation` → `Message`, `Campaign` → `CampaignRecipient`, `Review`, `Appointment`, `Integration` (TWILIO/GOOGLE/META/GHL/STRIPE/SENDGRID), `Subscription`, `WebhookEvent`, `AuditLog` — all tenant-scoped, indexed on `(tenantId, …)`.

## Roadmap hooks already in the schema

- `Integration.metadata` JSON — where Twilio alert phones (and future Google/Meta/GHL tokens) live
- `Appointment.calendarEventId` — ready for Google Calendar two-way sync (Feature 3 on the roadmap)
- `WebhookEvent` — every inbound webhook is recorded before processing (Stripe/Meta/GHL receivers land with their features)
- `Campaign` + `CampaignRecipient` with open/click counts — ready for real email sending (Feature 5)
