import { prisma } from "./prisma";

const UPCOMING_SESSION_WINDOW_DAYS = 3;
const NO_CONTACT_DAYS = 14;

function daysBetween(a: Date, b: Date) {
  return Math.round((a.getTime() - b.getTime()) / (1000 * 60 * 60 * 24));
}

export async function computeNeedsAction() {
  const now = new Date();
  const clients = await prisma.client.findMany({ where: { isActive: true } });

  const items: {
    clientId: string;
    type: string;
    severity: string;
    title: string;
    description: string;
  }[] = [];

  for (const client of clients) {
    const overduePayments = await prisma.payment.findMany({
      where: { clientId: client.id, status: { in: ["PENDING", "OVERDUE"] }, dueDate: { lt: now } },
    });
    for (const p of overduePayments) {
      const overdueDays = daysBetween(now, p.dueDate);
      items.push({
        clientId: client.id,
        type: "overdue_payment",
        severity: "danger",
        title: client.name,
        description: `${p.label} — $${p.amountDue} (${overdueDays}d overdue)`,
      });
    }

    const missedSessions = await prisma.session.findMany({
      where: { clientId: client.id, status: "SCHEDULED", scheduledAt: { lt: now } },
    });
    for (const s of missedSessions) {
      items.push({
        clientId: client.id,
        type: "missed_session",
        severity: "danger",
        title: client.name,
        description: `Session on ${s.scheduledAt.toLocaleDateString()} was never marked complete`,
      });
    }

    const upcoming = await prisma.session.findFirst({
      where: {
        clientId: client.id,
        status: "SCHEDULED",
        scheduledAt: { gte: now, lte: new Date(now.getTime() + UPCOMING_SESSION_WINDOW_DAYS * 86400000) },
      },
      orderBy: { scheduledAt: "asc" },
    });
    if (upcoming) {
      const daysUntil = daysBetween(upcoming.scheduledAt, now);
      items.push({
        clientId: client.id,
        type: "upcoming_session",
        severity: "success",
        title: client.name,
        description: daysUntil === 0 ? "Session today" : `Session in ${daysUntil}d`,
      });
    }

    const lastSession = await prisma.session.findFirst({
      where: { clientId: client.id, status: "COMPLETED" },
      orderBy: { scheduledAt: "desc" },
    });
    const sinceLast = lastSession ? daysBetween(now, lastSession.scheduledAt) : Infinity;
    if (sinceLast >= NO_CONTACT_DAYS) {
      items.push({
        clientId: client.id,
        type: "no_contact",
        severity: "muted",
        title: client.name,
        description: lastSession ? `No session in ${sinceLast}+ days` : "No sessions logged yet",
      });
    }
    const totalSteps = await prisma.onboardingStepTemplate.count();
    if (totalSteps > 0) {
      const completedSteps = await prisma.clientOnboardingStep.count({
        where: { clientId: client.id, completedAt: { not: null } },
      });
      if (completedSteps < totalSteps) {
        items.push({
          clientId: client.id,
          type: "onboarding_incomplete",
          severity: "muted",
          title: client.name,
          description: `Onboarding ${completedSteps}/${totalSteps} steps complete`,
        });
      }
    }
  }

  await prisma.$transaction([
    prisma.needsActionItem.deleteMany({}),
    prisma.needsActionItem.createMany({ data: items }),
  ]);

  return items.length;
}

export async function getDashboardKpis() {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const [activeClients, totalClients, revenueAgg, sessionsThisMonth] = await Promise.all([
    prisma.client.count({ where: { isActive: true } }),
    prisma.client.count(),
    prisma.payment.aggregate({
      _sum: { amountDue: true },
      where: { status: "PAID", paidDate: { gte: monthStart } },
    }),
    prisma.session.count({
      where: { status: "COMPLETED", scheduledAt: { gte: monthStart } },
    }),
  ]);

  return {
    activeClients,
    totalClients,
    revenueThisMonth: Number(revenueAgg._sum.amountDue ?? 0),
    sessionsThisMonth,
  };
}
