// Prospect Status text → lead stage, plus the funnel reports built on it.
// Pure (no DB, no network) — used by the sync and by the browser panels.
// Run `npx tsx lib/lead-stages.check.ts` after changing anything here.

import { normalizeStatus, sydneyDay } from "./sheet-parse";

export const LEAD_STAGES = ["NEW", "CONTACTED", "BOOKED", "CANCELLED", "NO_SHOW", "ATTENDED", "QUOTED", "WON", "LOST", "DISQUALIFIED"] as const;
export type LeadStageValue = (typeof LEAD_STAGES)[number];

export const STAGE_LABEL: Record<LeadStageValue, string> = {
  NEW: "New / no update",
  CONTACTED: "Contacted",
  BOOKED: "Booked",
  CANCELLED: "Cancelled",
  NO_SHOW: "No-show",
  ATTENDED: "Attended",
  QUOTED: "Quoted",
  WON: "Won",
  LOST: "Lost",
  DISQUALIFIED: "Disqualified",
};

export const STAGE_COLOR: Record<LeadStageValue, string> = {
  NEW: "var(--text-muted)",
  CONTACTED: "#60a5fa",
  BOOKED: "#facc15",
  CANCELLED: "#fb923c",
  NO_SHOW: "#fb923c",
  ATTENDED: "#a78bfa",
  QUOTED: "#2dd4bf",
  WON: "var(--primary)",
  LOST: "var(--danger)",
  DISQUALIFIED: "var(--danger)",
};

// The funnel, in order. A lead "reached" a step once it has a stage event for it.
export const FUNNEL_STEPS = ["CONTACTED", "BOOKED", "ATTENDED", "QUOTED", "WON"] as const satisfies readonly LeadStageValue[];
export type FunnelStep = (typeof FUNNEL_STEPS)[number];

export type Classified = { stage: LeadStageValue; reached?: FunnelStep };

// Common misspellings seen in real sheets, fixed before matching.
function fixTypos(s: string) {
  return s.replace(/\b(dsiqualifi?ed|disqualifed|disqualfied|disqualifid|disqaulified|dq)\b/g, "disqualified");
}

const has = (s: string, re: RegExp) => re.test(s);
const NOTHING = new Set(["", "n a", "na", "pending", "pending update", "new", "new lead"]);

/**
 * Keyword rules for a Prospect Status cell. First match wins. `undefined` =
 * not recognised: it's reported to the coach as unmapped, never guessed.
 */
export function classifyStatus(raw: string | null | undefined): Classified | undefined {
  const s = fixTypos(normalizeStatus(raw));
  if (NOTHING.has(s)) return { stage: "NEW" };
  if (has(s, /\bwon\b|\bsold\b|\bsigned\b|\bclosed won\b/)) return { stage: "WON" };
  if (has(s, /\blost\b/)) return { stage: "LOST", reached: has(s, /\bquot/) ? "QUOTED" : has(s, /\battended\b/) ? "ATTENDED" : "CONTACTED" };
  if (has(s, /\bquoted\b|\bquote sent\b|\bproposal sent\b/)) return { stage: "QUOTED" };
  if (has(s, /\bdidnt attend\b|\bno show\b/)) return { stage: "NO_SHOW" };
  if (has(s, /\battended\b/)) return { stage: "ATTENDED" };
  if (has(s, /\bcancell?ed\b/)) return { stage: "CANCELLED" };
  if (has(s, /\bbooked\b|\bbooking\b|\bpre consult\b/)) return { stage: "BOOKED" };
  if (has(s, /\bdisqualified\b|\bnot suitable\b|\bprice shopper\b|\btoo far\b|\bspam\b|\bwrong number\b/)) return { stage: "DISQUALIFIED" };
  if (has(s, /\bcontacted\b|\bcalled\b|\bspoke\b|\bfollow ?up\b|\bno answer\b/)) return { stage: "CONTACTED" };
  return undefined;
}

/**
 * One status cell → stage. The coach's saved mapping (normalized value →
 * stage) wins over the keyword rules; a value neither knows is counted in
 * `unmapped` and the lead stays NEW.
 */
export function resolveStatus(raw: string, mapping: Record<string, LeadStageValue>, unmapped: Record<string, number>): Classified {
  const key = normalizeStatus(raw);
  if (mapping[key]) return { stage: mapping[key] };
  const c = classifyStatus(raw);
  if (c) return c;
  unmapped[key] = (unmapped[key] ?? 0) + 1;
  return { stage: "NEW" };
}

