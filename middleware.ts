import { NextResponse, type NextFetchEvent, type NextRequest } from "next/server";
import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

const isPublicRoute = createRouteMatcher(["/login(.*)", "/refer(.*)", "/api/cron(.*)"]); // cron checks its own secret

// The homepage and legal pages skip Clerk entirely: Meta's crawler must get a plain 200,
// and Clerk (a dev instance especially) answers cookie-less browser requests with a 307 handshake.
// These pages never call auth().
const OPEN_PAGES = new Set(["/", "/privacy", "/terms", "/data-deletion"]);

const clerk = clerkMiddleware(async (auth, req) => {
  if (!isPublicRoute(req)) {
    await auth.protect();
  }
});

export default function middleware(req: NextRequest, ev: NextFetchEvent) {
  if (OPEN_PAGES.has(req.nextUrl.pathname)) return NextResponse.next();
  return clerk(req, ev);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
