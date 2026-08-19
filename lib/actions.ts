"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireCoach, requireClientAccess } from "@/lib/auth";
import { getClerkAdminClient } from "@/lib/clerk-admin";

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

  // A client can only create tasks under their own record; a coach can assign to anyone.
  await requireClientAccess(clientId ?? "");

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
  const task = await prisma.task.findUnique({ where: { id }, select: { clientId: true } });
  if (!task) throw new Error("Task not found");
  await requireClientAccess(task.clientId ?? "");

  await prisma.task.update({ where: { id }, data: { status: status as never } });
  revalidatePath("/tasks");
  revalidatePath("/clients");
}

// ── Onboarding — completing a step never blocks the UI, just updates state ─
export async function toggleOnboardingStep(clientId: string, templateId: string, completed: boolean) {
  await requireClientAccess(clientId);
  await prisma.clientOnboardingStep.upsert({
    where: { clientId_templateId: { clientId, templateId } },
    update: { completedAt: completed ? new Date() : null },
    create: { clientId, templateId, completedAt: completed ? new Date() : null },
  });
  revalidatePath(`/clients`);
}

export async function createOnboardingStepTemplate(formData: FormData) {
  await requireCoach();
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
  await requireClientAccess(clientId);
  const link = String(formData.get("figmaLink") || "").trim();
  await prisma.client.update({ where: { id: clientId }, data: { gameplanFigmaLink: link || null } });
  revalidatePath(`/clients`);
}

// ── Playbooks / lessons ──────────────────────────────────────────────────
export async function toggleLessonComplete(clientId: string, lessonId: string, completed: boolean) {
  await requireClientAccess(clientId);
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
  await requireCoach();
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
  await requireCoach();
  const title = String(formData.get("title") || "").trim();
  if (!title) throw new Error("Module title is required");

  const count = await prisma.module.count();
  await prisma.module.create({ data: { title, order: count } });
  revalidatePath("/settings");
  revalidatePath("/clients");
}

export async function createLesson(formData: FormData) {
  await requireCoach();
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
  await requireCoach();
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

// ── Users / logins (coach-only) ──────────────────────────────────────────
// Creates the Clerk account AND the app-side profile in one go. The temp
// password is shown once on screen — the user should change it after first
// login (Clerk's account settings UI handles that, not built here).
export async function createUser(formData: FormData) {
  await requireCoach();

  const name = String(formData.get("name") || "").trim();
  const email = String(formData.get("email") || "").trim().toLowerCase();
  const role = String(formData.get("role") || "CLIENT") as "COACH" | "CLIENT";
  const clientId = String(formData.get("clientId") || "") || null;

  if (!name) throw new Error("Name is required");
  if (!email) throw new Error("Email is required");
  if (role === "CLIENT" && !clientId) throw new Error("A client user must be linked to a client");

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) throw new Error("A user with that email already exists");

  const tempPassword = randomCode(14);
  const clerk = await getClerkAdminClient();

  const [firstName, ...rest] = name.split(" ");
  const lastName = rest.join(" ") || undefined;

  let clerkUser;
  try {
    clerkUser = await clerk.users.createUser({
      emailAddress: [email],
      password: tempPassword,
      firstName,
      lastName,
      skipPasswordChecks: false,
    });
  } catch (e: unknown) {
    const message =
      (e as { errors?: { message?: string }[] })?.errors?.[0]?.message ||
      (e instanceof Error ? e.message : "Failed to create the login");
    throw new Error(message);
  }

  try {
    await prisma.user.create({
      data: {
        clerkId: clerkUser.id,
        email,
        name,
        role,
        clientId: role === "CLIENT" ? clientId : null,
      },
    });
  } catch (e) {
    // Roll back the Clerk account if the app-side profile fails, so we don't
    // end up with an orphaned login that has no role/client.
    await clerk.users.deleteUser(clerkUser.id);
    throw e;
  }

  revalidatePath("/settings");
  return { email, tempPassword };
}

export async function deleteUser(userId: string) {
  await requireCoach();

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return;

  const clerk = await getClerkAdminClient();
  await clerk.users.deleteUser(user.clerkId);
  await prisma.user.delete({ where: { id: userId } });

  revalidatePath("/settings");
}