/** Funnel steps a stage implies were passed (a quoted lead was contacted, booked and attended). */
export function impliedSteps({ stage, reached }: Classified): FunnelStep[] {
  const upTo = (step: FunnelStep) => FUNNEL_STEPS.slice(0, FUNNEL_STEPS.indexOf(step) + 1);
  switch (stage) {
    case "CONTACTED":
      return upTo("CONTACTED");
    case "BOOKED":
    case "CANCELLED":
    case "NO_SHOW":
      return upTo("BOOKED");
    case "ATTENDED":
      return upTo("ATTENDED");
    case "QUOTED":
      return upTo("QUOTED");
    case "WON":
      return upTo("WON");
    case "LOST":
    case "DISQUALIFIED":
      return reached ? upTo(reached) : [];
    default:
      return [];
  }
}

// ── Reports ─────────────────────────────────────────────────────────────

export type LeadView = {
  id: string;
  name: string | null;
  phone: string | null;
  email: string | null;
  source: string | null;
  campaign: string | null;
  stage: LeadStageValue;
  statusRaw: string | null;
  value: number | null;
  date: string; // ISO — opt-in date from the sheet, else first seen
  events: { stage: LeadStageValue; at: string }[];
  raw: Record<string, string> | null;
};

const reachedStep = (l: LeadView, step: FunnelStep) => l.events.some((e) => e.stage === step);

export type FunnelRow = { step: "LEADS" | FunnelStep; label: string; count: number; fromPrev: number | null };

/** Cohort funnel: of these leads, how many reached each step. */
export function funnel(leads: LeadView[]): FunnelRow[] {
  const rows: FunnelRow[] = [{ step: "LEADS", label: "Leads", count: leads.length, fromPrev: null }];
  for (const step of FUNNEL_STEPS) {
    const count = leads.filter((l) => reachedStep(l, step)).length;
    const prev = rows[rows.length - 1].count;
    rows.push({ step, label: STAGE_LABEL[step], count, fromPrev: prev ? count / prev : null });
  }
  return rows;
}

/** The step with the worst conversion from the one before (needs a few leads to mean anything). */
export function biggestDrop(rows: FunnelRow[]): FunnelRow | null {
  const candidates = rows.filter((r, i) => i > 0 && r.fromPrev !== null && rows[i - 1].count >= 5);
  return candidates.sort((a, b) => a.fromPrev! - b.fromPrev!)[0] ?? null;
}

export type GroupRow = { key: string; leads: number; booked: number; quoted: number; won: number; revenue: number };

/** Leads grouped by source or campaign, biggest first. */
export function groupBy(leads: LeadView[], field: "source" | "campaign"): GroupRow[] {
  const map = new Map<string, GroupRow>();
  for (const l of leads) {
    const key = l[field]?.trim() || "(not set)";
    const row = map.get(key) ?? { key, leads: 0, booked: 0, quoted: 0, won: 0, revenue: 0 };
    row.leads++;
    if (reachedStep(l, "BOOKED")) row.booked++;
    if (reachedStep(l, "QUOTED")) row.quoted++;
    if (reachedStep(l, "WON")) {
      row.won++;
      row.revenue += l.value ?? 0;
    }
    map.set(key, row);
  }
  return [...map.values()].sort((a, b) => b.leads - a.leads);
}

export const monthKey = (iso: string | Date) => sydneyDay(new Date(iso)).slice(0, 7); // "2026-10"

export type MonthRow = { month: string; leads: number; booked: number; attended: number; quoted: number; won: number; revenue: number };

/**
 * Month-by-month activity for the last `n` months (oldest first): leads by
 * opt-in month, each step by the month it was reached, revenue by won month.
 */
export function monthly(leads: LeadView[], n = 12, now = new Date()): MonthRow[] {
  const [y, m] = monthKey(now).split("-").map(Number);
  const months = Array.from({ length: n }, (_, i) => {
    const d = new Date(Date.UTC(y, m - 1 - (n - 1 - i), 1));
    return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
  });
  const rows = new Map(months.map((month) => [month, { month, leads: 0, booked: 0, attended: 0, quoted: 0, won: 0, revenue: 0 }]));
  const stepField = { BOOKED: "booked", ATTENDED: "attended", QUOTED: "quoted", WON: "won" } as const;

  for (const l of leads) {
    const lr = rows.get(monthKey(l.date));
    if (lr) lr.leads++;
    for (const e of l.events) {
      const field = stepField[e.stage as keyof typeof stepField];
      const r = field && rows.get(monthKey(e.at));
      if (!r) continue;
      r[field]++;
      if (e.stage === "WON") r.revenue += l.value ?? 0;
    }
  }
  return months.map((k) => rows.get(k)!);
}

