/**
 * Seed: Apex Roofing demo tenant with a full-looking dataset.
 * Run: npm run db:seed   (idempotent — wipes and reseeds)
 */
import { PrismaClient, Prisma, LeadSource, LeadStatus, LeadUrgency } from "@prisma/client";
import bcrypt from "bcryptjs";
import { existsSync, readFileSync } from "fs";

// Load .env from the current folder if present (no dotenv dependency needed).
if (existsSync(".env")) {
  for (const line of readFileSync(".env", "utf8").split(/\r?\n/)) {
    if (line.trim().startsWith("#")) continue;
    const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
    if (!m) continue;
    let val = m[2].trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    if (!process.env[m[1]]) process.env[m[1]] = val;
  }
}

const db = new PrismaClient();

// Deterministic PRNG so reseeds are stable
let s = 42;
function rnd(): number {
  s = (s * 1664525 + 1013904223) % 4294967296;
  return s / 4294967296;
}
function pick<T>(arr: readonly T[]): T {
  return arr[Math.floor(rnd() * arr.length)]!;
}
function daysAgo(n: number, hour = 10): Date {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(hour, (n * 7) % 60, 0, 0);
  return d;
}
function inDays(n: number, hour = 10): Date {
  const d = new Date();
  d.setDate(d.getDate() + n);
  d.setHours(hour, (n * 13) % 60, 0, 0);
  return d;
}

const FIRST = [
  "Sarah", "James", "Emma", "Oliver", "Chloe", "Dan", "Priya", "Mark", "Lucy", "Tom",
  "Hannah", "Ben", "Alice", "Ryan", "Kate", "Neil", "Jess", "Adam", "Lauren", "Chris",
  "Megan", "Paul", "Ellie", "Gavin", "Nadia",
] as const;
const LAST = [
  "Whitfield", "Morgan", "Hargreaves", "Barker", "Choudhury", "Ellis", "Winters", "Fletcher",
  "Okafor", "Pemberton", "Ashworth", "Reyes", "Thornton", "Kaur", "Bishop", "Doyle", "Nash",
  "Whitmore", "Iqbal", "Rowlands", "Cavendish", "Moss", "Patel", "Strafford", "Yates",
] as const;

const SERVICES = [
  "Roof leak", "Guttering", "Flat roof", "Chimney", "Fascia & soffits",
  "Loft insulation", "Missing tiles", "Moss removal", "Repointing", "Storm damage", "Roof",
] as const;

const POSTCODES = [
  "HP13 6BD", "HP13 7UA", "HP14 4NL", "SL7 1DH", "SL9 9QS", "RG4 8XX",
  "HP12 4TT", "HP11 2EE", "SL8 5LP", "HP10 9GN",
] as const;

function phoneFor(i: number): string {
  // Ofcom drama-reserved range 07700 900xxx — safe for demos
  return `+44770090${String(101 + i).padStart(4, "0")}`;
}

