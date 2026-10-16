import { randomBytes } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { requireClientAccess } from "@/lib/auth";
import { META_OAUTH_STATE_COOKIE, metaAuthUrl, metaOAuthConfigured } from "@/lib/meta-ads";

// "Connect with Facebook" for one client (opened in a popup from the Ads tab).
// The cookie holds `state:clientId:mode`; the callback only accepts a code whose state matches.
// mode "page" = same-tab flow (phones), so the callback redirects back instead of closing a popup.
export async function GET(req: NextRequest) {
  const clientId = req.nextUrl.searchParams.get("clientId") ?? "";
  await requireClientAccess(clientId);
  if (!metaOAuthConfigured()) return new NextResponse("Facebook login isn't set up yet (META_APP_ID / META_APP_SECRET / META_REDIRECT_URI).", { status: 503 });

  const state = randomBytes(32).toString("hex");
  const mode = req.nextUrl.searchParams.get("mode") === "page" ? "page" : "popup";
  const res = NextResponse.redirect(metaAuthUrl(state));
  res.cookies.set(META_OAUTH_STATE_COOKIE, `${state}:${clientId}:${mode}`, { httpOnly: true, secure: true, sameSite: "lax", maxAge: 600, path: "/api/meta" });
  return res;
}
