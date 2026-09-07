import { redirect } from "next/navigation";
import { cache } from "react";
import { auth } from "@clerk/nextjs/server";

export type CurrentUser = {
  id: string; // Clerk user id — app-side User.id is looked up separately where needed (e.g. Settings)
  clerkId: string;
  email: string;
  name: string;
  role: "COACH" | "CLIENT";
  clientId: string | null;
  clientSlug: string | null;
};

// Adapted from Hive OS: role/clientId/clientSlug live in Clerk's
// publicMetadata (set the moment an account is created — see
// lib/actions.ts createUser — and mirrored by the Clerk webhook,
// app/api/webhooks/clerk/route.ts, if it's ever changed from the Clerk
// dashboard directly). This avoids a Prisma round trip on every request;
// middleware.ts is what actually redirects unauthenticated/unassigned
// visitors away, this is the last-line guard for pages/actions it
// doesn't cover. `cache()` dedupes this within a single request.
export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const { userId, sessionClaims } = await auth();
  if (!userId) return null;

  const metadata = (sessionClaims?.publicMetadata ?? {}) as {
    role?: "COACH" | "CLIENT";
    clientId?: string;
    clientSlug?: string;
    name?: string;
  };

  // Logged into Clerk but no role assigned yet — treat as unauthenticated.
  // (Shouldn't happen in normal use: accounts are only created via the
  // Settings "Create user" flow, which sets metadata at creation time.)
  if (!metadata.role) return null;

  const email = sessionClaims?.email as string | undefined;
  const name =
    metadata.name ||
    [sessionClaims?.firstName, sessionClaims?.lastName].filter(Boolean).join(" ") ||
    email ||
    "Unnamed";

  return {
    id: userId,
    clerkId: userId,
    email: email ?? "",
    name,
    role: metadata.role,
    clientId: metadata.clientId ?? null,
    clientSlug: metadata.clientSlug ?? null,
  };
});

/** Require any logged-in user. Redirects to /login if not authenticated. */
export async function requireUser(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

/** Require a COACH (admin). Sends clients back to their own dashboard instead of leaking a 403. */
export async function requireCoach(): Promise<CurrentUser> {
  const user = await requireUser();
  if (user.role !== "COACH") redirect("/dashboard");
  return user;
}

/**
 * Require access to a specific client's data. A COACH can access any client;
 * a CLIENT may only access their own. Call this at the top of every page/
 * action that takes a clientId or client slug.
 */
export async function requireClientAccess(clientId: string): Promise<CurrentUser> {
  const user = await requireUser();
  if (user.role === "COACH") return user;
  if (user.clientId !== clientId) redirect("/dashboard");
  return user;
}

/**
 * Prisma `where` fragment that scopes any client-scoped model to what the
 * current user is allowed to see: `{}` (no restriction) for a COACH, or
 * `{ clientId: <their own id> }` for a CLIENT. Spread this into `where`
 * clauses, e.g. `prisma.task.findMany({ where: { ...scope, status: "DONE" } })`.
 */
export function clientScopeWhere(user: CurrentUser): { clientId?: string } {
  return user.role === "COACH" ? {} : { clientId: user.clientId ?? "__none__" };
}