/**
 * Last month cut off at today's day-of-month — the fair comparison for a
 * month that's still in progress (12 days in vs last month's first 12 days).
 */
export function sameDaysLastMonth(leads: LeadView[], now = new Date()): MonthRow {
  const day = Number(sydneyDay(now).slice(8, 10));
  const [prev] = monthly(leads, 2, now);
  const cut = (iso: string) => monthKey(iso) === prev.month && Number(sydneyDay(new Date(iso)).slice(8, 10)) <= day;
  return monthly(
    leads
      .map((l) => ({ ...l, date: cut(l.date) ? l.date : "1970-01-01T00:00:00Z", events: l.events.filter((e) => cut(e.at)) })),
    2,
    now,
  )[0];
}

/** % change, or null when there's nothing to compare against. */
export const pctChange = (now: number, before: number) => (before ? (now - before) / before : null);

export const money = (n: number) => n.toLocaleString("en-AU", { style: "currency", currency: "AUD", maximumFractionDigits: 0 });
export const pct = (n: number | null) => (n === null ? "—" : `${Math.round(n * 100)}%`);

// ── Date ranges (Leads + Breakdown) — Sydney calendar days, "YYYY-MM-DD" ──

export type RangePreset = "month" | "last-month" | "3m" | "6m" | "12m" | "year" | "all" | "custom";
export type DateRange = { preset: RangePreset; from?: string; to?: string }; // from/to only used by "custom"

export const RANGE_PRESETS: { key: RangePreset; label: string }[] = [
  { key: "month", label: "This month" },
  { key: "last-month", label: "Last month" },
  { key: "3m", label: "Last 3 months" },
  { key: "6m", label: "Last 6 months" },
  { key: "12m", label: "Last 12 months" },
  { key: "year", label: "This year" },
  { key: "all", label: "All time" },
  { key: "custom", label: "Custom" },
];

const ymd = (y: number, m: number, d: number) => `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;

/** Same day-of-month `n` months away, clamped to the month's length (31 Mar − 1 month = 28/29 Feb). */
function shiftMonths(day: string, n: number) {
  const [y, m, d] = day.split("-").map(Number);
  const first = new Date(Date.UTC(y, m - 1 + n, 1));
  const last = new Date(Date.UTC(first.getUTCFullYear(), first.getUTCMonth() + 1, 0)).getUTCDate();
  return ymd(first.getUTCFullYear(), first.getUTCMonth() + 1, Math.min(d, last));
}

function dayBefore(day: string) {
  const [y, m, d] = day.split("-").map(Number);
  const t = new Date(Date.UTC(y, m - 1, d - 1));
  return ymd(t.getUTCFullYear(), t.getUTCMonth() + 1, t.getUTCDate());
}

/** A range → inclusive from/to days (null = open-ended). */
export function resolveRange(r: DateRange, now = new Date()): { from: string | null; to: string | null } {
  const today = sydneyDay(now);
  const monthStart = today.slice(0, 8) + "01";
  switch (r.preset) {
    case "month":
      return { from: monthStart, to: today };
    case "last-month":
      return { from: shiftMonths(monthStart, -1), to: dayBefore(monthStart) };
    case "3m":
      return { from: shiftMonths(today, -3), to: today };
    case "6m":
      return { from: shiftMonths(today, -6), to: today };
    case "12m":
      return { from: shiftMonths(today, -12), to: today };
    case "year":
      return { from: today.slice(0, 4) + "-01-01", to: today };
    case "custom": {
      const [from, to] = [r.from || null, r.to || null];
      return from && to && from > to ? { from: to, to: from } : { from, to }; // picked backwards → swap
    }
    default:
      return { from: null, to: null };
  }
}

export const inDateRange = (iso: string, { from, to }: { from: string | null; to: string | null }) => {
  const d = sydneyDay(new Date(iso));
  return (!from || d >= from) && (!to || d <= to);
};
