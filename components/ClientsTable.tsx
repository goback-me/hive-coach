import Link from "next/link";
import { money } from "@/lib/lead-stages";
import type { ClientRow } from "@/lib/coach-overview";

const STATUS_STYLE: Record<string, { bg: string; color: string; label: string }> = {
  ACTIVE: { bg: "rgba(163,230,53,0.15)", color: "var(--primary)", label: "Active" },
  ONBOARDING: { bg: "rgba(250,204,21,0.15)", color: "#ca8a04", label: "Onboarding" },
  CHURNED: { bg: "rgba(248,113,113,0.15)", color: "var(--danger)", label: "Churned" },
};

const dash = <span style={{ color: "var(--text-muted)" }}>—</span>;

// Dashboard: one row per active client — onboarding, this month's leads/wins, tasks and the last weekly call.
export default function ClientsTable({ rows }: { rows: ClientRow[] }) {
  const now = Date.now();
  return (
    <section className="card rounded-2xl overflow-hidden">
      <div className="px-6 pt-6 pb-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="icon-chip w-8 h-8" style={{ background: "var(--primary-tint)" }}>
            <span className="material-symbols-outlined text-[16px]" style={{ color: "var(--primary)" }}>diversity_3</span>
          </span>
          <h2 className="font-heading font-bold text-lg" style={{ color: "var(--text-primary)" }}>Clients</h2>
          {rows.length > 0 && (
            <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ background: "var(--surface-hover)", color: "var(--text-secondary)" }}>{rows.length}</span>
          )}
        </div>
        <Link href="/clients" className="text-xs font-semibold" style={{ color: "var(--primary)" }}>
          View all →
        </Link>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr style={{ borderBottom: "1px solid var(--border)" }}>
              {["Client", "Status", "Onboarding", "Leads", "Won", "Revenue won", "Tasks", "Last weekly call"].map((h, i) => (
                <th key={h} className={`px-4 py-3 text-xs font-bold whitespace-nowrap ${i > 2 && i < 7 ? "text-right" : "text-left"}`} style={{ color: "var(--text-muted)" }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const s = STATUS_STYLE[r.status] ?? STATUS_STYLE.ONBOARDING;
              const weeklyAge = r.lastWeekly ? Math.floor((now - new Date(r.lastWeekly).getTime()) / 86400000) : null;
              return (
                <tr key={r.id} className="transition-colors hover:bg-[var(--surface-hover)]" style={{ borderBottom: "1px solid var(--border)" }}>
                  <td className="px-4 py-3">
                    <Link href={`/clients/${r.slug}`} className="flex items-center gap-3">
                      <span className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold shrink-0" style={{ background: "var(--primary-tint)", color: "var(--primary)" }}>
                        {r.name.slice(0, 1).toUpperCase()}
                      </span>
                      <span className="min-w-0">
                        <span className="block font-semibold truncate" style={{ color: "var(--text-primary)" }}>{r.name}</span>
                        <span className="block text-xs truncate" style={{ color: "var(--text-muted)" }}>{r.program ?? "No program"}</span>
                      </span>
                    </Link>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-[11px] font-bold px-2 py-1 rounded-full" style={{ background: s.bg, color: s.color }}>{s.label}</span>
                  </td>
                  <td className="px-4 py-3">
                    {r.onboardingPct === null ? (
                      dash
                    ) : (
                      <div className="flex items-center gap-2 min-w-[110px]">
                        <div className="h-1.5 flex-1 rounded-full overflow-hidden" style={{ background: "var(--surface-hover)" }}>
                          <div className="h-full rounded-full" style={{ width: `${r.onboardingPct}%`, background: r.onboardingPct === 100 ? "var(--primary)" : "#facc15" }} />
                        </div>
                        <span className="text-xs w-8 text-right" style={{ color: "var(--text-secondary)" }}>{r.onboardingPct}%</span>
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right" style={{ color: "var(--text-primary)" }}>{r.leads || dash}</td>
                  <td className="px-4 py-3 text-right" style={{ color: "var(--text-primary)" }}>{r.won || dash}</td>
                  <td className="px-4 py-3 text-right font-semibold" style={{ color: "var(--text-primary)" }}>{r.revenueWon ? money(r.revenueWon) : dash}</td>
                  <td className="px-4 py-3 text-right whitespace-nowrap">
                    {r.openTasks ? (
                      <Link href={`/clients/${r.slug}?tab=tasks`} style={{ color: r.overdueTasks ? "var(--danger)" : "var(--text-primary)" }}>
                        {r.openTasks} open{r.overdueTasks ? ` · ${r.overdueTasks} overdue` : ""}
                      </Link>
                    ) : (
                      dash
                    )}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap" style={{ color: weeklyAge !== null && weeklyAge < 10 ? "var(--text-secondary)" : "var(--danger)" }}>
                    {weeklyAge === null ? "Never" : weeklyAge === 0 ? "Today" : `${weeklyAge}d ago`}
                  </td>
                </tr>
              );
            })}
            {rows.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center" style={{ color: "var(--text-muted)" }}>No active clients yet.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
