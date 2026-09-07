import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getValidAccessToken, getSheetValues } from "@/lib/google-sheets";
import { getMetaCampaignInsights } from "@/lib/meta-ads";
import type { LeadStatusValue } from "@/lib/lead-status";
import { LEAD_STATUSES, stageTimestampPatch } from "@/lib/lead-status";

function normalizeHeader(h: string) {
  return h.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

// Sheet headers are messy in practice (line breaks, trailing "?"/spaces) —
// match by keyword rather than exact string. Returns the first header whose
// normalized form contains ANY of the given keywords.
function findColumn(headers: string[], keywords: string[]): number {
  const normalized = headers.map(normalizeHeader);
  for (const kw of keywords) {
    const i = normalized.findIndex((h) => h.includes(kw));
    if (i !== -1) return i;
  }
  return -1;
}

function normalizeIdentity(v: string) {
  return v.toLowerCase().replace(/[^a-z0-9]+/g, "");
}

function parseMoney(v: string | undefined): number | null {
  if (!v) return null;
  const n = Number(v.replace(/[^0-9.-]/g, ""));
  return Number.isFinite(n) && n !== 0 ? n : null;
}

export type SyncSummary = { total: number; created: number; updated: number };

// Pulls the client's assigned sheet (read-only, always) and upserts each row
// into the Lead table. A lead whose status has been manually set in the app
// (statusManuallySetAt) never has its status overwritten by a later sync —
// every other field still refreshes normally.
export async function syncLeadsFromSheet(clientId: string): Promise<SyncSummary> {
  const sheet = await prisma.clientSheet.findUnique({ where: { clientId } });
  if (!sheet) throw new Error("No Google Sheet assigned to this client yet — connect one on the Leads page first.");

  const accessToken = await getValidAccessToken();
  const { headers, rows } = await getSheetValues(accessToken, sheet.spreadsheetId, sheet.sheetName);

  const statusMapping = (sheet.statusMapping as Record<string, LeadStatusValue> | null) ?? {};
  const statusColIdx = sheet.statusColumn ? headers.indexOf(sheet.statusColumn) : -1;

  const nameIdx = findColumn(headers, ["name"]);
  const phoneIdx = findColumn(headers, ["phone"]);
  const emailIdx = findColumn(headers, ["email"]);
  const sourceIdx = findColumn(headers, ["source"]);
  const campaignIdx = findColumn(headers, ["campaign"]);
  const adsetIdx = findColumn(headers, ["adset", "ad set"]);
  const revenueIdx = findColumn(headers, ["revenue generated", "revenue"]);
  const quoteIdx = findColumn(headers, ["quote value", "quote"]);

  let created = 0;
  let updated = 0;

  for (const row of rows) {
    const name = nameIdx !== -1 ? row[nameIdx] : "";
    const phone = phoneIdx !== -1 ? row[phoneIdx] : "";
    const email = emailIdx !== -1 ? row[emailIdx] : "";
    // Every row needs SOME identity to match across syncs — skip fully blank rows.
    const identitySource = email || phone || name;
    if (!identitySource?.trim()) continue;
    const externalKey = normalizeIdentity(`${email}|${phone}|${name}`);

    const rawStatus = statusColIdx !== -1 ? row[statusColIdx] : "";
    const mappedStatus: LeadStatusValue = LEAD_STATUSES.includes(statusMapping[rawStatus] as LeadStatusValue)
      ? (statusMapping[rawStatus] as LeadStatusValue)
      : "NEW_LEAD";

    const value = parseMoney(revenueIdx !== -1 ? row[revenueIdx] : undefined) ?? parseMoney(quoteIdx !== -1 ? row[quoteIdx] : undefined);

    // Everything else — every header not otherwise mapped — goes into `raw`
    // for display only, keyed by its actual header text.
    const mappedIdx = new Set([nameIdx, phoneIdx, emailIdx, sourceIdx, campaignIdx, adsetIdx, revenueIdx, quoteIdx, statusColIdx]);
    const raw: Record<string, string> = {};
    headers.forEach((h, i) => {
      if (!mappedIdx.has(i) && h) raw[h] = row[i] ?? "";
    });

    const existing = await prisma.lead.findFirst({ where: { clientId, externalKey } });

    const baseData = {
      name: name || null,
      phone: phone || null,
      email: email || null,
      source: sourceIdx !== -1 ? row[sourceIdx] || null : null,
      campaign: campaignIdx !== -1 ? row[campaignIdx] || null : null,
      adset: adsetIdx !== -1 ? row[adsetIdx] || null : null,
      value,
      raw,
      lastSyncedAt: new Date(),
    };

    if (existing) {
      // Respect a manual override — only apply the sheet's status (and the
      // stage timestamps that come with it) if nobody has manually touched
      // this lead's status yet.
      const statusPatch = existing.statusManuallySetAt
        ? {}
        : { status: mappedStatus, ...stageTimestampPatch(existing, mappedStatus) };
      await prisma.lead.update({
        where: { id: existing.id },
        data: { ...baseData, ...statusPatch },
      });
      updated++;
    } else {
      const emptyStages = { chaseUpAt: null, contactedAt: null, closedAt: null };
      await prisma.lead.create({
        data: { clientId, externalKey, status: mappedStatus, ...stageTimestampPatch(emptyStages, mappedStatus), ...baseData },
      });
      created++;
    }
  }

  return { total: rows.length, created, updated };
}

export type CampaignFunnelRow = {
  campaign: string;
  total: number;
  contacted: number; // CLIENT_CONTACTED or later (WON/LOST/DISQUALIFIED all imply contact happened)
  won: number;
  lostOrDisqualified: number;
  spend: number | null;
  spendSource: "meta" | "manual" | null;
};

// Groups this client's synced leads by campaign and joins in spend — Meta's
// live per-campaign breakdown if connected, else the matching AdCampaign row
// already in our DB (matched by name), so the funnel still shows a cost
// figure even without a Meta connection.
//
// Uses groupBy (one small aggregate query, a few rows back) instead of
// findMany (which was pulling every lead — including its `raw` JSON blob —
// into Node just to count them; at 1000+ leads that's what was slowing the
// page down and shipping a huge payload to the browser for zero reason,
// since only the aggregated counts below ever reach the client).
export async function getClientCampaignFunnel(
  clientId: string,
  dateRange?: { from?: Date; to?: Date }
): Promise<CampaignFunnelRow[]> {
  const createdAt =
    dateRange?.from || dateRange?.to
      ? { ...(dateRange.from ? { gte: dateRange.from } : {}), ...(dateRange.to ? { lt: dateRange.to } : {}) }
      : undefined;

  const [grouped, client, adCampaigns] = await Promise.all([
    prisma.lead.groupBy({ by: ["campaign", "status"], where: { clientId, ...(createdAt ? { createdAt } : {}) }, _count: true }),
    prisma.client.findUnique({ where: { id: clientId } }),
    prisma.adCampaign.findMany({ where: { clientId } }),
  ]);

  let metaSpendByName: Map<string, number> | null = null;
  if (client?.metaAdAccountId && client.metaAccessToken) {
    try {
      const rows = await getMetaCampaignInsights(client.metaAdAccountId, client.metaAccessToken, dateRange);
      metaSpendByName = new Map(rows.map((r) => [r.campaignName.toLowerCase().trim(), r.spend]));
    } catch {
      metaSpendByName = null; // Meta connected but the call failed — fall back silently
    }
  }

  const manualSpendByName = new Map(adCampaigns.map((c) => [c.name.toLowerCase().trim(), Number(c.spend)]));

  const byCampaign = new Map<string, { campaign: string; total: number; contacted: number; won: number; lostOrDisqualified: number }>();
  for (const g of grouped) {
    const key = g.campaign?.trim() || "Unattributed";
    if (!byCampaign.has(key)) byCampaign.set(key, { campaign: key, total: 0, contacted: 0, won: 0, lostOrDisqualified: 0 });
    const row = byCampaign.get(key)!;
    row.total += g._count;
    if (g.status !== "NEW_LEAD" && g.status !== "CHASE_UP") row.contacted += g._count;
    if (g.status === "WON") row.won += g._count;
    if (g.status === "LOST" || g.status === "DISQUALIFIED") row.lostOrDisqualified += g._count;
  }

  return Array.from(byCampaign.values()).map((row) => {
    const key = row.campaign.toLowerCase().trim();
    const metaSpend = metaSpendByName?.get(key);
    const manualSpend = manualSpendByName.get(key);
    return {
      ...row,
      spend: metaSpend ?? manualSpend ?? null,
      spendSource: metaSpend !== undefined ? "meta" : manualSpend !== undefined ? "manual" : null,
    };
  });
}

export type LeadTimeSeriesPoint = {
  date: string;
  received: number;
  chaseUp: number;
  contacted: number;
  won: number;
  lostOrDisqualified: number;
};

type StageField = "createdAt" | "chaseUpAt" | "contactedAt" | "closedAt";

async function bucketCounts(
  clientId: string,
  field: StageField,
  granularity: "day" | "week" | "month",
  from: Date,
  to: Date,
  statuses?: LeadStatusValue[]
): Promise<{ bucket: Date; count: number }[]> {
  const col = Prisma.raw(`"${field}"`);
  const statusClause = statuses?.length ? Prisma.sql`AND status::text IN (${Prisma.join(statuses)})` : Prisma.empty;

  const rows = await prisma.$queryRaw<{ bucket: Date; count: bigint }[]>`
    SELECT date_trunc(${granularity}, ${col}) AS bucket, COUNT(*)::bigint AS count
    FROM "Lead"
    WHERE "clientId" = ${clientId}
      AND ${col} IS NOT NULL
      AND ${col} >= ${from}
      AND ${col} < ${to}
      ${statusClause}
    GROUP BY bucket
    ORDER BY bucket
  `;
  return rows.map((r) => ({ bucket: r.bucket, count: Number(r.count) }));
}

// Each series buckets by ITS OWN relevant date field (received by createdAt,
// contacted by contactedAt, etc.) — not all by createdAt — so the chart
// shows when each stage actually happened, not just when the lead first
// arrived. Granularity adapts to the window so a "Maximum" view doesn't try
// to plot years of daily points; "Maximum" itself has no lower bound, so it
// looks back 2 years for the chart specifically (the funnel/lead list still
// show truly all-time totals — this cap is chart-readability only).
export async function getClientLeadTimeSeries(
  clientId: string,
  dateRange?: { from?: Date; to?: Date }
): Promise<LeadTimeSeriesPoint[]> {
  const to = dateRange?.to ?? new Date();
  const twoYearsBack = new Date(to.getFullYear() - 2, to.getMonth(), to.getDate());
  const from = dateRange?.from ?? twoYearsBack;

  const spanDays = (to.getTime() - from.getTime()) / 86400000;
  const granularity: "day" | "week" | "month" = spanDays <= 31 ? "day" : spanDays <= 180 ? "week" : "month";

  const [received, chaseUp, contacted, won, lost] = await Promise.all([
    bucketCounts(clientId, "createdAt", granularity, from, to),
    bucketCounts(clientId, "chaseUpAt", granularity, from, to),
    bucketCounts(clientId, "contactedAt", granularity, from, to),
    bucketCounts(clientId, "closedAt", granularity, from, to, ["WON"]),
    bucketCounts(clientId, "closedAt", granularity, from, to, ["LOST", "DISQUALIFIED"]),
  ]);

  const byDate = new Map<string, LeadTimeSeriesPoint>();
  function ensure(d: Date) {
    const k = d.toISOString();
    if (!byDate.has(k)) byDate.set(k, { date: k, received: 0, chaseUp: 0, contacted: 0, won: 0, lostOrDisqualified: 0 });
    return byDate.get(k)!;
  }
  for (const r of received) ensure(r.bucket).received = r.count;
  for (const r of chaseUp) ensure(r.bucket).chaseUp = r.count;
  for (const r of contacted) ensure(r.bucket).contacted = r.count;
  for (const r of won) ensure(r.bucket).won = r.count;
  for (const r of lost) ensure(r.bucket).lostOrDisqualified = r.count;

  return Array.from(byDate.values()).sort((a, b) => a.date.localeCompare(b.date));
}
