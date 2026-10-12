import type { ReactNode } from "react";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import {
  toggleOnboardingStep,
  saveGameplanLink,
  saveTrackingWebsite,
  verifyTrackingInstall,
  getSwarmEmbedUrl,
  getOrCreateClientReferralLink,
} from "@/lib/actions";
import { CLIENT_PREVIEW_COOKIE, CLIENT_TABS } from "@/lib/client-tabs";
import { cookies } from "next/headers";
import ClientViewToggle, { ClientPreviewBanner } from "@/components/ClientViewToggle";
import { metaOAuthConfigured } from "@/lib/meta-ads";
import WeeklyStatusPanel from "@/components/WeeklyStatusPanel";
import ClientReferralPanel from "@/components/ClientReferralPanel";
import ClientHeaderActions from "@/components/ClientHeaderActions";
import ClientDashboard from "@/components/ClientDashboard";
import { swarmEmbedSnippet } from "@/lib/swarm-config";
import { requireClientAccess } from "@/lib/auth";
import { getTasks } from "@/lib/tasks";
import { checkAndGrantAwards } from "@/lib/awards";
import ClientTabsShell from "@/components/ClientTabsShell";
import OnboardingChecklist from "@/components/OnboardingChecklist";
import GameplanPanel from "@/components/GameplanPanel";
import PlaybooksPanel from "@/components/PlaybooksPanel";
import AdsPanel from "@/components/AdsPanel";
import AwardsPanel from "@/components/AwardsPanel";
import TrackingPanel from "@/components/TrackingPanel";
import TaskList from "@/components/TaskList";
import LeadsPanel from "@/components/LeadsPanel";
import GrowthPanel from "@/components/GrowthPanel";
import type { LeadView } from "@/lib/lead-stages";

// Forces this page to render fresh on every single request — no static
// caching, no ISR. Without this, if Next.js ever treats this route as
// cacheable for any reason, the embedUrl (with its 45-min token) could get
// served stale indefinitely regardless of how many times the page is
// reloaded, since the server would never actually re-run getSwarmEmbedUrl.
export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

