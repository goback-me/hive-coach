import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
// Legal pages must load signed out — Meta and Google reviewers open them directly.
const isPublicRoute = createRouteMatcher(["/login(.*)", "/refer(.*)", "/api/cron(.*)", "/privacy", "/terms", "/data-deletion"]); // cron checks its own secret

export default clerkMiddleware(async (auth, req) => {
  if (!isPublicRoute(req)) {
    await auth.protect();
  }
});

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};