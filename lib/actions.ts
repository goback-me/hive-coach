"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

function slugify(name: string) {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

// ── Referral pipeline ──────────────────────────────────────────────────
export async function updateReferralStage(id: string, stage: string) {
  await prisma.referral.update({ where: { id }, data: { stage: stage as never } });
  revalidatePath("/referrals");
}

export async function createReferral(formData: FormData) {
  const name = String(formData.get("name") || "").trim();
  const source = String(formData.get("source") || "").trim();
  const note = String(formData.get("note") || "").trim();
  if (!name) throw new Error("Name is required");

  await prisma.referral.create({
    data: { name, source: source || null, note: note || null, stage: "INTRODUCED" },
  });
  revalidatePath("/referrals");
}

function randomCode(len = 8) {
  const chars = "abcdefghijkmnopqrstuvwxyz23456789";
  return Array.from({ length: len }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
}

export async function createReferralLink(formData: FormData) {
  const label = String(formData.get("label") || "").trim();
  if (!label) throw new Error("Label is required");

  let code = randomCode();
  while (await prisma.referralLink.findUnique({ where: { code } })) {
    code = randomCode();
  }

  await prisma.referralLink.create({ data: { label, code } });
  revalidatePath("/referrals");
}

// Public submission — used by the /refer/[code] page, no auth required
export async function submitPublicReferral(code: string, formData: FormData) {
  const name = String(formData.get("name") || "").trim();
  const source = String(formData.get("source") || "").trim();
  const note = String(formData.get("note") || "").trim();
  if (!name) throw new Error("Name is required");

  const link = await prisma.referralLink.findUnique({ where: { code } });

  await prisma.referral.create({
    data: {
      name,
      source: source || null,
      note: note || null,
      stage: "INTRODUCED",
      referralLinkId: link?.id ?? null,
    },
  });
}
// ── Tasks ──────────────────────────────────────────────────────────────
export async function createTask(formData: FormData) {
  const title = String(formData.get("title") || "").trim();
  const clientId = String(formData.get("clientId") || "") || null;
  const assignee = String(formData.get("assignee") || "").trim();
  const dueDateRaw = String(formData.get("dueDate") || "");
  if (!title) throw new Error("Task title is required");

  await prisma.task.create({
    data: {
      title,
      clientId,
      assignee: assignee || null,
      dueDate: dueDateRaw ? new Date(dueDateRaw) : null,
    },
  });
  revalidatePath("/tasks");
  revalidatePath("/clients");
}

export async function updateTaskStatus(id: string, status: string) {
  await prisma.task.update({ where: { id }, data: { status: status as never } });
  revalidatePath("/tasks");
  revalidatePath("/clients");
}

// ── Onboarding — completing a step never blocks the UI, just updates state ─
export async function toggleOnboardingStep(clientId: string, templateId: string, completed: boolean) {
  await prisma.clientOnboardingStep.upsert({
    where: { clientId_templateId: { clientId, templateId } },
    update: { completedAt: completed ? new Date() : null },
    create: { clientId, templateId, completedAt: completed ? new Date() : null },
  });
  revalidatePath(`/clients`);
}

export async function createOnboardingStepTemplate(formData: FormData) {
  const title = String(formData.get("title") || "").trim();
  const description = String(formData.get("description") || "").trim();
  if (!title) throw new Error("Title is required");

  const count = await prisma.onboardingStepTemplate.count();
  await prisma.onboardingStepTemplate.create({
    data: { title, description: description || null, order: count },
  });
  revalidatePath("/settings");
}

// ── Gameplan (Figma embed) ───────────────────────────────────────────────
export async function saveGameplanLink(clientId: string, formData: FormData) {
  const link = String(formData.get("figmaLink") || "").trim();
  await prisma.client.update({ where: { id: clientId }, data: { gameplanFigmaLink: link || null } });
  revalidatePath(`/clients`);
}

// ── Playbooks / lessons ──────────────────────────────────────────────────
export async function toggleLessonComplete(clientId: string, lessonId: string, completed: boolean) {
  await prisma.clientLessonProgress.upsert({
    where: { clientId_lessonId: { clientId, lessonId } },
    update: { completedAt: completed ? new Date() : null },
    create: { clientId, lessonId, completedAt: completed ? new Date() : null },
  });
  const { checkAndGrantAwards } = await import("./awards");
  await checkAndGrantAwards(clientId);
  revalidatePath(`/clients`);
}

// ── Integration settings ─────────────────────────────────────────────────
export async function saveIntegrationSettings(formData: FormData) {
  const clickupApiKey = String(formData.get("clickupApiKey") || "").trim();
  const clickupTeamId = String(formData.get("clickupTeamId") || "").trim();
  const crmType = String(formData.get("crmType") || "").trim();
  const crmApiKeyOrUrl = String(formData.get("crmApiKeyOrUrl") || "").trim();

  await prisma.integrationSettings.upsert({
    where: { id: "singleton" },
    update: { clickupApiKey, clickupTeamId, crmType, crmApiKeyOrUrl },
    create: { id: "singleton", clickupApiKey, clickupTeamId, crmType, crmApiKeyOrUrl },
  });
  revalidatePath("/settings");
}

// ── Playbooks — modules & lessons ────────────────────────────────────────
export async function createModule(formData: FormData) {
  const title = String(formData.get("title") || "").trim();
  if (!title) throw new Error("Module title is required");

  const count = await prisma.module.count();
  await prisma.module.create({ data: { title, order: count } });
  revalidatePath("/settings");
  revalidatePath("/clients");
}

export async function createLesson(formData: FormData) {
  const moduleId = String(formData.get("moduleId") || "");
  const title = String(formData.get("title") || "").trim();
  const videoUrl = String(formData.get("videoUrl") || "").trim();
  const content = String(formData.get("content") || "").trim();
  if (!moduleId) throw new Error("Module is required");
  if (!title) throw new Error("Lesson title is required");

  const count = await prisma.lesson.count({ where: { moduleId } });
  await prisma.lesson.create({
    data: { moduleId, title, videoUrl: videoUrl || null, content: content || null, order: count },
  });
  revalidatePath("/settings");
  revalidatePath("/clients");
}

export async function createClient(formData: FormData) {
  const name = String(formData.get("name") || "").trim();
  const description = String(formData.get("description") || "").trim();
  const programId = String(formData.get("programId") || "") || null;
  const status = String(formData.get("status") || "ONBOARDING") as "ACTIVE" | "ONBOARDING" | "CHURNED";

  if (!name) throw new Error("Client name is required");

  let slug = slugify(name);
  const existing = await prisma.client.findUnique({ where: { slug } });
  if (existing) slug = `${slug}-${Date.now().toString(36)}`;

  const client = await prisma.client.create({
    data: {
      name,
      slug,
      description: description || null,
      programId,
      status,
      isActive: status !== "CHURNED",
    },
  });

  revalidatePath("/clients");
  redirect(`/clients/${client.slug}`);
}
