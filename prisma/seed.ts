import { prisma } from "../lib/prisma";
import { computeNeedsAction } from "../lib/needs-action";

async function main() {
  const dfy = await prisma.program.upsert({
    where: { id: "dfy" }, update: {}, create: { id: "dfy", name: "DFY", durationWeeks: 12 },
  });
  const dwyIncubator = await prisma.program.upsert({
    where: { id: "dwy-incubator" }, update: {}, create: { id: "dwy-incubator", name: "DWY (Incubator)", durationWeeks: 8 },
  });
  const dwyInner = await prisma.program.upsert({
    where: { id: "dwy-inner" }, update: {}, create: { id: "dwy-inner", name: "DWY (Inner Circle)", durationWeeks: 24 },
  });

  const clients = [
    { name: "Ad Empire", programId: dfy.id, status: "ACTIVE" as const },
    { name: "Adam", programId: dwyIncubator.id, status: "CHURNED" as const },
    { name: "Adamo Di Bella", programId: dwyInner.id, status: "ONBOARDING" as const },
    { name: "Sarah Chen", programId: dfy.id, status: "ACTIVE" as const },
    { name: "Marcus Webb", programId: dwyIncubator.id, status: "ACTIVE" as const },
    { name: "Priya Patel", programId: dwyInner.id, status: "ONBOARDING" as const },
  ];

  for (const c of clients) {
    const slug = c.name.toLowerCase().replace(/\s+/g, "-");
    const client = await prisma.client.upsert({
      where: { slug },
      update: { status: c.status, programId: c.programId },
      create: {
        name: c.name,
        slug,
        programId: c.programId,
        status: c.status,
        isActive: c.status !== "CHURNED",
        goals: "Build consistent habits and hit key milestones.",
      },
    });

    const existingSessions = await prisma.session.count({ where: { clientId: client.id } });
    if (existingSessions === 0) {
      await prisma.session.create({
        data: { clientId: client.id, scheduledAt: new Date(Date.now() + 2 * 86400000), status: "SCHEDULED" },
      });
      await prisma.session.create({
        data: { clientId: client.id, scheduledAt: new Date(Date.now() - 5 * 86400000), status: "COMPLETED" },
      });
      await prisma.progressNote.create({
        data: { clientId: client.id, note: "Great progress this week — hit all check-in goals.", createdBy: "Coach" },
      });
    }
  }

  // A little revenue history so the 12-month chart isn't flat
  const now = new Date();
  const revenueClient = await prisma.client.findFirst({ where: { slug: "ad-empire" } });
  for (let i = 0; i < 12; i++) {
    const month = new Date(now.getFullYear(), now.getMonth() - i, 15);
    const amount = 5000 + Math.round(Math.random() * 15000) + (11 - i) * 800;
    if (revenueClient) {
      const monthStart = new Date(month.getFullYear(), month.getMonth(), 1);
      const monthEnd = new Date(month.getFullYear(), month.getMonth() + 1, 1);
      const existing = await prisma.payment.findFirst({
        where: { clientId: revenueClient.id, paidDate: { gte: monthStart, lt: monthEnd } },
      });
      if (!existing) {
        await prisma.payment.create({
          data: {
            clientId: revenueClient.id,
            label: "Monthly retainer",
            amountDue: amount,
            dueDate: month,
            status: "PAID",
            paidDate: month,
          },
        });
      }
    }
  }

  // Sample referral pipeline data
  const referralCount = await prisma.referral.count();
  if (referralCount === 0) {
    const link = await prisma.referralLink.create({
      data: { code: "drew123", label: "Drew" },
    });
    const samples = [
      { name: "Keeram", source: "SMS", note: "Max will do a call with him and then...", stage: "IN_CONVERSATION" as const, days: 3 },
      { name: "Tuai x Liam", source: "WhatsApp", note: "Tuai & Liam - intro'd by Drew", stage: "IN_CONVERSATION" as const, days: 3, linkId: link.id },
      { name: "Seb", source: "WhatsApp", note: "Seb Liam - intro'd by Drew", stage: "IN_CONVERSATION" as const, days: 4, linkId: link.id },
      { name: "Andrei", source: "WhatsApp", note: "Have his contact from max", stage: "CALL_BOOKED" as const, days: 3 },
      { name: "Daniel", source: "Instagram", note: "\"Daniel Liam\" - intro'd by Drew", stage: "CALL_BOOKED" as const, days: 4, linkId: link.id },
      { name: "Tane", source: "WhatsApp", note: null, stage: "CALL_DONE" as const, days: 3 },
      { name: "Telos media", source: "Instagram", note: null, stage: "WON" as const, days: 3 },
    ];
    for (const s of samples) {
      await prisma.referral.create({
        data: {
          name: s.name,
          source: s.source,
          note: s.note,
          stage: s.stage,
          referralLinkId: "linkId" in s ? s.linkId : null,
          createdAt: new Date(Date.now() - s.days * 86400000),
        },
      });
    }
  }

  // Onboarding template (global, applies to all clients)
  const onboardingCount = await prisma.onboardingStepTemplate.count();
  if (onboardingCount === 0) {
    const steps = [
      { title: "Meet your business partner", icon: "person" },
      { title: "Program walkthrough", icon: "smart_display" },
      { title: "Join Discord community", icon: "chat" },
      { title: "Complete onboarding form", icon: "description" },
      { title: "Book onboarding call", icon: "event" },
    ];
    for (let i = 0; i < steps.length; i++) {
      await prisma.onboardingStepTemplate.create({ data: { ...steps[i], order: i } });
    }
  }

  // Playbook modules
  const moduleCount = await prisma.module.count();
  if (moduleCount === 0) {
    const startHere = await prisma.module.create({ data: { title: "Start Here", order: 0 } });
    await prisma.lesson.create({
      data: { moduleId: startHere.id, title: "Welcome & how this works", order: 0, content: "Essential context before diving into the rest of the playbooks." },
    });

    const content = await prisma.module.create({ data: { title: "Content & Messaging", order: 1 } });
    await prisma.lesson.create({ data: { moduleId: content.id, title: "Why most coaches fail", order: 0, videoUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ" } });
    await prisma.lesson.create({ data: { moduleId: content.id, title: "Messaging mastery", order: 1, content: "How to position your offer so it sells itself." } });
  }

  // Award tiers
  const tierCount = await prisma.awardTier.count();
  if (tierCount === 0) {
    await prisma.awardTier.create({ data: { name: "$50K", subtitle: "Rising", thresholdRevenue: 50000, order: 0 } });
    await prisma.awardTier.create({ data: { name: "$100K", subtitle: "Elite", thresholdRevenue: 100000, order: 1 } });
    await prisma.awardTier.create({ data: { name: "$200K", subtitle: "Sovereign", thresholdRevenue: 200000, order: 2 } });
  }

  // ── "Ad Empire" is the fully-populated showcase client — every tab on
  // its client-detail page should render real content, not an empty state.
  const adEmpire = await prisma.client.findFirst({ where: { slug: "ad-empire" } });
  if (adEmpire) {
    const firstCampaign = await prisma.adCampaign.findFirst({ where: { clientId: adEmpire.id, name: "IG Story Ads — Q1" } });
    if (!firstCampaign) {
      await prisma.adCampaign.create({
        data: { clientId: adEmpire.id, name: "IG Story Ads — Q1", status: "active", spend: 1240, impressions: 48200, profileVisits: 890, engagement: 210, saves: 34 },
      });
    }
    // A second, already-synced campaign so AdsPanel/MetaAdsCard show a
    // connected state instead of the "not synced yet" empty banner.
    const secondCampaign = await prisma.adCampaign.findFirst({ where: { clientId: adEmpire.id, name: "Meta Feed Ads — Retargeting" } });
    if (!secondCampaign) {
      await prisma.adCampaign.create({
        data: {
          clientId: adEmpire.id,
          name: "Meta Feed Ads — Retargeting",
          status: "active",
          spend: 3120,
          impressions: 112400,
          profileVisits: 2140,
          engagement: 560,
          saves: 91,
          syncedAt: new Date(),
        },
      });
    }

    // Dashboard tab — Leads card, so it isn't empty on first load. Checked by
    // externalKey: null (only these 5 fake rows have that — every real
    // sheet-synced lead always gets one), not a plain count, since a real
    // sync populates hundreds/thousands of rows for this same client and
    // would otherwise make this look "already seeded" forever.
    const existingDemoLeads = await prisma.lead.count({ where: { clientId: adEmpire.id, externalKey: null } });
    if (existingDemoLeads === 0) {
      // daysAgo marks each stage the lead has passed through so far (in days
      // before now) — omitted stages stay null, matching real funnel data
      // where a lead may not have reached every stage yet.
      const leadSamples = [
        { source: "Instagram DM", campaign: "IG Story Ads — Q1", status: "NEW_LEAD" as const, value: null, daysAgo: 1 },
        { source: "Website form", campaign: "Meta Feed Ads — Retargeting", status: "CHASE_UP" as const, value: null, daysAgo: 3, chaseUpDaysAgo: 2 },
        { source: "Referral", campaign: null, status: "CLIENT_CONTACTED" as const, value: 1200, daysAgo: 5, chaseUpDaysAgo: 4, contactedDaysAgo: 3 },
        { source: "Facebook Ad", campaign: "IG Story Ads — Q1", status: "WON" as const, value: 3400, daysAgo: 9, chaseUpDaysAgo: 8, contactedDaysAgo: 6, closedDaysAgo: 2 },
        { source: "Cold outreach", campaign: "Meta Feed Ads — Retargeting", status: "LOST" as const, value: null, daysAgo: 14, chaseUpDaysAgo: 13, contactedDaysAgo: 10, closedDaysAgo: 5 },
      ];
      for (const l of leadSamples) {
        const daysAgo = (n?: number) => (n != null ? new Date(Date.now() - n * 86400000) : null);
        await prisma.lead.create({
          data: {
            clientId: adEmpire.id,
            source: l.source,
            campaign: l.campaign,
            status: l.status,
            value: l.value,
            chaseUpAt: daysAgo(l.chaseUpDaysAgo),
            contactedAt: daysAgo(l.contactedDaysAgo),
            closedAt: daysAgo(l.closedDaysAgo),
            createdAt: new Date(Date.now() - l.daysAgo * 86400000),
          },
        });
      }
    }

    // Gameplan tab — a placeholder Drive link so it shows populated state.
    if (!adEmpire.gameplanFigmaLink) {
      await prisma.client.update({
        where: { id: adEmpire.id },
        data: { gameplanFigmaLink: "https://drive.google.com/file/d/1AbCdEfGhIjKlMnOpQrStUvWxYz0123456/view" },
      });
    }

    // Onboarding tab — partial progress (first 3 of 5 steps done).
    const onboardingSteps = await prisma.onboardingStepTemplate.findMany({ orderBy: { order: "asc" }, take: 3 });
    for (const step of onboardingSteps) {
      await prisma.clientOnboardingStep.upsert({
        where: { clientId_templateId: { clientId: adEmpire.id, templateId: step.id } },
        update: {},
        create: { clientId: adEmpire.id, templateId: step.id, completedAt: new Date() },
      });
    }

    // Playbooks tab — a couple of completed lessons.
    const modulesWithLessons = await prisma.module.findMany({ orderBy: { order: "asc" }, include: { lessons: { orderBy: { order: "asc" } } } });
    const allLessons = modulesWithLessons.flatMap((m) => m.lessons);
    for (const lesson of allLessons.slice(0, 2)) {
      await prisma.clientLessonProgress.upsert({
        where: { clientId_lessonId: { clientId: adEmpire.id, lessonId: lesson.id } },
        update: {},
        create: { clientId: adEmpire.id, lessonId: lesson.id, completedAt: new Date() },
      });
    }
  }

  await computeNeedsAction();
  console.log("Seeded clients:", clients.map((c) => c.name).join(", "));
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
.finally(() => prisma.$disconnect());