import { decryptToken } from "@/lib/crypto";

export type MetaInsights = {
  spend: number;
  revenue: number | null; // from purchase action_values, if the client tracks purchase conversions
  impressions: number;
  clicks: number;
  cpm: number;
  ctr: number;
  conversions: number;
  costPerConversion: number | null;
};

const CONVERSION_TYPES = ["lead", "purchase", "complete_registration", "offsite_conversion.fb_pixel_lead"];
const REVENUE_TYPES = ["purchase", "offsite_conversion.fb_pixel_purchase"];

// Shared by the client detail page (server-side, for the top metric cards)
// and the Meta Ads card's own API route — one source of truth for the shape.
export async function getMetaInsights(adAccountId: string, encryptedAccessToken: string): Promise<MetaInsights> {
  const accessToken = decryptToken(encryptedAccessToken);
  const fields = "spend,impressions,clicks,cpm,ctr,actions,action_values,cost_per_action_type";
  const url =
    `https://graph.facebook.com/v21.0/${adAccountId}/insights` +
    `?fields=${fields}&date_preset=last_30d&access_token=${encodeURIComponent(accessToken)}`;

  const res = await fetch(url, { cache: "no-store" });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error?.message ?? "Meta API request failed");

  const row = data.data?.[0];
  if (!row) {
    return { spend: 0, revenue: null, impressions: 0, clicks: 0, cpm: 0, ctr: 0, conversions: 0, costPerConversion: null };
  }

  const conversions = (row.actions ?? [])
    .filter((a: any) => CONVERSION_TYPES.some((t) => a.action_type.includes(t)))
    .reduce((sum: number, a: any) => sum + Number(a.value), 0);

  const revenueEntries = (row.action_values ?? []).filter((a: any) => REVENUE_TYPES.some((t) => a.action_type.includes(t)));
  const revenue = revenueEntries.length ? revenueEntries.reduce((sum: number, a: any) => sum + Number(a.value), 0) : null;

  const costPerConversionEntry = (row.cost_per_action_type ?? []).find((a: any) =>
    CONVERSION_TYPES.some((t) => a.action_type.includes(t))
  );

  return {
    spend: Number(row.spend ?? 0),
    revenue,
    impressions: Number(row.impressions ?? 0),
    clicks: Number(row.clicks ?? 0),
    cpm: Number(row.cpm ?? 0),
    ctr: Number(row.ctr ?? 0),
    conversions,
    costPerConversion: costPerConversionEntry ? Number(costPerConversionEntry.value) : null,
  };
}

export type MetaCampaignSpend = { campaignId: string; campaignName: string; spend: number; impressions: number; clicks: number };

function toMetaDate(d: Date) {
  return d.toISOString().slice(0, 10); // Meta's time_range wants plain YYYY-MM-DD, day granularity anyway
}

// Same account, broken down per campaign (level=campaign) — used only by the
// Leads tab's per-campaign funnel (lib/lead-sync.ts), which needs individual
// campaign spend rather than the account-wide total getMetaInsights returns.
//
// Was previously hardcoded to date_preset=last_30d regardless of what date
// range the Leads tab had selected, so spend never matched the lead counts
// next to it. Now takes the SAME {from, to} the funnel resolved its lead
// counts from, so both numbers cover the identical window — `time_range`
// when a bound is given, `date_preset=maximum` (full account history) when
// dateRange is empty (the "Maximum" preset has no from/to).
export async function getMetaCampaignInsights(
  adAccountId: string,
  encryptedAccessToken: string,
  dateRange?: { from?: Date; to?: Date }
): Promise<MetaCampaignSpend[]> {
  const accessToken = decryptToken(encryptedAccessToken);
  const fields = "campaign_id,campaign_name,spend,impressions,clicks";

  const dateParam =
    dateRange?.from || dateRange?.to
      ? `time_range=${encodeURIComponent(
          JSON.stringify({
            since: toMetaDate(dateRange.from ?? new Date(0)),
            until: toMetaDate(dateRange.to ?? new Date()),
          })
        )}`
      : "date_preset=maximum";

  const url =
    `https://graph.facebook.com/v21.0/${adAccountId}/insights` +
    `?level=campaign&fields=${fields}&${dateParam}&access_token=${encodeURIComponent(accessToken)}`;

  const res = await fetch(url, { cache: "no-store" });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error?.message ?? "Meta API request failed");

  return (data.data ?? []).map((row: any) => ({
    campaignId: row.campaign_id,
    campaignName: row.campaign_name,
    spend: Number(row.spend ?? 0),
    impressions: Number(row.impressions ?? 0),
    clicks: Number(row.clicks ?? 0),
  }));
}