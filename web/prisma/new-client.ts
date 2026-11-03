/**
 * new-client — create a client tenant + owner login in one command,
 * and print the exact widget script line to paste on their website.
 *
 * Usage:
 *   npm run new-client -- "WD Roofing"
 *   npm run new-client -- "WD Roofing" "info@wdroofing.org"     (real email)
 *
 * Run it against whichever database the app uses:
 *   local (laptop demo):     npm run new-client -- "WD Roofing"
 *   production (afterdeploy): DATABASE_URL="<neon-url>" npm run new-client -- "WD Roofing"
 */
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { randomBytes } from "crypto";
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

// --- robust argument parsing (immune to Windows/npm arg-splitting) ---
// Sometimes "WD Roofing" arrives as two args ["WD","Roofing"] (shell/npm
// mangling on Windows). Self-heal: the last argument containing "@" is the
// owner email; all remaining arguments joined with spaces are the name.
const rawArgs = process.argv.slice(2).map((a) => a.trim()).filter((a) => a !== "");
let ownerEmail: string | undefined;
for (let i = rawArgs.length - 1; i >= 0; i--) {
  if (rawArgs[i].includes("@")) {
    ownerEmail = rawArgs[i];
    rawArgs.splice(i, 1);
    break;
  }
}
const nameArg = rawArgs.join(" ").trim();

if (!nameArg) {
  console.log(`
Usage:  npm run new-client -- "Business Name" [owner-email]
        (or double-click NEW-CLIENT.bat - it asks you the same questions)

Example:
  npm run new-client -- "WD Roofing" "info@wdroofing.org"
`);
  process.exit(1);
}

// "WD Roofing" -> "wdroofing"
const slugBase = nameArg
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, "")
  .slice(0, 24);
const name = nameArg.trim();
const password = randomBytes(4).toString("hex"); // 8-char login password
const placeholderEmail = !ownerEmail; // true when no email was given

async function main() {
  // Pick unique tenant id AND slug (CLINK_wdroofing, CLINK_wdroofing2, …)
  let tenantId = `CLINK_${slugBase}`;
  let slug = slugBase;
  let n = 2;
  while (
    (await db.tenant.findUnique({ where: { id: tenantId } })) ||
    (await db.tenant.findUnique({ where: { slug } }))
  ) {
    tenantId = `CLINK_${slugBase}${n}`;
    slug = `${slugBase}${n}`;
    n++;
  }
  let email = ownerEmail || `owner@${slugBase}.local`;
  while (await db.user.findUnique({ where: { email } })) {
    email = `owner${n}@${slugBase}.local`;
    n++;
  }

  const tenant = await db.tenant.create({
    data: {
      id: tenantId,
      name,
      slug: slug,
      brandColor: "#1e293b",
      plan: "STARTER",
      avgJobValue: 4800, // they tune this in Settings later
      isActive: true,
    },
  });

  const passwordHash = await bcrypt.hash(password, 10);
  await db.user.create({
    data: {
      tenantId: tenant.id,
      email,
      passwordHash,
      name: `${name} (Owner)`,
      role: "OWNER",
    },
  });

  const appUrl = (process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000").replace(/\/$/, "");

  console.log(`
──────────────────────────────────────────────────
  CLIENT CREATED: ${tenant.name}
──────────────────────────────────────────────────
  Tenant ID:      ${tenant.id}

  Their dashboard login:
    Email:    ${email}${placeholderEmail ? "   <- placeholder (no email was given)" : ""}
    Password: ${password}
  The email is just the username they type on the login
  page - nothing is emailed to them by this command.
  (They can change it later - give them their login on
   the phone or in person, never in a group chat.)

  THE ONE LINE for their website
  (their web person pastes this before </body>):

    <script src="${appUrl}/widget.js" data-tenant="${tenant.id}"></script>

  Preview their widget:  ${appUrl}/widget/${tenant.id}
──────────────────────────────────────────────────
  NEXT STEPS
  1. In their dashboard Settings: set brand colour,
     alert phone/email, services, avg job value.
  2. Send a test chat on their site -> their phone
     should buzz -> tell them "You're live."
  3. Screenshot every captured lead — that's your
     case study.
──────────────────────────────────────────────────`);
}

main()
  .catch((e) => {
    console.error("Could not create client:", e.message);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
