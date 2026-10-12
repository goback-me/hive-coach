// Run: npx tsx lib/lead-stages.check.ts — throws on the first failure.
import assert from "node:assert/strict";
import { classifyStatus, funnel, groupBy, impliedSteps, monthly, resolveStatus, sameDaysLastMonth, resolveRange, inDateRange, type LeadView } from "./lead-stages";
import { parseSheetDate, sydneyDay } from "./sheet-parse";

// Real-world Prospect Status values
const stage = (raw: string) => classifyStatus(raw)?.stage;
assert.equal(stage(""), "NEW");
assert.equal(stage("N/A"), "NEW");
assert.equal(stage("PENDING UPDATE"), "NEW");
assert.equal(stage("AUTO BOOKED"), "BOOKED");
assert.equal(stage("Attended booking"), "ATTENDED");
assert.equal(stage("Didn't attend"), "NO_SHOW");
assert.equal(stage("QUOTED"), "QUOTED");
assert.equal(stage("WON ✅"), "WON");
assert.equal(stage("QUOTED - LOST"), "LOST");
assert.equal(classifyStatus("QUOTED - LOST")?.reached, "QUOTED");
assert.equal(stage("DSIQUALIFED BUDGET"), "DISQUALIFIED");
assert.equal(stage("DISQUALIFIED - DISTANCE"), "DISQUALIFIED");
assert.equal(stage("📞 Lead contacted"), "CONTACTED");
assert.equal(stage("something weird"), undefined);

// Coach mapping beats the rules; unknown values are counted, lead stays NEW
const unmapped: Record<string, number> = {};
assert.equal(resolveStatus("Hot!!", { hot: "BOOKED" }, unmapped).stage, "BOOKED");
assert.equal(resolveStatus("Maybe later", {}, unmapped).stage, "NEW");
assert.equal(resolveStatus("maybe  later", {}, unmapped).stage, "NEW");
assert.deepEqual(unmapped, { "maybe later": 2 });

// Implied funnel steps
assert.deepEqual(impliedSteps({ stage: "QUOTED" }), ["CONTACTED", "BOOKED", "ATTENDED", "QUOTED"]);
assert.deepEqual(impliedSteps({ stage: "NO_SHOW" }), ["CONTACTED", "BOOKED"]);
assert.deepEqual(impliedSteps({ stage: "DISQUALIFIED" }), []);
assert.deepEqual(impliedSteps({ stage: "LOST", reached: "QUOTED" }), ["CONTACTED", "BOOKED", "ATTENDED", "QUOTED"]);

// Dates: dd/mm/yyyy, never mm/dd
assert.equal(sydneyDay(parseSheetDate("03/04/2026")!), "2026-04-03");

// Reports
const lead = (id: string, date: string, steps: [string, string][], value: number | null = null, source = "Facebook"): LeadView => ({
  id, name: id, phone: null, email: null, source, campaign: null, stage: "NEW", statusRaw: null, value, date, raw: null,
  events: steps.map(([s, at]) => ({ stage: s as LeadView["stage"], at })),
});
const leads = [
  lead("a", "2026-09-05T00:00:00Z", [["CONTACTED", "2026-09-06T00:00:00Z"], ["BOOKED", "2026-09-07T00:00:00Z"], ["WON", "2026-10-02T00:00:00Z"]], 5000),
  lead("b", "2026-09-20T00:00:00Z", [["CONTACTED", "2026-09-21T00:00:00Z"]]),
  lead("c", "2026-10-03T00:00:00Z", [], null, "Google"),
];
const f = funnel(leads);
assert.deepEqual(f.map((r) => r.count), [3, 2, 1, 0, 0, 1]);
assert.equal(f[1].fromPrev, 2 / 3);

const g = groupBy(leads, "source");
assert.deepEqual(g[0], { key: "Facebook", leads: 2, booked: 1, quoted: 0, won: 1, revenue: 5000 });

const months = monthly(leads, 2, new Date("2026-10-15T00:00:00Z"));
assert.deepEqual(months, [
  { month: "2026-09", leads: 2, booked: 1, attended: 0, quoted: 0, won: 0, revenue: 0 },
  { month: "2026-10", leads: 1, booked: 0, attended: 0, quoted: 0, won: 1, revenue: 5000 },
]);

// Month-to-date comparison: Oct 15 vs Sep 1–15 only
const md = sameDaysLastMonth(leads, new Date("2026-10-15T00:00:00Z"));
assert.equal(md.month, "2026-09");
assert.equal(md.leads, 1); // a (Sep 5) counts, b (Sep 20) doesn't
assert.equal(md.booked, 1);

// Date ranges (Sydney days)
const at = new Date("2026-03-31T02:00:00Z"); // 31 Mar, 1pm Sydney
assert.deepEqual(resolveRange({ preset: "month" }, at), { from: "2026-03-01", to: "2026-03-31" });
assert.deepEqual(resolveRange({ preset: "last-month" }, at), { from: "2026-02-01", to: "2026-02-28" });
assert.deepEqual(resolveRange({ preset: "3m" }, at), { from: "2025-12-31", to: "2026-03-31" });
assert.deepEqual(resolveRange({ preset: "6m" }, at), { from: "2025-09-30", to: "2026-03-31" });
assert.deepEqual(resolveRange({ preset: "year" }, at), { from: "2026-01-01", to: "2026-03-31" });
assert.deepEqual(resolveRange({ preset: "all" }, at), { from: null, to: null });
assert.deepEqual(resolveRange({ preset: "custom", from: "2026-03-10", to: "2026-03-01" }, at), { from: "2026-03-01", to: "2026-03-10" });
assert.deepEqual(resolveRange({ preset: "custom", from: "2026-03-10" }, at), { from: "2026-03-10", to: null });
assert.equal(resolveRange({ preset: "month" }, new Date("2026-01-15T00:00:00Z")).from, "2026-01-01");
assert.deepEqual(resolveRange({ preset: "last-month" }, new Date("2026-01-15T00:00:00Z")), { from: "2025-12-01", to: "2025-12-31" });
// 31 Jan 11pm UTC is already 1 Feb in Sydney
assert.equal(inDateRange("2026-01-31T23:00:00Z", { from: "2026-02-01", to: "2026-02-28" }), true);
assert.equal(inDateRange("2026-01-31T10:00:00Z", { from: "2026-02-01", to: null }), false);

console.log("lead-stages: all checks passed");
