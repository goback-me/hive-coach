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
  for (let i = 0; i < 12; i++) {
    const month = new Date(now.getFullYear(), now.getMonth() - i, 15);
    const amount = 5000 + Math.round(Math.random() * 15000) + i * 800;
    const client = await prisma.client.findFirst({ where: { slug: "ad-empire" } });
    if (client) {
      const existing = await prisma.payment.findFirst({
        where: { clientId: client.id, paidDate: { gte: new Date(month.getFullYear(), month.getMonth(), 1) } },
      });
      if (!existing) {
        await prisma.payment.create({
          data: {
            clientId: client.id,
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

  // Sample ad campaign for the demo client
  const adEmpire = await prisma.client.findFirst({ where: { slug: "ad-empire" } });
  if (adEmpire) {
    const existingCampaign = await prisma.adCampaign.findFirst({ where: { clientId: adEmpire.id } });
    if (!existingCampaign) {
      await prisma.adCampaign.create({
        data: { clientId: adEmpire.id, name: "IG Story Ads — Q1", status: "active", spend: 1240, impressions: 48200, profileVisits: 890, engagement: 210, saves: 34 },
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