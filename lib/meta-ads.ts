import { unstable_cache } from "next/cache";
import { decryptToken } from "@/lib/crypto";

// Meta Marketing API (adapted from Hive OS). Each client connects their own
// ad account with an access token that has ads_read.
const GRAPH = "https://graph.facebook.com/v21.0";

type GraphRow = Record<string, unknown> & { actions?: { action_type: string; value: string }[] };

// Every page of a Graph API list — Meta pages at 25 rows by default.
async function metaGetAll(url: string): Promise<GraphRow[]> {
  const out: GraphRow[] = [];
  for (let next: string | undefined = url; next; ) {
    const res: Response = await fetch(next, { cache: "no-store" });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || data.error) throw new Error(friendlyError(data?.error));
    out.push(...(data.data ?? []));
    next = data.paging?.next;
  }
  return out;
}

function friendlyError(err?: { message?: string; code?: number; error_subcode?: number }) {
  if (!err) return "Meta didn't respond — try again in a minute";
  if (err.code === 190) return "Meta says that access token isn't valid (wrong, expired or revoked) — generate a new one and connect again";
  if (err.code === 100 || err.code === 803) return "Meta couldn't find that ad account — check the ID (act_…) and that the token can see it";
  if (err.code === 200 || err.code === 10) return "That token doesn't have permission to read this ad account (it needs ads_read)";
  if (err.code === 17 || err.code === 4 || err.code === 613) return "Meta is rate-limiting requests — try again in a few minutes";
  return err.message ?? "Meta API request failed";
}

export function normalizeAccountId(raw: string) {
  const digits = raw.trim().replace(/^act_/i, "");
  return /^\d+$/.test(digits) ? `act_${digits}` : null;
}

/** Checks the token can read the account before it's saved. */
export async function verifyMetaAccount(adAccountId: string, accessToken: string) {
  const res = await fetch(`${GRAPH}/${adAccountId}?fields=name,currency&access_token=${encodeURIComponent(accessToken)}`, { cache: "no-store" });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || data.error) throw new Error(friendlyError(data?.error));
  return { name: (data.name as string) ?? adAccountId, currency: (data.currency as string) ?? "AUD" };
}

// Meta reports leads under a few action types depending on the ad setup.
function metaLeads(row: GraphRow) {
  const by = new Map((row.actions ?? []).map((a) => [a.action_type, Number(a.value)]));
  return by.get("lead") ?? by.get("onsite_conversion.lead_grouped") ?? by.get("offsite_conversion.fb_pixel_lead") ?? 0;
}

export type MetaCampaignRow = { id: string; name: string; status: string; spend: number; impressions: number; clicks: number; leads: number };
export type MetaReport = {
  currency: string;
  totals: { spend: number; impressions: number; clicks: number; leads: number };
  campaigns: MetaCampaignRow[];
  series: { label: string; spend: number }[]; // daily for short ranges, monthly for long ones
};

/** since/until: inclusive "YYYY-MM-DD" (account time zone); both null = the account's full history. */
async function fetchMetaReport(adAccountId: string, encryptedToken: string, since: string | null, until: string | null): Promise<MetaReport> {
  const token = encodeURIComponent(decryptToken(encryptedToken));
  const today = new Date().toISOString().slice(0, 10);
  const range = since || until ? `time_range=${encodeURIComponent(JSON.stringify({ since: since ?? "2015-01-01", until: until ?? today }))}` : "date_preset=maximum";
  const days = since ? (Date.parse(until ?? today) - Date.parse(since)) / 86_400_000 : Infinity;
  const increment = days <= 92 ? "1" : "monthly";

  const [list, insights, series, account] = await Promise.all([
    metaGetAll(`${GRAPH}/${adAccountId}/campaigns?fields=id,name,effective_status&limit=500&access_token=${token}`),
    metaGetAll(`${GRAPH}/${adAccountId}/insights?level=campaign&fields=campaign_id,spend,impressions,clicks,actions&${range}&limit=500&access_token=${token}`),
    metaGetAll(`${GRAPH}/${adAccountId}/insights?fields=spend&${range}&time_increment=${increment}&limit=500&access_token=${token}`),
    fetch(`${GRAPH}/${adAccountId}?fields=currency&access_token=${token}`, { cache: "no-store" }).then((r) => r.json()),
  ]);

  const byId = new Map(insights.map((r) => [String(r.campaign_id), r]));
  const campaigns = list
    .map((c) => {
      const i = byId.get(String(c.id));
      return {
        id: String(c.id),
        name: String(c.name),
        status: String(c.effective_status ?? "UNKNOWN"),
        spend: Number(i?.spend ?? 0),
        impressions: Number(i?.impressions ?? 0),
        clicks: Number(i?.clicks ?? 0),
        leads: i ? metaLeads(i) : 0,
      };
    })
    // Campaigns with no activity in the range only clutter the table — unless they're running now.
    .filter((c) => c.spend > 0 || c.impressions > 0 || c.status === "ACTIVE")
    .sort((a, b) => b.spend - a.spend);

  const totals = campaigns.reduce(
    (t, c) => ({ spend: t.spend + c.spend, impressions: t.impressions + c.impressions, clicks: t.clicks + c.clicks, leads: t.leads + c.leads }),
    { spend: 0, impressions: 0, clicks: 0, leads: 0 },
  );

  return {
    currency: account?.currency ?? "AUD",
    totals,
    campaigns,
    series: series.map((r) => ({ label: String(r.date_start), spend: Number(r.spend ?? 0) })),
  };
}

