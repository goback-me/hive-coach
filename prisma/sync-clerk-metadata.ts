// One-off backfill: copies role/clientId/clientSlug from the Prisma User table
// into each Clerk user's publicMetadata. Accounts created before middleware.ts
// started reading role from Clerk don't have it and get /login?error=no-access.
// Safe to re-run.
//
// Usage: npm run sync-clerk-metadata

import { createClerkClient } from "@clerk/backend";
import { prisma } from "../lib/prisma";

async function main() {
  const clerk = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY });
  const users = await prisma.user.findMany({ include: { client: { select: { slug: true } } } });

  for (const u of users) {
    try {
      await clerk.users.updateUserMetadata(u.clerkId, {
        publicMetadata: {
          role: u.role,
          name: u.name,
          clientId: u.role === "CLIENT" ? u.clientId : null,
          clientSlug: u.role === "CLIENT" ? u.client?.slug ?? null : null,
        },
      });
      console.log(`✔ ${u.email} (${u.role})`);
    } catch (e) {
      console.error(`✘ ${u.email}:`, (e as { errors?: { message?: string }[] })?.errors?.[0]?.message ?? e);
    }
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
