import { clerkClient } from "@clerk/nextjs/server";

/**
 * Server-only Clerk backend client (uses CLERK_SECRET_KEY under the hood).
 * This bypasses normal auth checks entirely — it only exists to let a COACH
 * create/delete logins for clients (there's no self-signup in this app).
 *
 * Only import this from Server Actions / Route Handlers that have already
 * verified the caller is a COACH via lib/auth.ts.
 */
export async function getClerkAdminClient() {
  return clerkClient();
}