const CONVO_SCRIPTS: Array<Array<[("USER" | "ASSISTANT"), string]>> = [
  [
    ["USER", "Hi, I've got a leak in my roof — water came through the ceiling last night."],
    ["ASSISTANT", "Sorry to hear that — that needs looking at quickly. What's the best number to reach you on?"],
    ["USER", "07700 900118, it's Diane. HP13 area."],
    ["ASSISTANT", "Thanks Diane — I've passed this to Apex Roofing as urgent. Someone will call you back within the hour."],
    ["USER", "Thank you, appreciate it."],
  ],
  [
    ["USER", "How much would a new flat roof cost roughly?"],
    ["ASSISTANT", "It depends on the size and finish — but I can arrange a free no-obligation survey with a fixed quote. What's your postcode?"],
    ["USER", "SL7 1DH. It's about 30 square metres I think."],
    ["ASSISTANT", "Noted — how about Thursday morning? Dave can be with you between 9 and 11 to measure up."],
    ["USER", "Thursday works. My name's Ian, 07700 900131."],
    ["ASSISTANT", "Booked in for Thursday, Ian. You'll get a text the day before to confirm."],
  ],
  [
    ["USER", "Do you do gutter clearing? Mine are overflowing when it rains."],
    ["ASSISTANT", "We do — full clear, flush and check of the downpipes. Have you noticed any water running down the walls?"],
    ["USER", "Yes actually, damp patch inside."],
    ["ASSISTANT", "That's usually the overflow spilling behind the fascia — worth sorting soon. What's the best number for you, and your postcode?"],
    ["USER", "07700 900142, HP12 4TT, name's Carol."],
    ["ASSISTANT", "Got it Carol — I've flagged the damp for the surveyor so he brings the camera to check the fascia boards."],
  ],
  [
    ["USER", "Storm blew a few tiles off my roof last night, it's urgent."],
    ["ASSISTANT", "That needs urgent attention — I'll get someone from Apex Roofing to call you back within the hour. What's the best number to reach you on?"],
    ["USER", "07700 900107, Raj, HP14 4NL. There's tarpaulin on it now."],
    ["ASSISTANT", "Good call with the tarpaulin, Raj. I've marked this as an emergency — a roofer will call within the hour about making it safe."],
  ],
  [
    ["USER", "Hi, do you handle chimney repointing?"],
    ["ASSISTANT", "Yes — we repoint and cap chimneys regularly. Is the stack showing any cracks or is it more crumbling mortar? And what's your postcode?"],
    ["USER", "HP11 2EE, crumbling mostly."],
    ["ASSISTANT", "Typical for this area. I can book a free look — would a weekday morning or afternoon suit you better?"],
    ["USER", "Morning please. I'm Wendy, 07700 900121."],
    ["ASSISTANT", "Pencilled in for Wednesday morning, Wendy — you'll get a confirmation text."],
  ],
];

