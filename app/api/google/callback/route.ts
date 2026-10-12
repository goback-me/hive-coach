import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { encryptToken } from "@/lib/crypto";
import { requireClientAccess } from "@/lib/auth";
import { appOrigin, exchangeCodeForTokens, getGoogleUserEmail, GOOGLE_OAUTH_STATE_COOKIE } from "@/lib/google-sheets";

export async function GET(req: NextRequest) {
  const [expectedState, clientId] = (req.cookies.get(GOOGLE_OAUTH_STATE_COOKIE)?.value ?? "").split(":");
  const client = clientId ? await prisma.client.findUnique({ where: { id: clientId }, select: { id: true, slug: true } }) : null;

  const back = (error?: string) => {
    const path = client ? `/clients/${client.slug}?tab=leads` : "/dashboard";
    const res = NextResponse.redirect(new URL(error ? `${path}&google_error=${encodeURIComponent(error)}` : path, appOrigin()));
    res.cookies.delete({ name: GOOGLE_OAUTH_STATE_COOKIE, path: "/api/google" });
    return res;
  };

  const state = req.nextUrl.searchParams.get("state");
  if (!client || !state || state !== expectedState) return back("Sign-in expired or was tampered with — try connecting again");
  await requireClientAccess(client.id);

  const error = req.nextUrl.searchParams.get("error");
  const code = req.nextUrl.searchParams.get("code");
  if (error) return back(error === "access_denied" ? "Google access wasn't granted" : error);
  if (!code) return back("Google didn't return a sign-in code");

  try {
    const tokens = await exchangeCodeForTokens(code);
    const email = await getGoogleUserEmail(tokens.access_token);

    // Google only sometimes returns a refresh_token — keep this client's existing one rather than losing it.
    const existing = await prisma.googleAccountConnection.findUnique({ where: { clientId: client.id } });
    const refreshToken = tokens.refresh_token ? encryptToken(tokens.refresh_token) : existing?.refreshToken;
    if (!refreshToken) return back("Google didn't return a refresh token — remove The Bakery from your Google account's third-party access and connect again");

    const data = {
      accessToken: encryptToken(tokens.access_token),
      refreshToken,
      expiresAt: new Date(Date.now() + tokens.expires_in * 1000),
      googleEmail: email,
      scope: tokens.scope ?? null,
      connectedAt: new Date(),
    };
    await prisma.googleAccountConnection.upsert({ where: { clientId: client.id }, create: { clientId: client.id, ...data }, update: data });
    return back();
  } catch (err) {
    console.error("Google OAuth callback failed:", err);
    return back(err instanceof Error ? err.message : "Google connection failed");
  }
}
