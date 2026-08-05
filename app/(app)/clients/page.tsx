import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/actions";
import AddClientModal from "./AddClientModal";

const STATUS_STYLE: Record<string, { dot: string; bg: string; color: string; label: string }> = {
  ACTIVE: { dot: "var(--primary)", bg: "rgba(163,230,53,0.15)", color: "var(--primary)", label: "Active" },
  ONBOARDING: { dot: "#facc15", bg: "rgba(250,204,21,0.15)", color: "#facc15", label: "Onboarding" },
  CHURNED: { dot: "var(--danger)", bg: "rgba(248,113,113,0.15)", color: "var(--danger)", label: "Churned" },
};

export default async function ClientsPage() {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const [clients, programs] = await Promise.all([
    prisma.client.findMany({
      orderBy: { name: "asc" },
      include: { program: true },
    }),
    prisma.program.findMany({ orderBy: { name: "asc" } }),
  ]);

  const revenueByClient = await Promise.all(
    clients.map((c) =>
      prisma.payment.aggregate({
        _sum: { amountDue: true },
        where: { clientId: c.id, status: "PAID", paidDate: { gte: monthStart } },
      })
    )
  );

  return (
    <div className="p-10 max-w-[1500px] mx-auto">
      <div className="flex justify-between items-start mb-8">
        <div>
          <h1 className="font-heading text-3xl font-bold" style={{ color: "var(--text-primary)" }}>Clients</h1>
          <p style={{ color: "var(--text-secondary)" }}>
            All clients across {programs.map((p) => p.name).join(", ")}.
          </p>
        </div>
        <div className="flex gap-3">
          <button
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold"
            style={{ border: "1px solid var(--border-strong)", color: "var(--text-secondary)" }}
          >
            <span className="material-symbols-outlined text-[18px]">check_box_outline_blank</span>
            Bulk Edit
          </button>
          <AddClientModal action={createClient} programs={programs} />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {clients.map((client, i) => {
          const s = STATUS_STYLE[client.status] ?? STATUS_STYLE.ONBOARDING;
          const revenue = Number(revenueByClient[i]._sum.amountDue ?? 0);
          return (
            <Link key={client.id} href={`/clients/${client.slug}`} className="card rounded-xl p-4 block hover:shadow-md transition-shadow relative">
              <span
                className="absolute top-4 right-4 w-2.5 h-2.5 rounded-full"
                style={{ background: s.dot }}
              />
              <div className="flex items-start gap-3 mb-4">
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold shrink-0"
                  style={{ background: "var(--primary-tint)", color: "var(--primary)" }}
                >
                  {client.name.slice(0, 1).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <p className="font-semibold text-sm" style={{ color: "var(--text-primary)" }}>{client.name}</p>
                  <p className="text-xs truncate" style={{ color: "var(--text-secondary)" }}>
                    {client.description || "\u00A0"}
                  </p>
                </div>
              </div>
              <div className="flex justify-between items-end">
                <div>
                  <p className="text-[10px]" style={{ color: "var(--text-muted)" }}>Revenue this month</p>
                  <p className="font-bold text-sm" style={{ color: "var(--text-primary)" }}>
                    ${revenue.toLocaleString()}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-bold" style={{ color: s.color }}>{s.label}</p>
                  <p className="text-[10px]" style={{ color: "var(--text-muted)" }}>{client.program?.name ?? "—"}</p>
                </div>
              </div>
            </Link>
          );
        })}
        {clients.length === 0 && <p style={{ color: "var(--text-secondary)" }}>No clients yet.</p>}
      </div>
    </div>
  );
}
