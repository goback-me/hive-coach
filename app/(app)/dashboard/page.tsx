import { prisma } from "@/lib/prisma";
import { computeNeedsAction, getDashboardKpis } from "@/lib/needs-action";
import { getRevenueTrend } from "@/lib/dashboard-data";
import { requireUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import ClientsTable from "@/components/ClientsTable";
import { getClientRows } from "@/lib/coach-overview";

export const dynamic = "force-dynamic";

const SEVERITY_STYLE: Record<string, { color: string; icon: string }> = {
  danger: { color: "var(--danger)", icon: "refresh" },
  success: { color: "var(--primary)", icon: "refresh" },
  muted: { color: "var(--text-muted)", icon: "schedule" },
};

export default async function DashboardPage() {
  const user = await requireUser();
  // This dashboard is an agency-wide overview (all clients, all revenue) —
  // a client login gets sent straight to their own portal instead.
  if (user.role === "CLIENT") {
    const client = await prisma.client.findUnique({ where: { id: user.clientId ?? "" }, select: { slug: true } });
    redirect(client ? `/clients/${client.slug}` : "/login");
  }

  // ponytail: rebuilt on every dashboard load (a few queries per client) — move to the cron if client count grows into the hundreds
  await computeNeedsAction();
  const kpis = await getDashboardKpis();
  const trend = await getRevenueTrend(12);
  // Urgent first, then upcoming calls, then nudges (alphabetical severity would put calls last and cut them off).
  const RANK: Record<string, number> = { danger: 0, success: 1, muted: 2 };
  const items = (await prisma.needsActionItem.findMany({ include: { client: { select: { slug: true } } } }))
    .sort((a, b) => (RANK[a.severity] ?? 3) - (RANK[b.severity] ?? 3))
    .slice(0, 8);
  const clientRows = await getClientRows();

  const lastMonth = trend.at(-2)?.revenue ?? 0;
  const delta = lastMonth > 0 ? Math.round(((kpis.revenueThisMonth - lastMonth) / lastMonth) * 100) : null;
  const revenueDelta = delta === null ? undefined : `${delta >= 0 ? "+" : ""}${delta}%`;
  const maxRev = Math.max(...trend.map((t) => t.revenue), 1);
  const chartW = 1000;
  const chartH = 220;
  const points = trend.map((t, i) => {
    const x = (i / (trend.length - 1 || 1)) * chartW;
    const y = chartH - (t.revenue / maxRev) * (chartH - 20) - 10;
    return { x, y, ...t };
  });
  const linePath = points.map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");

  return (
    <div className="p-4 md:p-10 max-w-[1400px] mx-auto space-y-8">
      <div>
        <h1 className="font-heading text-3xl font-bold" style={{ color: "var(--text-primary)" }}>Dashboard</h1>
        <p style={{ color: "var(--text-secondary)" }}>Welcome back. Here's your overview.</p>
      </div>

      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 md:gap-4">
        <KpiCard icon="payments" label="Revenue this month" value={`$${kpis.revenueThisMonth.toLocaleString()}`} delta={revenueDelta} />
        <KpiCard icon="diversity_3" label="Active clients" value={String(kpis.activeClients)} sub={`${kpis.totalClients} total`} />
        <KpiCard icon="event_available" label="Sessions this month" value={String(kpis.sessionsThisMonth)} />
        <KpiCard icon="trending_up" label="Avg. retention" value={kpis.totalClients > 0 ? `${Math.round((kpis.activeClients / kpis.totalClients) * 100)}%` : "0%"} />
      </div>

      <div>
        <div className="text-xs font-bold tracking-widest mb-3" style={{ color: "var(--text-secondary)" }}>NEEDS ACTION</div>
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
          {items.length === 0 && (
            <div className="card rounded-xl p-4 text-center col-span-4" style={{ color: "var(--text-secondary)" }}>
              Nothing needs attention right now.
            </div>
          )}
          {items.map((item) => {
            const s = SEVERITY_STYLE[item.severity] ?? SEVERITY_STYLE.muted;
            return (
              <Link key={item.id} href={`/clients/${item.client.slug}`} className="card rounded-xl p-3 flex items-center gap-3 hover:shadow-md transition-shadow">
                <span className="material-symbols-outlined text-[18px] shrink-0" style={{ color: s.color }}>{s.icon}</span>
                <div className="min-w-0">
                  <p className="font-semibold text-sm truncate" style={{ color: "var(--text-primary)" }}>{item.title}</p>
                  <p className="text-xs truncate" style={{ color: s.color }}>{item.description}</p>
                </div>
              </Link>
            );
          })}
        </div>
      </div>

      <div className="card rounded-2xl p-6">
        <div className="text-sm font-semibold mb-4" style={{ color: "var(--text-primary)" }}>Revenue (Last 12 Months)</div>
        <div className="relative" style={{ height: chartH + 30 }}>
          <svg width="100%" height={chartH} viewBox={`0 0 ${chartW} ${chartH}`} preserveAspectRatio="none">
            <path d={linePath} fill="none" stroke="var(--secondary)" strokeWidth="2.5" />
            {points.map((p, i) => (
              <circle key={i} cx={p.x} cy={p.y} r="4" fill="var(--secondary)" />
            ))}
          </svg>
          <div className="flex justify-between mt-2 text-[10px]" style={{ color: "var(--text-muted)" }}>
            {trend.map((t) => <span key={t.label}>{t.label}</span>)}
          </div>
        </div>
      </div>

      <ClientsTable rows={clientRows} />
    </div>
  );
}

function KpiCard({ icon, label, value, delta, sub }: { icon: string; label: string; value: string; delta?: string; sub?: string }) {
  return (
    <div className="card rounded-2xl p-5">
      <div className="flex justify-between items-start mb-2">
        <p className="text-sm" style={{ color: "var(--text-secondary)" }}>{label}</p>
        <span className="material-symbols-outlined text-[18px]" style={{ color: "var(--text-muted)" }}>{icon}</span>
      </div>
      <div className="flex items-end justify-between">
        <p className="font-heading text-2xl font-bold" style={{ color: "var(--text-primary)" }}>{value}</p>
        {delta && <span className="text-xs font-bold" style={{ color: "var(--primary)" }}>{delta}</span>}
      </div>
      {sub && <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>{sub}</p>}
    </div>
  );
}