import { randomBytes } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { getGoogleAuthUrl, GOOGLE_OAUTH_STATE_COOKIE } from "@/lib/google-sheets";
import { requireClientAccess } from "@/lib/auth";

// Connects a Google account to ONE client (the client themselves, or their coach on their behalf).
// The cookie holds `state:clientId`; the callback only accepts a code whose state matches it.
export async function GET(req: NextRequest) {
  const clientId = req.nextUrl.searchParams.get("clientId") ?? "";
  await requireClientAccess(clientId);
  const state = randomBytes(32).toString("hex");
  const res = NextResponse.redirect(getGoogleAuthUrl(state));
  res.cookies.set(GOOGLE_OAUTH_STATE_COOKIE, `${state}:${clientId}`, {
    httpOnly: true,
    secure: true, // browsers treat localhost as secure, so dev still works
    sameSite: "lax",
    maxAge: 600,
    path: "/api/google",
  });
  return res;
}