// Meta is slow and only has day granularity — cached 5 minutes per account + range,
// so switching date ranges back and forth doesn't wait on Meta again.
export const getMetaReport = unstable_cache(fetchMetaReport, ["meta-report-v1"], { revalidate: 300 });

// ── "Connect with Facebook" (OAuth) ───────────────────────────────────────
// Needs a Meta app with Facebook Login: META_APP_ID, META_APP_SECRET and
// META_REDIRECT_URI (https://<your domain>/api/meta/callback, registered in the app).
export const META_OAUTH_STATE_COOKIE = "meta_oauth_state";

export function metaOAuthConfigured() {
  return !!(process.env.META_APP_ID && process.env.META_APP_SECRET && process.env.META_REDIRECT_URI);
}

export function metaAuthUrl(state: string) {
  const params = new URLSearchParams({
    client_id: process.env.META_APP_ID!,
    redirect_uri: process.env.META_REDIRECT_URI!,
    state,
    response_type: "code",
    // Business apps (Facebook Login for Business) take a configuration id instead of scopes.
    ...(process.env.META_CONFIG_ID ? { config_id: process.env.META_CONFIG_ID } : { scope: "ads_read" }),
  });
  return `https://www.facebook.com/v21.0/dialog/oauth?${params.toString()}`;
}

/** Code → a long-lived (~60 day) user token. */
export async function exchangeMetaCode(code: string): Promise<{ token: string; expiresIn: number | null }> {
  const base = { client_id: process.env.META_APP_ID!, client_secret: process.env.META_APP_SECRET! };
  const short = await fetch(`${GRAPH}/oauth/access_token?${new URLSearchParams({ ...base, redirect_uri: process.env.META_REDIRECT_URI!, code })}`, { cache: "no-store" }).then((r) => r.json());
  if (short.error || !short.access_token) throw new Error(friendlyError(short.error));
  const long = await fetch(`${GRAPH}/oauth/access_token?${new URLSearchParams({ ...base, grant_type: "fb_exchange_token", fb_exchange_token: short.access_token })}`, { cache: "no-store" }).then((r) => r.json());
  // If the swap fails the short-lived token still works for now — use it rather than failing the connect.
  return long.access_token ? { token: long.access_token, expiresIn: long.expires_in ?? null } : { token: short.access_token, expiresIn: short.expires_in ?? null };
}

export type MetaAdAccount = { id: string; name: string; currency: string; active: boolean };

/** Every ad account the token's user can see. */
export async function listMetaAdAccounts(accessToken: string): Promise<MetaAdAccount[]> {
  const rows = await metaGetAll(`${GRAPH}/me/adaccounts?fields=id,name,currency,account_status&limit=200&access_token=${encodeURIComponent(accessToken)}`);
  return rows
    .map((a) => ({ id: String(a.id), name: String(a.name ?? a.id), currency: String(a.currency ?? ""), active: Number(a.account_status) === 1 }))
    .sort((a, b) => Number(b.active) - Number(a.active) || a.name.localeCompare(b.name));
}