export default async function ClientDetailPage({
  params,
  searchParams,
}: {
  params: { slug: string };
  searchParams: { tab?: string; google_error?: string; meta_error?: string };
}) {
  const client = await prisma.client.findUnique({
    where: { slug: params.slug },
    include: { program: true },
  });
  if (!client) notFound();

  // A client login gets bounced to /dashboard (which redirects to their own
  // slug) if they try to view anyone else's page. A coach can view any client.
  const viewer = await requireClientAccess(client.id);
  // A coach can switch to "Client view" to see this page exactly as the client does.
  const realCoach = viewer.role === "COACH";
  const previewing = realCoach && cookies().get(CLIENT_PREVIEW_COOKIE)?.value === "1";
  const isCoach = realCoach && !previewing;
  const hiddenTabs = new Set(client.hiddenTabs);

  // Re-checks revenue/module thresholds against award tiers on every visit —
  // not just when a lesson gets toggled — so editing a tier's threshold or a
  // payment landing doesn't require an unrelated action to unlock it.
  await checkAndGrantAwards(client.id);

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
    people,
    sheet,
    leadRows,
    googleConnection,
    weeklyUpdates,
    nextSession,
    referralLink,
    programs,
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
    getTasks(client.id),
    prisma.user.findMany({
      where: { OR: [{ clientId: client.id }, { role: "COACH" }] },
      select: { name: true, role: true, clientId: true },
      orderBy: { name: "asc" },
    }),
    prisma.clientSheet.findUnique({ where: { clientId: client.id } }),
    prisma.lead.findMany({
      where: { clientId: client.id, deletedAt: null },
      include: { stageEvents: { select: { stage: true, at: true } } },
    }),
    prisma.googleAccountConnection.findUnique({ where: { clientId: client.id }, select: { googleEmail: true } }),
    prisma.weeklyUpdate.findMany({ where: { clientId: client.id }, orderBy: [{ callDate: "desc" }, { createdAt: "desc" }] }),
    prisma.session.findFirst({ where: { clientId: client.id, status: "SCHEDULED", scheduledAt: { gte: new Date() } }, orderBy: { scheduledAt: "asc" } }),
    getOrCreateClientReferralLink(client.id).then((link) =>
      prisma.referralLink.findUniqueOrThrow({
        where: { id: link.id },
        include: { referrals: { orderBy: { createdAt: "desc" }, select: { id: true, name: true, stage: true } } },
      }),
    ),
    prisma.program.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } }),
  ]);

  const leads: LeadView[] = leadRows
    .map((l) => ({
      id: l.id,
      name: l.name,
      phone: l.phone,
      email: l.email,
      source: l.source,
      campaign: l.campaign,
      stage: l.stage,
      statusRaw: l.statusRaw,
      value: l.value === null ? null : Number(l.value),
      date: (l.optInAt ?? l.createdAt).toISOString(),
      events: l.stageEvents.map((e) => ({ stage: e.stage, at: e.at.toISOString() })),
      raw: (l.raw as Record<string, string> | null) ?? null,
    }))
    .sort((a, b) => b.date.localeCompare(a.date));

  const nextCallLabel = nextSession
    ? `${nextSession.scheduledAt.toLocaleString("en-AU", { timeZone: "Australia/Sydney", weekday: "short", day: "numeric", month: "short", hour: "numeric", minute: "2-digit" })} · ${nextSession.durationMin} min`
    : null;
  const revThisMonth = Number(revenueThisMonth._sum.amountDue ?? 0);
  const lifetimeRevenue = Number(lifetimeRevenueAgg._sum.amountDue ?? 0);
  const totalSpend = campaigns.reduce((s, c) => s + Number(c.spend), 0);

  // Mints a fresh, short-lived, scoped token on every page load — nothing
  // about this client's domain ever appears in a URL. Only bother calling
  // Swarm at all once the install is actually verified.
  const swarmEmbedUrl = client.trackingVerifiedAt && (isCoach || !hiddenTabs.has("tracking")) ? await getSwarmEmbedUrl(client.id) : null;

  const latest = weeklyUpdates[0];
  const nextTier = awardTiers.find((t) => t.thresholdRevenue && !clientAwards.some((a) => a.awardTierId === t.id));
  const dashboardContent = (
    <ClientDashboard
      data={{
        slug: client.slug,
        isCoach,
        hasSheet: !!sheet,
        leads,
        tasks,
        onboarding: { done: onboardingProgress.filter((p) => p.completedAt).length, total: onboardingTemplates.length },
        education: { done: lessonProgress.length, total: modules.reduce((n, m) => n + m.lessons.length, 0) },
        latestUpdate: latest
          ? { callDate: latest.callDate.toISOString().slice(0, 10), summary: latest.summary, nextSteps: latest.nextSteps, stepsDone: latest.stepsDone, createdBy: latest.createdBy }
          : null,
        nextCall: nextCallLabel,
        awards: {
          earned: clientAwards.length,
          total: awardTiers.length,
          next: nextTier ? { name: nextTier.name, threshold: Number(nextTier.thresholdRevenue) } : null,
          lifetimeRevenue,
        },
        account: { revenueThisMonth: revThisMonth, adSpend: totalSpend, sessions: sessionsCount, activeCampaigns: campaigns.filter((c) => c.status === "active").length },
        details: {
          email: client.email,
          program: client.program?.name ?? null,
          joined: client.joinedAt.toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" }),
          status: client.status,
          driveUrl: client.driveUrl,
        },
      }}
    />
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
      modules={modules.map((m) => ({ id: m.id, title: m.title, lessons: m.lessons.map((l) => ({ id: l.id, title: l.title, videoUrl: l.videoUrl, content: l.content })) }))}
      completedLessonIds={lessonProgress.map((p) => p.lessonId)}
      isCoach={isCoach}
    />
  );

  // Never pass the Meta token to the browser — only the account id and name.
  const adsContent = (
    <AdsPanel
      clientId={client.id}
      account={client.metaAdAccountId ? { id: client.metaAdAccountId, name: client.metaAccountName } : null}
      facebookConnected={!!client.metaAccessToken}
      oauthReady={metaOAuthConfigured()}
      initialError={searchParams.meta_error ?? null}
      leads={leads}
      hasSheet={!!sheet}
    />
  );

  const awardsContent = (
    <AwardsPanel
      tiers={awardTiers.map((t) => ({ id: t.id, name: t.name, subtitle: t.subtitle, thresholdRevenue: t.thresholdRevenue ? Number(t.thresholdRevenue) : null }))}
      earnedTierIds={clientAwards.map((a) => a.awardTierId)}
      lifetimeRevenue={lifetimeRevenue}
    />
  );

  const tasksContent = <TaskList tasks={tasks} clientId={client.id} people={people} isCoach={isCoach} showClientColumn={false} />;

  const weeklyContent = (
    <WeeklyStatusPanel
      clientId={client.id}
      isCoach={isCoach}
      nextSession={nextSession && nextCallLabel ? { id: nextSession.id, label: nextCallLabel } : null}
      updates={weeklyUpdates.map((u) => ({
        id: u.id,
        callDate: u.callDate.toISOString().slice(0, 10),
        summary: u.summary,
        nextSteps: u.nextSteps,
        stepsDone: u.stepsDone,
        internalNotes: isCoach ? u.internalNotes : null, // never sent to a client login
        createdBy: u.createdBy,
      }))}
    />
  );

  const referralsContent = <ClientReferralPanel clientId={client.id} code={referralLink.code} referrals={referralLink.referrals} />;

  const leadsContent = (
    <LeadsPanel
      clientId={client.id}
      isCoach={isCoach}
      googleConnected={!!googleConnection}
      googleEmail={googleConnection?.googleEmail ?? null}
      googleError={searchParams.google_error ?? null}
      leads={leads}
      sheet={
        sheet && {
          spreadsheetId: sheet.spreadsheetId,
          spreadsheetName: sheet.spreadsheetName,
          sheetName: sheet.sheetName,
          statusColumn: sheet.statusColumn,
          lastSyncedAt: sheet.lastSyncedAt?.toISOString() ?? null,
          lastSyncError: sheet.lastSyncError,
          unmapped: (sheet.unmappedStatuses as Record<string, number> | null) ?? {},
        }
      }
    />
  );

  const growthContent = <GrowthPanel leads={leads} hasSheet={!!sheet} />;

  const trackingContent = (
    <TrackingPanel
      clientId={client.id}
      websiteUrl={client.trackingWebsiteUrl}
      isVerified={!!client.trackingVerifiedAt}
      embedSnippet={swarmEmbedSnippet()}
      embedUrl={swarmEmbedUrl}
      onSaveWebsite={saveTrackingWebsite}
      onVerify={verifyTrackingInstall}
    />
  );

  const tabContent: Record<(typeof CLIENT_TABS)[number]["key"], ReactNode> = {
    onboarding: onboardingContent,
    dashboard: dashboardContent,
    weekly: weeklyContent,
    tasks: tasksContent,
    leads: leadsContent,
    growth: growthContent,
    playbooks: playbooksContent,
    ads: adsContent,
    referrals: referralsContent,
    awards: awardsContent,
    gameplan: gameplanContent,
    tracking: trackingContent,
  };

  return (
    <div className="p-4 md:p-10 max-w-[1500px] mx-auto">
      <div className="flex flex-wrap items-center gap-4 mb-6">
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
        <ClientHeaderActions
          clientId={client.id}
          isCoach={isCoach}
          driveUrl={client.driveUrl}
          hiddenTabs={client.hiddenTabs}
          details={{ name: client.name, email: client.email, description: client.description, programId: client.programId, status: client.status }}
          programs={programs}
        />
        {realCoach && (
          <div className="w-full flex justify-end">
            <ClientViewToggle previewing={previewing} />
          </div>
        )}
      </div>
      {previewing && <ClientPreviewBanner clientName={client.name} />}

      <ClientTabsShell
        initialTab={searchParams.tab}
        tabs={CLIENT_TABS.filter((t) => isCoach || !hiddenTabs.has(t.key)).map((t) => ({
          key: t.key,
          label: t.label,
          content: tabContent[t.key],
          hidden: isCoach && hiddenTabs.has(t.key),
        }))}
      />
    </div>
  );
}
