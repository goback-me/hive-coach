import { prisma } from "@/lib/prisma";
import { getDashboardKpis } from "@/lib/needs-action";
import { getRevenueTrend } from "@/lib/dashboard-data";
import Link from "next/link";

export const dynamic = "force-dynamic";

const SEVERITY_STYLE: Record<string, { color: string; icon: string }> = {
  danger: { color: "var(--danger)", icon: "refresh" },
  success: { color: "var(--primary)", icon: "refresh" },
  muted: { color: "var(--text-muted)", icon: "schedule" },
};

const STATUS_STYLE: Record<string, { bg: string; color: string; label: string }> = {
  ACTIVE: { bg: "rgba(163,230,53,0.15)", color: "var(--primary)", label: "Active" },
  ONBOARDING: { bg: "rgba(250,204,21,0.15)", color: "#facc15", label: "Onboarding" },
  CHURNED: { bg: "rgba(248,113,113,0.15)", color: "var(--danger)", label: "Churned" },
};

export default async function DashboardPage() {
  const kpis = await getDashboardKpis();
  const trend = await getRevenueTrend(12);
  const items = await prisma.needsActionItem.findMany({
    orderBy: [{ severity: "asc" }, { computedAt: "desc" }],
    take: 8,
    include: { client: { select: { slug: true } } },
  });
  const clients = await prisma.client.findMany({
    orderBy: { name: "asc" },
    include: { program: true },
    take: 12,
  });

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
    <div className="p-10 max-w-[1400px] mx-auto space-y-8">
      <div>
        <h1 className="font-heading text-3xl font-bold" style={{ color: "var(--text-primary)" }}>Dashboard</h1>
        <p style={{ color: "var(--text-secondary)" }}>Welcome back. Here's your overview.</p>
      </div>

      <div className="grid grid-cols-4 gap-4">
        <KpiCard icon="payments" label="Revenue this month" value={`$${kpis.revenueThisMonth.toLocaleString()}`} delta="+8%" />
        <KpiCard icon="diversity_3" label="Active clients" value={String(kpis.activeClients)} sub={`${kpis.totalClients} total`} />
        <KpiCard icon="event_available" label="Sessions this month" value={String(kpis.sessionsThisMonth)} />
        <KpiCard icon="trending_up" label="Avg. retention" value={kpis.totalClients > 0 ? `${Math.round((kpis.activeClients / kpis.totalClients) * 100)}%` : "0%"} />
      </div>

      <div>
        <div className="text-xs font-bold tracking-widest mb-3" style={{ color: "var(--text-secondary)" }}>NEEDS ACTION</div>
        <div className="grid grid-cols-4 gap-3">
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

      <div>
        <div className="text-sm font-semibold mb-3" style={{ color: "var(--text-primary)" }}>Clients</div>
        <div className="grid grid-cols-3 gap-3">
          {clients.map((client) => {
            const s = STATUS_STYLE[client.status] ?? STATUS_STYLE.ONBOARDING;
            return (
              <Link key={client.id} href={`/clients/${client.slug}`} className="card rounded-xl p-4 block hover:shadow-md transition-shadow">
                <div className="flex justify-between items-start mb-2">
                  <div className="flex items-center gap-2">
                    <div className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold" style={{ background: "var(--primary-tint)", color: "var(--primary)" }}>
                      {client.name.slice(0, 1).toUpperCase()}
                    </div>
                    <div>
                      <p className="font-semibold text-sm" style={{ color: "var(--text-primary)" }}>{client.name}</p>
                      <p className="text-xs" style={{ color: "var(--text-secondary)" }}>{client.program?.name ?? "No program"}</p>
                    </div>
                  </div>
                  <span className="w-2 h-2 rounded-full mt-1" style={{ background: s.color }} />
                </div>
                <div className="flex justify-between items-end mt-3">
                  <div>
                    <p className="text-[10px]" style={{ color: "var(--text-muted)" }}>Revenue this month</p>
                    <p className="font-bold" style={{ color: "var(--text-primary)" }}>$0</p>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-1 rounded-full" style={{ background: s.bg, color: s.color }}>
                    {s.label}
                  </span>
                </div>
              </Link>
            );
          })}
          {clients.length === 0 && <p style={{ color: "var(--text-secondary)" }}>No clients yet.</p>}
        </div>
      </div>
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
