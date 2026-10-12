"use client";

import { biggestDrop, funnel, groupBy, money, pct, STAGE_LABEL, type GroupRow, type LeadView } from "@/lib/lead-stages";

// Where leads drop out, and which sources/campaigns actually turn into work.
export default function BreakdownPanel({ leads }: { leads: LeadView[] }) {
  if (!leads.length) {
    return <p className="card rounded-2xl p-8 text-center text-sm" style={{ color: "var(--text-muted)" }}>No leads in this period.</p>;
  }

  const rows = funnel(leads);
  const drop = biggestDrop(rows);
  const max = rows[0].count || 1;
  const won = rows[rows.length - 1].count;
  const revenue = leads.filter((l) => l.events.some((e) => e.stage === "WON")).reduce((sum, l) => sum + (l.value ?? 0), 0);
  const lost = leads.filter((l) => l.stage === "LOST").length;
  const dq = leads.filter((l) => l.stage === "DISQUALIFIED").length;
  const noShows = leads.filter((l) => l.stage === "NO_SHOW").length;
  const noUpdate = leads.filter((l) => l.stage === "NEW").length;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Stat label="Lead → won" value={pct(rows[0].count ? won / rows[0].count : null)} />
        <Stat label="Revenue won" value={money(revenue)} />
        <Stat label="No update yet" value={String(noUpdate)} hint={noUpdate ? "Status still blank / pending" : undefined} />
        <Stat label="Lost · DQ · no-show" value={`${lost} · ${dq} · ${noShows}`} />
      </div>

      <div className="card rounded-2xl p-6">
        <h3 className="font-heading font-bold text-lg mb-4" style={{ color: "var(--text-primary)" }}>Funnel</h3>
        <div className="space-y-3">
          {rows.map((r) => (
            <div key={r.step} className="grid grid-cols-[110px_1fr_90px] items-center gap-3 text-sm">
              <span style={{ color: "var(--text-secondary)" }}>{r.label}</span>
              <div className="h-7 rounded-lg overflow-hidden" style={{ background: "var(--surface-hover)" }}>
                <div
                  className="h-full rounded-lg flex items-center px-2 text-xs font-bold"
                  style={{ width: `${Math.max((r.count / max) * 100, r.count ? 4 : 0)}%`, background: drop?.step === r.step ? "var(--danger)" : "var(--primary)", color: "#0d0d0b" }}
                >
                  {r.count}
                </div>
              </div>
              <span className="text-right text-xs" style={{ color: drop?.step === r.step ? "var(--danger)" : "var(--text-muted)" }}>
                {r.fromPrev === null ? "" : `${pct(r.fromPrev)} of prev`}
              </span>
            </div>
          ))}
        </div>
        {drop && (
          <p className="mt-5 text-sm rounded-lg px-4 py-3" style={{ background: "var(--danger-tint)", color: "var(--text-primary)" }}>
            <b>Biggest drop:</b> only {pct(drop.fromPrev)} of leads make it to <b>{drop.label.toLowerCase()}</b>. That&apos;s the step to work on first.
          </p>
        )}
      </div>

      <GroupTable title="By source" rows={groupBy(leads, "source")} />
      <GroupTable title="By campaign" rows={groupBy(leads, "campaign")} />
      <p className="text-xs" style={{ color: "var(--text-muted)" }}>
        Steps count leads that reached them at any point — a {STAGE_LABEL.QUOTED.toLowerCase()} lead also counts as contacted, booked and attended.
      </p>
    </div>
  );
}

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="card rounded-2xl p-5">
      <p className="text-xs" style={{ color: "var(--text-secondary)" }}>{label}</p>
      <p className="font-heading text-2xl font-bold mt-1" style={{ color: "var(--text-primary)" }}>{value}</p>
      {hint && <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>{hint}</p>}
    </div>
  );
}

function GroupTable({ title, rows }: { title: string; rows: GroupRow[] }) {
  // Nothing to compare when the sheet has no such column.
  if (rows.length < 2 && rows[0]?.key === "(not set)") return null;
  return (
    <div className="card rounded-2xl overflow-hidden">
      <h3 className="font-heading font-bold text-lg px-6 pt-5 pb-3" style={{ color: "var(--text-primary)" }}>{title}</h3>
      <table className="w-full text-sm">
        <thead>
          <tr style={{ borderBottom: "1px solid var(--border)" }}>
            {["", "Leads", "Booked", "Quoted", "Won", "Lead → won", "Revenue"].map((h, i) => (
              <th key={i} className={`px-4 py-3 font-medium ${i ? "text-right" : "text-left"}`} style={{ color: "var(--text-muted)" }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.key} style={{ borderBottom: "1px solid var(--border)" }}>
              <td className="px-4 py-3 font-semibold" style={{ color: "var(--text-primary)" }}>{r.key}</td>
              <td className="px-4 py-3 text-right" style={{ color: "var(--text-secondary)" }}>{r.leads}</td>
              <td className="px-4 py-3 text-right" style={{ color: "var(--text-secondary)" }}>{r.booked}</td>
              <td className="px-4 py-3 text-right" style={{ color: "var(--text-secondary)" }}>{r.quoted}</td>
              <td className="px-4 py-3 text-right" style={{ color: "var(--text-secondary)" }}>{r.won}</td>
              <td className="px-4 py-3 text-right font-semibold" style={{ color: "var(--text-primary)" }}>{pct(r.leads ? r.won / r.leads : null)}</td>
              <td className="px-4 py-3 text-right" style={{ color: "var(--text-secondary)" }}>{money(r.revenue)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
