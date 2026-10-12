// Re-links every app login to the Clerk instance in CLERK_SECRET_KEY.
//
// Each User row stores a Clerk user id, and those ids only exist in one Clerk
// instance. After switching instances (e.g. production → development keys, or
// back again), run this once: it matches every login by email in the current
// instance — creating the Clerk user if it's missing — and updates the stored id.
// Never deletes anything. Safe to re-run.
//
//   docker compose exec -T app npx tsx prisma/relink-clerk.ts < /dev/null

import { randomBytes } from "crypto";
import { createClerkClient } from "@clerk/backend";
import { prisma } from "../lib/prisma";

const APP_URL = process.env.APP_URL || "https://thebakery.academy";

async function main() {
  if (!process.env.CLERK_SECRET_KEY) throw new Error("Set CLERK_SECRET_KEY in .env first.");
  const clerk = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY });
  const instance = process.env.CLERK_SECRET_KEY.startsWith("sk_live_") ? "PRODUCTION" : "DEVELOPMENT";
  console.log(`Clerk instance: ${instance}\n`);

  const users = await prisma.user.findMany({ orderBy: [{ role: "asc" }, { email: "asc" }] });
  for (const u of users) {
    let clerkUser = (await clerk.users.getUserList({ emailAddress: [u.email] })).data[0];
    let password: string | null = null;
    if (!clerkUser) {
      password = randomBytes(15).toString("base64url"); // 20 chars — Clerk wants 15+
      const [firstName, ...rest] = u.name.split(" ");
      clerkUser = await clerk.users.createUser({
        emailAddress: [u.email],
        password,
        username: u.email.split("@")[0].replace(/[^a-zA-Z0-9_]/g, "").slice(0, 40) + "_" + randomBytes(2).toString("hex"),
        firstName,
        lastName: rest.join(" ") || undefined,
      });
    }
    if (clerkUser.id !== u.clerkId) await prisma.user.update({ where: { id: u.id }, data: { clerkId: clerkUser.id } });

    const { token } = await clerk.signInTokens.createSignInToken({ userId: clerkUser.id, expiresInSeconds: 60 * 60 * 24 * 7 });
    console.log(`${u.role.padEnd(6)} ${u.email}`);
    console.log(`       ${password ? `created in Clerk — password: ${password}` : "already in Clerk — password unchanged"}`);
    console.log(`       magic link (single use, 7 days): ${APP_URL}/login/magic?ticket=${encodeURIComponent(token)}\n`);
  }
  console.log(`Done — ${users.length} login(s) linked to the ${instance} Clerk instance.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
