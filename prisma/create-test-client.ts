// Creates a test client plus a client login for it, so you can sign in as a
// client in production and see the portal. Safe to re-run (reuses what exists).
//
// Usage (on the server):
//   docker compose exec -T app npx tsx prisma/create-test-client.ts
//   TEST_CLIENT_EMAIL=test@thebakery.academy docker compose exec -T -e TEST_CLIENT_EMAIL app npx tsx prisma/create-test-client.ts
//
// Requires CLERK_SECRET_KEY (.env). Prints a one-time password and a magic login link.

import { randomBytes } from "crypto";
import { createClerkClient } from "@clerk/backend";
import { prisma } from "../lib/prisma";

const CLIENT_NAME = process.env.TEST_CLIENT_NAME || "Test Client";
const EMAIL = (process.env.TEST_CLIENT_EMAIL || "test-client@thebakery.academy").toLowerCase();
const APP_URL = process.env.APP_URL || "https://thebakery.academy";

async function main() {
  if (!process.env.CLERK_SECRET_KEY) throw new Error("Set CLERK_SECRET_KEY in .env first.");
  const clerk = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY });

  const slug = CLIENT_NAME.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
  const client =
    (await prisma.client.findUnique({ where: { slug } })) ??
    (await prisma.client.create({ data: { name: CLIENT_NAME, slug, status: "ACTIVE", description: "Test account — safe to delete" } }));
  console.log(`Client: ${client.name} (/clients/${client.slug})`);

  let user = await prisma.user.findUnique({ where: { email: EMAIL } });
  let password: string | null = null;
  if (!user) {
    const existing = (await clerk.users.getUserList({ emailAddress: [EMAIL] })).data[0];
    let clerkId = existing?.id;
    if (!clerkId) {
      password = randomBytes(15).toString("base64url"); // 20 chars — Clerk wants 15+
      const created = await clerk.users.createUser({
        emailAddress: [EMAIL],
        password,
        username: `testclient_${randomBytes(3).toString("hex")}`,
        firstName: "Test",
        lastName: "Client",
      });
      clerkId = created.id;
    }
    user = await prisma.user.create({ data: { clerkId, email: EMAIL, name: "Test Client", role: "CLIENT", clientId: client.id } });
  } else if (user.clientId !== client.id) {
    throw new Error(`${EMAIL} already exists and isn't linked to ${CLIENT_NAME} — pick another TEST_CLIENT_EMAIL.`);
  }

  const { token } = await clerk.signInTokens.createSignInToken({ userId: user.clerkId, expiresInSeconds: 60 * 60 * 24 * 7 });
  console.log(`Login: ${EMAIL}${password ? `  password: ${password}  (shown once)` : " (already existed — password unchanged)"}`);
  console.log(`Magic link (single use, 7 days): ${APP_URL}/login/magic?ticket=${encodeURIComponent(token)}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
