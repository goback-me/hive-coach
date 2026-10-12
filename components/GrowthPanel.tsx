"use client";

import { money, monthly, pct, pctChange, sameDaysLastMonth, type LeadView, type MonthRow } from "@/lib/lead-stages";

type Metric = { key: keyof Omit<MonthRow, "month">; label: string; format: (n: number) => string };

const METRICS: Metric[] = [
  { key: "leads", label: "Leads", format: String },
  { key: "booked", label: "Booked", format: String },
  { key: "attended", label: "Attended", format: String },
  { key: "quoted", label: "Quoted", format: String },
  { key: "won", label: "Won", format: String },
  { key: "revenue", label: "Revenue", format: money },
];

const monthLabel = (key: string, long = false) => {
  const [y, m] = key.split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString("en-AU", long ? { month: "long", year: "numeric" } : { month: "short" });
};

// Month-on-month numbers from the lead sheet: is the business actually growing?
export default function GrowthPanel({ leads, hasSheet }: { leads: LeadView[]; hasSheet: boolean }) {
  if (!hasSheet) {
    return <p className="card rounded-2xl p-8 text-center text-sm" style={{ color: "var(--text-muted)" }}>Growth fills in once a lead sheet is connected on the Leads tab.</p>;
  }

  const all = monthly(leads, 12);
  // Start the history at the first month with anything in it.
  const first = all.findIndex((r) => METRICS.some((m) => r[m.key] > 0));
  const months = first === -1 ? all.slice(-1) : all.slice(first);
  const current = months[months.length - 1];
  const previous = months[months.length - 2];
  // This month is still running — compare it with the same days of last month, not all of it.
  const lastMonthToDate = previous ? sameDaysLastMonth(leads) : null;
  const dayOfMonth = new Date().getDate();

  const change = (now: number, before: number) => {
    const c = pctChange(now, before);
    if (c === null) return { text: "—", color: "var(--text-muted)" };
    if (c === 0) return { text: "no change", color: "var(--text-muted)" };
    return { text: `${c > 0 ? "▲" : "▼"} ${pct(Math.abs(c))}`, color: c > 0 ? "var(--primary)" : "var(--danger)" };
  };

  // "N months improving" — consecutive completed months where leads went up.
  let streak = 0;
  for (let i = months.length - 2; i > 0 && months[i].leads > months[i - 1].leads; i--) streak++;

  const summary = lastMonthToDate
    ? METRICS.filter((m) => ["leads", "won", "revenue"].includes(m.key))
        .map((m) => {
          const c = pctChange(current[m.key], lastMonthToDate[m.key]);
          return c === null ? null : c === 0 ? `${m.label} level` : `${m.label} ${c > 0 ? "up" : "down"} ${pct(Math.abs(c))}`;
        })
        .filter(Boolean)
    : [];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
          {summary.length ? `${summary.join(", ")} vs the same ${dayOfMonth} days of ${monthLabel(previous.month, true)}` : "Not enough history to compare yet"}

        </p>
        {streak >= 2 && (
          <span className="text-xs font-bold px-2 py-1 rounded" style={{ background: "var(--primary-tint)", color: "var(--primary)" }}>
            {streak} months of lead growth
          </span>
        )}
      </div>

      {/* Just the three headline numbers — the full breakdown is in the table below. */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {METRICS.filter((m) => ["leads", "won", "revenue"].includes(m.key)).map((m) => {
          const c = lastMonthToDate ? change(current[m.key], lastMonthToDate[m.key]) : null;
          return (
            <div key={m.key} className="card rounded-2xl p-5 flex items-end justify-between gap-3">
              <div>
                <p className="text-sm" style={{ color: "var(--text-secondary)" }}>{m.label}</p>
                <p className="font-heading text-3xl font-bold mt-1" style={{ color: "var(--text-primary)" }}>{m.format(current[m.key])}</p>
              </div>
              {c && c.text !== "—" && (
                <span className="text-xs font-bold px-2 py-1 rounded-lg mb-1" style={{ color: c.color, background: "var(--surface-hover)" }}>
                  {c.text}
                </span>
              )}
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Bars title="Leads per month" months={months} metric={METRICS[0]} />
        <Bars title="Revenue won per month" months={months} metric={METRICS[5]} />
      </div>

      <div className="card rounded-2xl overflow-hidden">
        <h3 className="font-heading font-bold text-lg px-6 pt-5 pb-3" style={{ color: "var(--text-primary)" }}>Month by month</h3>
        <table className="w-full text-sm">
          <thead>
            <tr style={{ borderBottom: "1px solid var(--border)" }}>
              <th className="text-left px-4 py-3 font-medium" style={{ color: "var(--text-muted)" }}>Month</th>
              {METRICS.map((m) => (
                <th key={m.key} className="text-right px-4 py-3 font-medium" style={{ color: "var(--text-muted)" }}>{m.label}</th>
              ))}
              <th className="text-right px-4 py-3 font-medium" style={{ color: "var(--text-muted)" }}>Lead → won</th>
            </tr>
          </thead>
          <tbody>
            {[...months].reverse().map((r, i, arr) => {
              const prev = arr[i + 1];
              return (
                <tr key={r.month} style={{ borderBottom: "1px solid var(--border)" }}>
                  <td className="px-4 py-3 font-semibold whitespace-nowrap" style={{ color: "var(--text-primary)" }}>
                    {monthLabel(r.month, true)}
                    {r === current && <span className="ml-2 text-[10px] font-bold" style={{ color: "var(--text-muted)" }}>SO FAR</span>}
                  </td>
                  {METRICS.map((m) => {
                    const best = months.length > 1 && r[m.key] > 0 && r[m.key] === Math.max(...months.map((x) => x[m.key]));
                    const c = prev && r !== current ? pctChange(r[m.key], prev[m.key]) : null; // the running month isn't comparable to a full one
                    return (
                      <td key={m.key} className="px-4 py-3 text-right whitespace-nowrap" style={{ color: "var(--text-secondary)" }}>
                        {best && <span title="Best month" style={{ color: "#facc15" }}>★ </span>}
                        <span style={{ color: "var(--text-primary)" }}>{m.format(r[m.key])}</span>
                        {c !== null && c !== 0 && (
                          <span className="ml-1.5 text-[11px]" style={{ color: c > 0 ? "var(--primary)" : "var(--danger)" }}>
                            {c > 0 ? "▲" : "▼"}
                            {pct(Math.abs(c))}
                          </span>
                        )}
                      </td>
                    );
                  })}
                  <td className="px-4 py-3 text-right" style={{ color: "var(--text-secondary)" }}>{pct(r.leads ? r.won / r.leads : null)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="text-xs" style={{ color: "var(--text-muted)" }}>
        Leads count by the month they came in; booked, quoted and won by the month the status changed. Leads already in the sheet when it was first connected are dated from their opt-in date.
      </p>
    </div>
  );
}

function Bars({ title, months, metric }: { title: string; months: MonthRow[]; metric: Metric }) {
  const max = Math.max(...months.map((r) => r[metric.key]), 1);
  return (
    <div className="card rounded-2xl p-6">
      <h3 className="font-heading font-bold text-lg mb-4" style={{ color: "var(--text-primary)" }}>{title}</h3>
      <div className="flex items-end gap-2 h-40">
        {months.map((r, i) => (
          <div key={r.month} className="flex-1 flex flex-col items-center justify-end h-full gap-1 min-w-0">
            <span className="text-[10px] font-semibold" style={{ color: "var(--text-secondary)" }}>{r[metric.key] ? metric.format(r[metric.key]) : ""}</span>
            <div
              className="w-full rounded-t-md"
              style={{
                height: `${(r[metric.key] / max) * 100}%`,
                minHeight: r[metric.key] ? 4 : 0,
                background: i === months.length - 1 ? "var(--secondary)" : "var(--primary)",
                opacity: i === months.length - 1 ? 0.6 : 1,
              }}
            />
            <span className="text-[10px]" style={{ color: "var(--text-muted)" }}>{monthLabel(r.month)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
