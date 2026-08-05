import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import {
  toggleOnboardingStep,
  saveGameplanLink,
  toggleLessonComplete,
  createTask,
  updateTaskStatus,
  createModule,
  createLesson,
} from "@/lib/actions";
import ClientTabsShell from "@/components/ClientTabsShell";
import OnboardingChecklist from "@/components/OnboardingChecklist";
import GameplanPanel from "@/components/GameplanPanel";
import PlaybooksPanel from "@/components/PlaybooksPanel";
import AdsPanel from "@/components/AdsPanel";
import AwardsPanel from "@/components/AwardsPanel";
import TaskList from "@/components/TaskList";

export default async function ClientDetailPage({ params }: { params: { slug: string } }) {
  const client = await prisma.client.findUnique({
    where: { slug: params.slug },
    include: { program: true },
  });
  if (!client) notFound();

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const [
    revenueThisMonth,
    lifetimeRevenueAgg,
    sessionsCount,
    onboardingTemplates,
    onboardingProgress,
    modules,
    lessonProgress,
    campaigns,
    awardTiers,
    clientAwards,
    tasks,
  ] = await Promise.all([
    prisma.payment.aggregate({ _sum: { amountDue: true }, where: { clientId: client.id, status: "PAID", paidDate: { gte: monthStart } } }),
    prisma.payment.aggregate({ _sum: { amountDue: true }, where: { clientId: client.id, status: "PAID" } }),
    prisma.session.count({ where: { clientId: client.id, status: "COMPLETED" } }),
    prisma.onboardingStepTemplate.findMany({ orderBy: { order: "asc" } }),
    prisma.clientOnboardingStep.findMany({ where: { clientId: client.id } }),
    prisma.module.findMany({ orderBy: { order: "asc" }, include: { lessons: { orderBy: { order: "asc" } } } }),
    prisma.clientLessonProgress.findMany({ where: { clientId: client.id, completedAt: { not: null } } }),
    prisma.adCampaign.findMany({ where: { clientId: client.id } }),
    prisma.awardTier.findMany({ orderBy: { order: "asc" } }),
    prisma.clientAward.findMany({ where: { clientId: client.id } }),
    prisma.task.findMany({ where: { clientId: client.id }, orderBy: { dueDate: "asc" } }),
  ]);

  const revThisMonth = Number(revenueThisMonth._sum.amountDue ?? 0);
  const lifetimeRevenue = Number(lifetimeRevenueAgg._sum.amountDue ?? 0);
  const totalSpend = campaigns.reduce((s, c) => s + Number(c.spend), 0);
  const profit = revThisMonth - totalSpend;

  const dashboardContent = (
    <div>
      <div className="grid grid-cols-4 gap-4 mb-4">
        <StatCard label="Revenue this month" value={`$${revThisMonth.toLocaleString()}`} />
        <StatCard label="Ad spend" value={`$${totalSpend.toLocaleString()}`} />
        <StatCard label="Profit" value={`$${profit.toLocaleString()}`} />
        <StatCard label="Lifetime revenue" value={`$${lifetimeRevenue.toLocaleString()}`} />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <StatCard label="Sessions completed" value={String(sessionsCount)} big />
        <StatCard label="Active campaigns" value={String(campaigns.filter((c) => c.status === "active").length)} big />
      </div>
    </div>
  );

  const onboardingContent = (
    <OnboardingChecklist
      clientId={client.id}
      templates={onboardingTemplates.map((t) => ({ id: t.id, title: t.title, description: t.description, icon: t.icon }))}
      progress={onboardingProgress.map((p) => ({ templateId: p.templateId, completedAt: p.completedAt?.toISOString() ?? null }))}
      onToggle={toggleOnboardingStep}
    />
  );

  const gameplanContent = (
    <GameplanPanel clientId={client.id} currentLink={client.gameplanFigmaLink} onSave={saveGameplanLink} />
  );

  const playbooksContent = (
    <PlaybooksPanel
      clientId={client.id}
      modules={modules.map((m) => ({
        id: m.id,
        title: m.title,
        lessons: m.lessons.map((l) => ({ id: l.id, title: l.title, videoUrl: l.videoUrl, content: l.content })),
      }))}
      completedLessonIds={lessonProgress.map((p) => p.lessonId)}
      onToggle={toggleLessonComplete}
      onCreateModule={createModule}
      onCreateLesson={createLesson}
    />
  );

  const adsContent = (
    <AdsPanel
      campaigns={campaigns.map((c) => ({
        id: c.id,
        name: c.name,
        status: c.status,
        spend: Number(c.spend),
        impressions: c.impressions,
        profileVisits: c.profileVisits,
        engagement: c.engagement,
        saves: c.saves,
        syncedAt: c.syncedAt?.toISOString() ?? null,
      }))}
    />
  );

  const awardsContent = (
    <AwardsPanel
      tiers={awardTiers.map((t) => ({ id: t.id, name: t.name, subtitle: t.subtitle, thresholdRevenue: t.thresholdRevenue ? Number(t.thresholdRevenue) : null }))}
      earnedTierIds={clientAwards.map((a) => a.awardTierId)}
      lifetimeRevenue={lifetimeRevenue}
    />
  );

  const tasksContent = (
    <TaskList
      initialTasks={tasks.map((t) => ({
        id: t.id,
        title: t.title,
        status: t.status,
        assignee: t.assignee,
        dueDate: t.dueDate ? t.dueDate.toISOString() : null,
        source: t.source,
      }))}
      clientId={client.id}
      onCreate={createTask}
      onUpdateStatus={updateTaskStatus}
      showClientColumn={false}
    />
  );

  return (
    <div className="p-10 max-w-[1500px] mx-auto">
      <div className="flex items-center gap-4 mb-6">
        <div className="w-14 h-14 rounded-2xl flex items-center justify-center font-bold text-xl" style={{ background: "var(--primary-tint)", color: "var(--primary)" }}>
          {client.name.slice(0, 1).toUpperCase()}
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-heading text-2xl font-bold" style={{ color: "var(--text-primary)" }}>{client.name}</h1>
            {client.program && (
              <span className="text-[10px] font-bold px-2 py-1 rounded" style={{ background: "var(--surface-hover)", color: "var(--text-secondary)" }}>
                {client.program.name}
              </span>
            )}
          </div>
          <p className="text-sm" style={{ color: "var(--text-secondary)" }}>Since {client.joinedAt.toLocaleDateString("en-US", { month: "short", year: "numeric" })}</p>
        </div>
      </div>

      <ClientTabsShell
        tabs={[
          { key: "onboarding", label: "Onboarding", content: onboardingContent },
          { key: "dashboard", label: "Dashboard", content: dashboardContent },
          { key: "gameplan", label: "Gameplan", content: gameplanContent },
          { key: "playbooks", label: "Playbooks", content: playbooksContent },
          { key: "ads", label: "Ads", content: adsContent },
          { key: "tasks", label: "Tasks", content: tasksContent },
          { key: "awards", label: "Awards", content: awardsContent },
        ]}
      />
    </div>
  );
}

function StatCard({ label, value, big }: { label: string; value: string; big?: boolean }) {
  return (
    <div className="card rounded-2xl p-5">
      <p className="text-xs" style={{ color: "var(--text-secondary)" }}>{label}</p>
      <p className={`font-heading font-bold mt-1 ${big ? "text-3xl" : "text-2xl"}`} style={{ color: "var(--text-primary)" }}>{value}</p>
    </div>
  );
}