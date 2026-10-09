import { redirect } from "next/navigation";
import { cache } from "react";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";

export type CurrentUser = {
  id: string;
  clerkId: string;
  email: string;
  name: string;
  role: "COACH" | "CLIENT";
  clientId: string | null;
};

/**
 * Resolves the logged-in Clerk user to our app-side User/role/clientId.
 * `cache()` dedupes this within a single request — safe to call from every
 * page/layout without worrying about extra round trips.
 */
export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const { userId } = await auth();
  if (!userId) return null;

  const appUser = await prisma.user.findUnique({
    where: { clerkId: userId },
  });

  // Logged into Clerk but no matching app profile — treat as unauthenticated.
  // (Shouldn't happen in normal use since accounts are only created via the
  // admin "Create user" flow, which always creates both at once.)
  if (!appUser) return null;

  return {
    id: appUser.id,
    clerkId: appUser.clerkId,
    email: appUser.email,
    name: appUser.name,
    role: appUser.role,
    clientId: appUser.clientId,
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