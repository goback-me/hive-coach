import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { encryptToken } from "@/lib/crypto";
import { requireClientAccess } from "@/lib/auth";
import { exchangeMetaCode, listMetaAdAccounts, META_OAUTH_STATE_COOKIE, metaErrorInfo } from "@/lib/meta-ads";

// Facebook sends the user back here (inside the popup). We save the login,
// auto-pick the ad account when there's only one, then close the popup and
// tell the Ads tab to refresh. In the same-tab flow (phones) it goes straight back to the Ads tab.
function finish(slug: string | null, error?: string, page = false) {
  const target = slug ? `/clients/${slug}?tab=ads${error ? `&meta_error=${encodeURIComponent(error)}` : ""}` : "/dashboard";
  const payload = JSON.stringify({ type: "meta-connected", error: error ?? null });
  const html = `<!doctype html><meta charset="utf-8"><title>Facebook</title>
<body style="font-family:system-ui;padding:24px;color:#444">${page ? "Taking you back…" : error ? "Couldn't connect — you can close this window." : "Connected — you can close this window."}
<script>
  // Facebook's login page cuts window.opener (COOP), so tell the Ads tab over a same-origin
  // BroadcastChannel, then close. If the browser won't let us close, land on the Ads tab here instead.
  var msg = ${payload};
  if (${page}) location.replace(${JSON.stringify(target)});
  try { new BroadcastChannel("meta-connect").postMessage(msg); } catch (e) {}
  try { if (window.opener) window.opener.postMessage(msg, location.origin); } catch (e) {}
  window.close();
  setTimeout(function () { location.replace(${JSON.stringify(target)}); }, 400);
</script></body>`;
  const res = new NextResponse(html, { headers: { "content-type": "text/html; charset=utf-8" } });
  res.cookies.delete({ name: META_OAUTH_STATE_COOKIE, path: "/api/meta" });
  return res;
}

export async function GET(req: NextRequest) {
  const [expectedState, clientId, mode] = (req.cookies.get(META_OAUTH_STATE_COOKIE)?.value ?? "").split(":");
  const page = mode === "page";
  const client = clientId ? await prisma.client.findUnique({ where: { id: clientId }, select: { id: true, slug: true } }) : null;
  const state = req.nextUrl.searchParams.get("state");
  if (!client || !state || state !== expectedState) return finish(client?.slug ?? null, "The Facebook sign-in expired — try connecting again", page);
  await requireClientAccess(client.id);

  if (req.nextUrl.searchParams.get("error")) return finish(client.slug, "Facebook access wasn't granted", page);
  const code = req.nextUrl.searchParams.get("code");
  if (!code) return finish(client.slug, "Facebook didn't return a sign-in code", page);

  try {
    const { token } = await exchangeMetaCode(code);
    const accounts = await listMetaAdAccounts(token);
    if (!accounts.length) return finish(client.slug, "That Facebook login can't see any ad accounts — use the login that manages the ads", page);
    const only = accounts.length === 1 ? accounts[0] : null;
    await prisma.client.update({
      where: { id: client.id },
      // More than one account → the Ads tab asks which one.
      data: { metaAccessToken: encryptToken(token), metaAdAccountId: only?.id ?? null, metaAccountName: only?.name ?? null },
    });
    revalidatePath("/clients", "layout");
    return finish(client.slug, undefined, page);
  } catch (e) {
    return finish(client.slug, metaErrorInfo(e).error, page); // logs anything unexpected; only a safe message reaches the page
  }
}
