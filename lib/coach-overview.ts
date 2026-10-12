import { prisma } from "./prisma";
import { monthKey } from "./lead-stages";

export type ClientRow = {
  id: string;
  name: string;
  slug: string;
  program: string | null;
  status: string;
  onboardingPct: number | null;
  leads: number;
  won: number;
  revenueWon: number;
  openTasks: number;
  overdueTasks: number;
  lastWeekly: string | null;
};

/**
 * One row per active client for the dashboard table (a handful of queries,
 * not one per client). Leads/wins are this Sydney month; clients with the
 * most overdue tasks come first.
 */
export async function getClientRows(now = new Date()): Promise<ClientRow[]> {
  const thisMonth = monthKey(now);
  const since = new Date(now.getTime() - 32 * 86400000); // over-fetch, filtered by Sydney month below
  const today = now.toISOString().slice(0, 10);

  const [clients, stepCount, openTasks, recentLeads, wins, weekly] = await Promise.all([
    prisma.client.findMany({
      where: { isActive: true },
      select: {
        id: true,
        name: true,
        slug: true,
        status: true,
        program: { select: { name: true } },
        _count: { select: { onboardingSteps: { where: { completedAt: { not: null } } } } },
      },
    }),
    prisma.onboardingStepTemplate.count(),
    prisma.task.findMany({ where: { status: { not: "DONE" }, clientId: { not: null } }, select: { clientId: true, dueDate: true } }),
    prisma.lead.findMany({
      where: { deletedAt: null, client: { isActive: true }, OR: [{ optInAt: { gte: since } }, { optInAt: null, createdAt: { gte: since } }] },
      select: { clientId: true, optInAt: true, createdAt: true },
    }),
    prisma.leadStageEvent.findMany({
      where: { stage: "WON", at: { gte: since }, lead: { deletedAt: null, client: { isActive: true } } },
      select: { at: true, lead: { select: { clientId: true, value: true } } },
    }),
    prisma.weeklyUpdate.groupBy({ by: ["clientId"], _max: { callDate: true } }),
  ]);

  const inMonth = (d: Date) => monthKey(d) === thisMonth;
  const monthWins = wins.filter((w) => inMonth(w.at));

  const rows = clients.map((c) => {
    const tasks = openTasks.filter((t) => t.clientId === c.id);
    const clientWins = monthWins.filter((w) => w.lead.clientId === c.id);
    const last = weekly.find((w) => w.clientId === c.id)?._max.callDate ?? null;
    return {
      id: c.id,
      name: c.name,
      slug: c.slug,
      program: c.program?.name ?? null,
      status: c.status,
      onboardingPct: stepCount ? Math.round((c._count.onboardingSteps / stepCount) * 100) : null,
      leads: recentLeads.filter((l) => l.clientId === c.id && inMonth(l.optInAt ?? l.createdAt)).length,
      won: clientWins.length,
      revenueWon: clientWins.reduce((s, w) => s + Number(w.lead.value ?? 0), 0),
      openTasks: tasks.length,
      overdueTasks: tasks.filter((t) => !!t.dueDate && t.dueDate.toISOString().slice(0, 10) < today).length,
      lastWeekly: last ? last.toISOString().slice(0, 10) : null,
    };
  });

  return rows.sort((a, b) => b.overdueTasks - a.overdueTasks || b.openTasks - a.openTasks || a.name.localeCompare(b.name));
}