async function main() {
  console.log("Seeding…");

  // ---- wipe (children first) ----
  await db.auditLog.deleteMany();
  await db.webhookEvent.deleteMany();
  await db.subscription.deleteMany();
  await db.integration.deleteMany();
  await db.campaignRecipient.deleteMany();
  await db.campaign.deleteMany();
  await db.review.deleteMany();
  await db.appointment.deleteMany();
  await db.message.deleteMany();
  await db.conversation.deleteMany();
  await db.lead.deleteMany();
  await db.user.deleteMany();
  await db.tenant.deleteMany();

  // ---- tenant + user ----
  const tenant = await db.tenant.create({
    data: {
      id: "CLINK_apex",
      name: "Apex Roofing",
      slug: "apex-roofing",
      brandColor: "#1e293b",
      website: "https://apexroofing.example.co.uk",
      phone: "+441494555010",
      email: "office@apexroofing.example.co.uk",
      address: "Unit 4, Cressex Industrial Estate, High Wycombe HP12 3XY",
      plan: "GROWTH",
      isActive: true,
      avgJobValue: 4800,
    },
  });

  const passwordHash = await bcrypt.hash("demo1234", 10);
  const dave = await db.user.create({
    data: {
      tenantId: tenant.id,
      email: "demo@apexroofing.com",
      passwordHash,
      name: "Dave Morgan",
      role: "OWNER",
      lastLoginAt: daysAgo(0, 8),
    },
  });

  // ---- integrations ----
  await db.integration.createMany({
    data: [
      { tenantId: tenant.id, provider: "TWILIO", status: "CONNECTED", metadata: { alertPhone: "+447700900000", note: "Alerts for new website leads" } },
      { tenantId: tenant.id, provider: "SMTP", status: "CONNECTED", metadata: { alertEmail: "dave@apexroofing.com", note: "Email alerts for new website leads" } },
      { tenantId: tenant.id, provider: "STRIPE", status: "CONNECTED", metadata: { plan: "GROWTH" } },
      { tenantId: tenant.id, provider: "GOOGLE", status: "DISCONNECTED" },
      { tenantId: tenant.id, provider: "META", status: "DISCONNECTED" },
      { tenantId: tenant.id, provider: "GHL", status: "DISCONNECTED" },
      { tenantId: tenant.id, provider: "SENDGRID", status: "DISCONNECTED" },
    ],
  });

  await db.subscription.create({
    data: {
      tenantId: tenant.id,
      plan: "GROWTH",
      status: "ACTIVE",
      setupFeePaid: true,
      setupFeeAmount: 1500,
      monthlyPrice: 300,
      startedAt: daysAgo(64),
      currentPeriodEnd: inDays(21),
    },
  });

  // ---- 50 leads ----
  const statusCycle: LeadStatus[] = [
    LeadStatus.NEW, LeadStatus.CONTACTED, LeadStatus.QUALIFIED, LeadStatus.BOOKED,
    LeadStatus.CLOSED_WON, LeadStatus.CONTACTED, LeadStatus.NEW, LeadStatus.CLOSED_LOST,
    LeadStatus.QUALIFIED, LeadStatus.BOOKED,
  ];
  const sourceCycle: LeadSource[] = [
    LeadSource.WEBSITE_CHAT, LeadSource.WEBSITE_CHAT, LeadSource.GOOGLE, LeadSource.WEBSITE_CHAT,
    LeadSource.REFERRAL, LeadSource.WEBSITE_CHAT, LeadSource.INSTAGRAM, LeadSource.SMS,
    LeadSource.WEBSITE_CHAT, LeadSource.FACEBOOK,
  ];
  const urgencyCycle: LeadUrgency[] = [
    LeadUrgency.NORMAL, LeadUrgency.NORMAL, LeadUrgency.HIGH, LeadUrgency.NORMAL,
    LeadUrgency.EMERGENCY, LeadUrgency.NORMAL, LeadUrgency.NORMAL, LeadUrgency.HIGH, LeadUrgency.NORMAL, LeadUrgency.NORMAL,
  ];

  const leadIds: string[] = [];
  for (let i = 0; i < 50; i++) {
    const first = FIRST[i % FIRST.length]!;
    const last = LAST[(i * 7 + 3) % LAST.length]!;
    const name = `${first} ${last}`;
    const status = statusCycle[i % statusCycle.length]!;
    const source = sourceCycle[i % sourceCycle.length]!;
    const urgency = urgencyCycle[i % urgencyCycle.length]!;
    const hasDetails = i % 9 !== 0; // a few anonymous early visitors
    const created = daysAgo(45 - Math.floor(i * 0.85), 9 + (i % 9));
    const wonValue = status === "CLOSED_WON" ? 2400 + Math.round(rnd() * 12000) : null;

    const lead = await db.lead.create({
      data: {
        tenantId: tenant.id,
        name: hasDetails ? name : null,
        phone: hasDetails ? phoneFor(i + 1) : null,
        email: hasDetails && i % 3 === 0 ? `${first.toLowerCase()}@example.co.uk` : null,
        source,
        status,
        serviceNeeded: i % 11 === 10 ? null : pick(SERVICES),
        postcode: hasDetails ? POSTCODES[i % POSTCODES.length] : null,
        urgency,
        value: wonValue,
        notes: i === 5 ? "[opted-out] asked not to be contacted by SMS" : null,
        lastMessageAt: source === "WEBSITE_CHAT" || source === "SMS" ? created : null,
        createdAt: created,
        updatedAt: created,
      },
    });
    leadIds.push(lead.id);
  }

  // ---- conversations for chat leads (first 18) ----
  for (let i = 0; i < 18; i++) {
    const lead = await db.lead.findUniqueOrThrow({ where: { id: leadIds[i]! } });
    const channel = lead.source === "SMS" ? "SMS" : "WEBSITE";
    const script = CONVO_SCRIPTS[i % CONVO_SCRIPTS.length]!;
    const convoCreated = lead.createdAt;
    const convo = await db.conversation.create({
      data: {
        tenantId: tenant.id,
        leadId: lead.id,
        channel,
        status: "OPEN",
        lastMessageAt: convoCreated,
        createdAt: convoCreated,
      },
    });
    let offsetMin = 0;
    for (const [role, content] of script) {
      offsetMin += 1 + (role === "USER" ? 0 : 1);
      const sentAt = new Date(convoCreated.getTime() + offsetMin * 60_000);
      await db.message.create({
        data: {
          tenantId: tenant.id,
          conversationId: convo.id,
          role,
          content,
          sentAt,
          meta:
            role === "ASSISTANT"
              ? ({ intents: { emergency_detected: false, ready_to_book: /Booked|pencilled/i.test(content) } } as unknown) as Prisma.InputJsonValue
              : Prisma.JsonNull,
        },
      });
    }
    const lastAt = new Date(convoCreated.getTime() + (offsetMin + 1) * 60_000);
    await db.conversation.update({ where: { id: convo.id }, data: { lastMessageAt: lastAt } });
    await db.lead.update({ where: { id: lead.id }, data: { lastMessageAt: lastAt } });
  }

  // ---- reviews ----
  const reviewSpecs: Array<{ rating: number; platform: "GOOGLE" | "FACEBOOK"; content: string; status: "NEW" | "DRAFTED" | "RESPONDED" }> = [
    { rating: 5, platform: "GOOGLE", content: "Dave and the lads rebedded our ridge tiles and sorted a persistent leak two others missed. Tidy, punctual, and the site was left spotless.", status: "RESPONDED" },
    { rating: 5, platform: "GOOGLE", content: "Honest quote, no hard sell. New flat roof on the extension looks superb. Would recommend to anyone in Wycombe.", status: "RESPONDED" },
    { rating: 4, platform: "GOOGLE", content: "Great work on the gutters, turned up when they said they would. Slight delay getting the invoice but no complaints overall.", status: "DRAFTED" },
    { rating: 5, platform: "GOOGLE", content: "Called at 8pm with storm damage, had someone round first thing to make it safe. Life savers.", status: "RESPONDED" },
    { rating: 5, platform: "FACEBOOK", content: "Second time using Apex. Repointed the chimney and replaced fascia — quality job, fair price.", status: "NEW" },
    { rating: 3, platform: "GOOGLE", content: "Workmanship fine but took three calls to get a confirmed date, and the office never rang back when promised.", status: "DRAFTED" },
    { rating: 5, platform: "GOOGLE", content: "From survey to finished reroof in eleven days. The scaffolders and roofers were all polite and hard working.", status: "NEW" },
    { rating: 1, platform: "GOOGLE", content: "Quoted for a full reroof then went quiet for two weeks. Had to chase constantly. Went elsewhere in the end.", status: "NEW" },
    { rating: 4, platform: "FACEBOOK", content: "Good value gutter clear with camera photos before and after. Booking it again next year.", status: "NEW" },
    { rating: 5, platform: "GOOGLE", content: "Moss removed, treated and the driveway pressure-washed too. House looks brand new.", status: "NEW" },
    { rating: 4, platform: "GOOGLE", content: "Fixed the leak above the bay window that a previous firm 'repaired' twice. Finally dry.", status: "NEW" },
    { rating: 2, platform: "GOOGLE", content: "Job was okay but found offcuts in the garden for weeks afterwards and a cracked paving slab was never acknowledged.", status: "NEW" },
    { rating: 5, platform: "GOOGLE", content: "Lovely to deal with from the first phone call. The office assistant even texted arrival windows.", status: "NEW" },
    { rating: 4, platform: "GOOGLE", content: "Fair pricing and a proper 10-year guarantee in writing, which not many round here offer.", status: "NEW" },
  ];
  for (let i = 0; i < reviewSpecs.length; i++) {
    const r = reviewSpecs[i]!;
    const author = `${FIRST[(i * 5 + 2) % FIRST.length]!} ${LAST[(i * 3 + 8) % LAST.length]!}`;
    await db.review.create({
      data: {
        tenantId: tenant.id,
        platform: r.platform,
        authorName: author,
        rating: r.rating,
        content: r.content,
        status: r.status,
        googleReviewId: `gr_${1000 + i}`,
        googleUrl: `https://g.page/r/apex-roofing-hp/review-${1000 + i}`,
        draftResponse:
          r.status === "DRAFTED"
            ? r.rating >= 4
              ? "Thank you so much for the kind words — I'll pass this on to the team. See you next year for the check-up!"
              : "Thank you for the honest feedback, and sorry about the comms — that's on us. We've changed how we confirm dates so it can't happen again. If there's anything outstanding, call the office direct and we'll sort it."
            : null,
        response: r.status === "RESPONDED" ? "Thanks for the great review — it's a pleasure working on homes around High Wycombe." : null,
        respondedAt: r.status === "RESPONDED" ? daysAgo(30 - i, 15) : null,
        reviewedAt: daysAgo(58 - i * 3, 12),
      },
    });
  }

  // ---- appointments ----
  const apptSpecs: Array<{ title: string; inDays: number; status: "SCHEDULED" | "COMPLETED" | "CANCELLED" | "NO_SHOW" }> = [
    { title: "Roof survey — storm damage", inDays: 0, status: "SCHEDULED" },
    { title: "Free quote — flat roof replacement", inDays: 1, status: "SCHEDULED" },
    { title: "Gutter clearance & flush", inDays: 2, status: "SCHEDULED" },
    { title: "Chimney repoint quote", inDays: 4, status: "SCHEDULED" },
    { title: "Reroof follow-up survey", inDays: 7, status: "SCHEDULED" },
    { title: "Leak repair — bay window", inDays: -3, status: "COMPLETED" },
    { title: "Moss removal & treatment", inDays: -6, status: "COMPLETED" },
    { title: "Fascia & soffit replacement", inDays: -9, status: "COMPLETED" },
    { title: "Emergency make-safe callout", inDays: -12, status: "COMPLETED" },
    { title: "Loft insulation survey", inDays: -15, status: "COMPLETED" },
    { title: "Ridge tile rebed quote", inDays: -2, status: "CANCELLED" },
    { title: "Damp investigation", inDays: -8, status: "NO_SHOW" },
  ];
  for (let i = 0; i < apptSpecs.length; i++) {
    const a = apptSpecs[i]!;
    const startsAt = a.inDays >= 0 ? inDays(a.inDays, 9 + (i % 6)) : daysAgo(-a.inDays, 9 + (i % 6));
    await db.appointment.create({
      data: {
        tenantId: tenant.id,
        leadId: leadIds[i]!,
        title: a.title,
        startsAt,
        endsAt: new Date(startsAt.getTime() + 90 * 60_000),
        status: a.status,
        notes: i === 0 ? "Customer reports tiles off after last night's wind — bring ladders and tarpaulin." : null,
      },
    });
  }

  // ---- campaigns ----
  const c1 = await db.campaign.create({
    data: {
      tenantId: tenant.id,
      name: "Spring gutter clearance",
      type: "EMAIL",
      status: "SENT",
      subject: "Don't let your gutters drown your walls",
      body: "Hi {{first_name}}, with the wet weeks ahead we're opening spring gutter-clear slots…",
      recipientCount: 210,
      openCount: 96,
      clickCount: 21,
      sentAt: daysAgo(12, 9),
    },
  });
  const c2 = await db.campaign.create({
    data: {
      tenantId: tenant.id,
      name: "Storm season check-up",
      type: "SMS",
      status: "SENT",
      body: "After the recent winds, we're doing free 10-min roof health checks in {{postcode}} this week. Reply CHECK to book.",
      recipientCount: 148,
      openCount: 0,
      clickCount: 9,
      sentAt: daysAgo(6, 14),
    },
  });
  await db.campaign.create({
    data: {
      tenantId: tenant.id,
      name: "Dormant leads reactivation",
      type: "EMAIL",
      status: "PAUSED",
      subject: "Still thinking about that roof?",
      body: "Hi {{first_name}}, you enquired a while back about {{service_needed}} — we've kept your notes on file…",
      recipientCount: 62,
      openCount: 24,
      clickCount: 3,
      scheduledAt: inDays(3, 10),
    },
  });

  const recipientStatuses = ["SENT", "SENT", "OPENED", "CLICKED", "SENT", "OPENED"] as const;
  for (let i = 0; i < 12; i++) {
    await db.campaignRecipient.create({
      data: {
        tenantId: tenant.id,
        campaignId: i < 8 ? c1.id : c2.id,
        leadId: leadIds[i + 20]!,
        email: i < 8 ? `customer${i}@example.co.uk` : null,
        phone: i < 8 ? null : phoneFor(i + 30),
        status: recipientStatuses[i % recipientStatuses.length]!,
        sentAt: daysAgo(12 - (i % 6), 9),
      },
    });
  }

  // ---- webhook events ----
  await db.webhookEvent.createMany({
    data: [
      { tenantId: tenant.id, source: "twilio", eventId: "ev_001", eventType: "inbound.sms", payload: { from: "+447700900131", body: "Yes Thursday morning works" }, status: "PROCESSED", receivedAt: daysAgo(2, 11), processedAt: daysAgo(2, 11) },
      { tenantId: tenant.id, source: "stripe", eventId: "ev_002", eventType: "invoice.payment_succeeded", payload: { amount: 30000, currency: "gbp" }, status: "PROCESSED", receivedAt: daysAgo(5, 7), processedAt: daysAgo(5, 7) },
      { tenantId: tenant.id, source: "sendgrid", eventId: "ev_003", eventType: "open", payload: { campaign: "spring-gutter-clearance" }, status: "PROCESSED", receivedAt: daysAgo(11, 16), processedAt: daysAgo(11, 16) },
      { tenantId: tenant.id, source: "stripe", eventId: "ev_004", eventType: "customer.subscription.updated", payload: { plan: "GROWTH" }, status: "RECEIVED", receivedAt: daysAgo(1, 13) },
    ],
  });

  // ---- audit logs ----
  const auditSpecs: Array<{ action: string; entity: string; entityId?: string; meta: Record<string, unknown> }> = [
    { action: "auth.login", entity: "user", meta: { email: "demo@apexroofing.com", ip: "192.168.1.24" } },
    { action: "lead.created", entity: "lead", meta: { source: "WEBSITE_CHAT", via: "widget" } },
    { action: "lead.status_changed", entity: "lead", meta: { from: "NEW", to: "BOOKED" } },
    { action: "appointment.created", entity: "appointment", meta: { title: "Roof survey — storm damage" } },
    { action: "review.responded", entity: "review", meta: { platform: "GOOGLE", rating: 5 } },
    { action: "settings.updated", entity: "integration", meta: { provider: "TWILIO", alertPhone: "+447700900000" } },
    { action: "settings.updated", entity: "integration", meta: { provider: "SMTP", alertEmail: "dave@apexroofing.com" } },
    { action: "settings.updated", entity: "tenant", meta: { avgJobValue: 4800 } },
  ];
  for (let i = 0; i < auditSpecs.length; i++) {
    const a = auditSpecs[i]!;
    await db.auditLog.create({
      data: {
        tenantId: tenant.id,
        userId: i === 0 ? dave.id : null,
        action: a.action,
        entity: a.entity,
        entityId: a.entityId ?? null,
        meta: (a.meta as unknown) as Prisma.InputJsonValue,
        createdAt: daysAgo(30 - i * 4, 12),
      },
    });
  }

  const counts = {
    tenants: await db.tenant.count(),
    users: await db.user.count(),
    leads: await db.lead.count(),
    conversations: await db.conversation.count(),
    messages: await db.message.count(),
    reviews: await db.review.count(),
    appointments: await db.appointment.count(),
    campaigns: await db.campaign.count(),
    integrations: await db.integration.count(),
  };
  console.table(counts);
  console.log("Seed complete. Login: demo@apexroofing.com / demo1234 — widget: /widget/CLINK_apex");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
