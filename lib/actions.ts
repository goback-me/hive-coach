"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { requireCoach, requireClientAccess } from "@/lib/auth";
import { getClerkAdminClient } from "@/lib/clerk-admin";
import { Prisma } from "@prisma/client";
import { getSheetValues, getValidAccessToken, listSheetTabs } from "@/lib/google-sheets";
import { syncClientSheet, type SyncSummary } from "@/lib/lead-sync";
import { detectStatusColumn, normalizeStatus, sydneyDay, sydneyLocalToDate } from "@/lib/sheet-parse";
import { LEAD_STAGES } from "@/lib/lead-stages";
import { CLIENT_PREVIEW_COOKIE, CLIENT_TABS } from "@/lib/client-tabs";
import { decryptToken, encryptToken } from "@/lib/crypto";
import { getMetaReport, listMetaAdAccounts, metaErrorInfo, normalizeAccountId, verifyMetaAccount, type MetaAdAccount, type MetaReport } from "@/lib/meta-ads";

function slugify(name: string) {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

// ── Referral pipeline ──────────────────────────────────────────────────
export async function updateReferralStage(id: string, stage: string) {
  await requireCoach();
  await prisma.referral.update({ where: { id }, data: { stage: stage as never } });
  revalidatePath("/referrals");
}

export async function createReferral(formData: FormData) {
  await requireCoach();
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
  await requireCoach();
  const label = String(formData.get("label") || "").trim();
  if (!label) throw new Error("Label is required");

  let code = randomCode();
  while (await prisma.referralLink.findUnique({ where: { code } })) {
    code = randomCode();
  }

  await prisma.referralLink.create({ data: { label, code } });
  revalidatePath("/referrals");
}

async function uniqueReferralCode() {
  let code = randomCode();
  while (await prisma.referralLink.findUnique({ where: { code } })) code = randomCode();
  return code;
}

/** A client's own referral link (their Referrals tab), created the first time it's needed. */
export async function getOrCreateClientReferralLink(clientId: string) {
  await requireClientAccess(clientId);
  const existing = await prisma.referralLink.findUnique({ where: { clientId } });
  if (existing) return existing;
  const client = await prisma.client.findUniqueOrThrow({ where: { id: clientId }, select: { name: true } });
  return prisma.referralLink.create({ data: { clientId, label: client.name, code: await uniqueReferralCode() } });
}

/** A client refers someone from their Referrals tab → the coach's referral pipeline. */
export async function submitClientReferral(clientId: string, input: { name: string; phone: string; email: string; note: string }): Promise<{ error?: string }> {
  const user = await requireClientAccess(clientId);
  const name = input.name.trim();
  const phone = input.phone.trim();
  const email = input.email.trim().toLowerCase();
  if (!name) return { error: "Add their name or business" };
  if (!phone && !email) return { error: "Add a phone number or email so we can reach them" };
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { error: "That email doesn't look right" };

  const link = await getOrCreateClientReferralLink(clientId);
  const contact = [phone && `Phone: ${phone}`, email && `Email: ${email}`].filter(Boolean).join(" · ");
  await prisma.referral.create({
    data: {
      name: name.slice(0, 200),
      source: `Referred by ${link.label}${user.role === "CLIENT" ? "" : ` (added by ${user.name})`} · ${contact}`,
      note: input.note.trim().slice(0, 2000) || null,
      stage: "INTRODUCED",
      referralLinkId: link.id,
    },
  });
  revalidatePath("/referrals");
  revalidatePath("/clients", "layout");
  return {};
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
function taskFields(formData: FormData) {
  const title = String(formData.get("title") || "").trim();
  const description = String(formData.get("description") || "").trim();
  const assignee = String(formData.get("assignee") || "").trim();
  const dueDateRaw = String(formData.get("dueDate") || "");
  if (!title) throw new Error("Task title is required");
  return {
    title,
    description: description || null,
    assignee: assignee || null,
    dueDate: dueDateRaw ? new Date(dueDateRaw) : null,
  };
}

function revalidateTasks() {
  revalidatePath("/tasks");
  revalidatePath("/clients", "layout");
}

// The coach sets tasks; clients work them (status + comments).
export async function createTask(formData: FormData) {
  await requireCoach();
  const clientId = String(formData.get("clientId") || "") || null;
  await prisma.task.create({ data: { ...taskFields(formData), clientId } });
  revalidateTasks();
}

export async function updateTask(id: string, formData: FormData) {
  await requireCoach();
  await prisma.task.update({ where: { id }, data: taskFields(formData) });
  revalidateTasks();
}

export async function deleteTask(id: string) {
  await requireCoach();
  await prisma.task.delete({ where: { id } });
  revalidateTasks();
}

export async function updateTaskStatus(id: string, status: string) {
  if (!["NOT_STARTED", "IN_PROGRESS", "BLOCKED", "DONE"].includes(status)) throw new Error("Invalid status");
  const task = await prisma.task.findUnique({ where: { id }, select: { clientId: true } });
  if (!task) throw new Error("Task not found");
  await requireClientAccess(task.clientId ?? "");

  await prisma.task.update({ where: { id }, data: { status: status as never } });
  revalidateTasks();
}

export async function addTaskComment(taskId: string, formData: FormData) {
  const body = String(formData.get("body") || "").trim();
  if (!body) return;
  const task = await prisma.task.findUnique({ where: { id: taskId }, select: { clientId: true } });
  if (!task) throw new Error("Task not found");
  const user = await requireClientAccess(task.clientId ?? "");

  await prisma.taskComment.create({
    data: { taskId, body, userId: user.id, authorName: user.name, authorRole: user.role },
  });
  // ponytail: Slack "task updated" post goes here once the Slack integration lands
  await prisma.task.update({ where: { id: taskId }, data: { updatedAt: new Date() } });
  revalidateTasks();
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

export async function updateOnboardingStepTemplate(formData: FormData) {
  await requireCoach();
  const id = String(formData.get("id") || "");
  const title = String(formData.get("title") || "").trim();
  const description = String(formData.get("description") || "").trim();
  if (!title) throw new Error("Title is required");
  await prisma.onboardingStepTemplate.update({ where: { id }, data: { title, description: description || null } });
  revalidatePath("/settings");
  revalidatePath("/clients", "layout");
}

/** Removes the step and every client's tick on it. */
export async function deleteOnboardingStepTemplate(formData: FormData) {
  await requireCoach();
  const id = String(formData.get("id") || "");
  await prisma.$transaction([
    prisma.clientOnboardingStep.deleteMany({ where: { templateId: id } }),
    prisma.onboardingStepTemplate.delete({ where: { id } }),
  ]);
  revalidatePath("/settings");
  revalidatePath("/clients", "layout");
}

/** Coach edits a client's details. The slug (page address) stays the same so existing links keep working. */
export async function updateClient(clientId: string, formData: FormData): Promise<{ error?: string }> {
  await requireCoach();
  const name = String(formData.get("name") || "").trim();
  const email = String(formData.get("email") || "").trim().toLowerCase();
  const description = String(formData.get("description") || "").trim();
  const programId = String(formData.get("programId") || "") || null;
  const status = String(formData.get("status") || "");
  if (!name) return { error: "Client name is required" };
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { error: "That email doesn't look right" };
  if (!["ACTIVE", "ONBOARDING", "CHURNED"].includes(status)) return { error: "Pick a status" };
  await prisma.client.update({
    where: { id: clientId },
    data: { name, email: email || null, description: description || null, programId, status: status as "ACTIVE" | "ONBOARDING" | "CHURNED" },
  });
  revalidatePath("/clients", "layout");
  revalidatePath("/dashboard");
  return {};
}

// ── Gameplan (Figma embed) ───────────────────────────────────────────────
export async function saveDriveUrl(clientId: string, formData: FormData): Promise<{ error?: string }> {
  await requireCoach();
  const url = String(formData.get("driveUrl") || "").trim();
  if (url && !/^https:\/\/(drive|docs)\.google\.com\//.test(url)) return { error: "Paste a Google Drive link (https://drive.google.com/…)" };
  await prisma.client.update({ where: { id: clientId }, data: { driveUrl: url || null } });
  revalidatePath("/clients", "layout");
  return {};
}

export async function saveHiddenTabs(clientId: string, hidden: string[]) {
  await requireCoach();
  const valid = new Set<string>(CLIENT_TABS.map((t) => t.key));
  await prisma.client.update({ where: { id: clientId }, data: { hiddenTabs: hidden.filter((k) => valid.has(k)) } });
  revalidatePath("/clients", "layout");
}

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
  const crmType = String(formData.get("crmType") || "").trim();
  const crmApiKeyOrUrl = String(formData.get("crmApiKeyOrUrl") || "").trim();

  await prisma.integrationSettings.upsert({
    where: { id: "singleton" },
    update: { crmType, crmApiKeyOrUrl },
    create: { id: "singleton", crmType, crmApiKeyOrUrl },
  });
  revalidatePath("/settings");
}

// ── Playbooks — modules & lessons ────────────────────────────────────────
function revalidatePlaybooks() {
  revalidatePath("/settings");
  revalidatePath("/clients", "layout");
}

export async function createModule(formData: FormData) {
  await requireCoach();
  const title = String(formData.get("title") || "").trim();
  if (!title) throw new Error("Module title is required");
  const count = await prisma.module.count();
  await prisma.module.create({ data: { title, order: count } });
  revalidatePlaybooks();
}

export async function updateModule(id: string, title: string) {
  await requireCoach();
  if (!title.trim()) throw new Error("Module title is required");
  await prisma.module.update({ where: { id }, data: { title: title.trim() } });
  revalidatePlaybooks();
}

/** Removes a module, its lessons and every client's progress on them. */
export async function deleteModule(id: string) {
  await requireCoach();
  await prisma.$transaction([
    prisma.clientLessonProgress.deleteMany({ where: { lesson: { moduleId: id } } }),
    prisma.lesson.deleteMany({ where: { moduleId: id } }),
    prisma.module.delete({ where: { id } }),
  ]);
  revalidatePlaybooks();
}

function lessonFields(formData: FormData): { error: string } | { title: string; videoUrl: string | null; content: string | null } {
  const title = String(formData.get("title") || "").trim();
  const videoUrl = String(formData.get("videoUrl") || "").trim();
  const content = String(formData.get("content") || "").trim();
  if (!title) return { error: "Lesson title is required" };
  if (videoUrl && !/^https?:\/\/\S+$/.test(videoUrl)) return { error: "The video link should start with https://" };
  // Content is HTML from the editor; it's sanitized every time it's shown (components/RichText.tsx).
  if (content.length > 200_000) return { error: "That lesson is too long — split it into two lessons" };
  return { title, videoUrl: videoUrl || null, content: content || null };
}

/** Returns { error } instead of throwing so the form can show the message. */
export async function createLesson(formData: FormData): Promise<{ error?: string }> {
  await requireCoach();
  const moduleId = String(formData.get("moduleId") || "");
  if (!moduleId) return { error: "Choose a module" };
  const fields = lessonFields(formData);
  if ("error" in fields) return fields;
  const count = await prisma.lesson.count({ where: { moduleId } });
  await prisma.lesson.create({ data: { ...fields, moduleId, order: count } });
  revalidatePlaybooks();
  return {};
}

export async function updateLesson(id: string, formData: FormData): Promise<{ error?: string }> {
  await requireCoach();
  const fields = lessonFields(formData);
  if ("error" in fields) return fields;
  const moduleId = String(formData.get("moduleId") || "");
  await prisma.lesson.update({ where: { id }, data: { ...fields, ...(moduleId ? { moduleId } : {}) } });
  revalidatePlaybooks();
  return {};
}

export async function deleteLesson(id: string) {
  await requireCoach();
  await prisma.$transaction([prisma.clientLessonProgress.deleteMany({ where: { lessonId: id } }), prisma.lesson.delete({ where: { id } })]);
  revalidatePlaybooks();
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
// Returns { error } instead of throwing: Next.js hides thrown messages in production builds.
export async function createUser(formData: FormData): Promise<{ email: string; tempPassword: string } | { error: string }> {
  await requireCoach();

  const name = String(formData.get("name") || "").trim();
  const email = String(formData.get("email") || "").trim().toLowerCase();
  const role = String(formData.get("role") || "CLIENT") as "COACH" | "CLIENT";
  const clientId = String(formData.get("clientId") || "") || null;

  if (!name) return { error: "Name is required" };
  if (!email) return { error: "Email is required" };
  if (role === "CLIENT" && !clientId) return { error: "A client user must be linked to a client" };

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) return { error: "A user with that email already exists" };

  const tempPassword = randomCode(20); // Clerk requires 15+ characters
  const clerk = await getClerkAdminClient();

  const [firstName, ...rest] = name.split(" ");
  const lastName = rest.join(" ") || undefined;
  // Some Clerk instances require a username even when email is the primary
  // identifier. Auto-generate one so this works either way — safe to remove
  // the `username` field below once you've turned Username off in the
  // Clerk dashboard (Configure → Email, Phone, Username).
  const username = email.split("@")[0].replace(/[^a-zA-Z0-9_]/g, "") + "_" + Math.floor(Math.random() * 10000);

  let clerkUser;
  try {
    clerkUser = await clerk.users.createUser({
      emailAddress: [email],
      password: tempPassword,
      username,
      firstName,
      lastName,
      skipPasswordChecks: false,
    });
  } catch (e: unknown) {
    const message =
      (e as { errors?: { message?: string }[] })?.errors?.[0]?.message ||
      (e instanceof Error ? e.message : "Failed to create the login");
    console.error("createUser: Clerk createUser failed", e);
    return { error: message };
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
    console.error("createUser: saving app user failed", e);
    await clerk.users.deleteUser(clerkUser.id);
    return { error: "Login was created but saving the profile failed - check the server logs" };
  }

  revalidatePath("/settings");
  return { email, tempPassword };
}

/** Coach edits a login's name / email — in Clerk too, so their sign-in email changes with it. */
export async function updateUser(userId: string, name: string, email: string): Promise<{ error?: string }> {
  await requireCoach();
  name = name.trim();
  email = email.trim().toLowerCase();
  if (!name) return { error: "Name is required" };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { error: "Enter a valid email" };

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return { error: "User not found" };
  if (email !== user.email && (await prisma.user.findUnique({ where: { email } }))) return { error: "A user with that email already exists" };

  try {
    const clerk = await getClerkAdminClient();
    const [firstName, ...rest] = name.split(" ");
    await clerk.users.updateUser(user.clerkId, { firstName, lastName: rest.join(" ") || undefined });
    if (email !== user.email) {
      const existing = await clerk.users.getUser(user.clerkId);
      await clerk.emailAddresses.createEmailAddress({ userId: user.clerkId, emailAddress: email, verified: true, primary: true });
      for (const e of existing.emailAddresses) {
        if (e.emailAddress.toLowerCase() !== email) await clerk.emailAddresses.deleteEmailAddress(e.id);
      }
    }
  } catch (e: unknown) {
    return { error: (e as { errors?: { message?: string }[] })?.errors?.[0]?.message || (e instanceof Error ? e.message : "Couldn't update the login") };
  }

  await prisma.user.update({ where: { id: userId }, data: { name, email } });
  revalidatePath("/settings");
  return {};
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

/** Single-use Clerk sign-in token so a user can log in from a link without a password. */
export async function createMagicLoginToken(userId: string): Promise<string> {
  await requireCoach();

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new Error("User not found");

  const clerk = await getClerkAdminClient();
  const { token } = await clerk.signInTokens.createSignInToken({
    userId: user.clerkId,
    expiresInSeconds: 60 * 60 * 24 * 7,
  });
  return token;
}

// ── Sessions ──────────────────────────────────────────────────────────────
// <input type="datetime-local"> sends wall-clock time with no zone ("2026-10-14T10:00").
// Coaching runs on Sydney time, so read it as Sydney — not the server's zone (UTC in production).
function parseSydneyDateTime(raw: string): Date | null {
  const m = raw.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/);
  return m ? sydneyLocalToDate(+m[1], +m[2], +m[3], +m[4], +m[5]) : null;
}

function revalidateSessions() {
  revalidatePath("/sessions");
  revalidatePath("/dashboard");
  revalidatePath("/clients", "layout");
}

export async function createSession(formData: FormData) {
  const clientId = String(formData.get("clientId") || "");
  const scheduledAtRaw = String(formData.get("scheduledAt") || "");
  const durationMin = Number(formData.get("durationMin") || 45);
  const notes = String(formData.get("notes") || "").trim();

  if (!clientId) throw new Error("Choose a client");
  if (!scheduledAtRaw) throw new Error("Choose a date and time");

  // A client can only book against their own record; a coach can book for anyone.
  await requireClientAccess(clientId);
  const scheduledAt = parseSydneyDateTime(scheduledAtRaw);
  if (!scheduledAt) throw new Error("Choose a valid date and time");

  await prisma.session.create({
    data: {
      clientId,
      scheduledAt,
      durationMin: Number.isFinite(durationMin) && durationMin > 0 ? durationMin : 45,
      notes: notes || null,
    },
  });

  revalidateSessions();
}

export async function updateSessionStatus(id: string, status: string) {
  const session = await prisma.session.findUnique({ where: { id }, select: { clientId: true } });
  if (!session) throw new Error("Session not found");
  await requireClientAccess(session.clientId);

  await prisma.session.update({ where: { id }, data: { status: status as never } });

  revalidateSessions();
}

// ── Swarm tracking integration ───────────────────────────────────────────
// The Bakery never shares a database with Swarm and never sends Swarm's admin
// credentials to any browser. Everything below either updates our own
// `Client` row, or makes a server-to-server call to Swarm using
// SWARM_DASHBOARD_USER/PASS (held only in this server's env).
// SWARM_URL/swarmAuthHeader/normalizeDomain/swarmEmbedSnippet live in
// lib/swarm-config.ts (not here) since swarmEmbedSnippet is a plain sync
// string builder, and every export from a "use server" file must be async.
// Import swarmEmbedSnippet from "@/lib/swarm-config" directly wherever it's
// used — not re-exported from here.
import { SWARM_URL, swarmAuthHeader, normalizeDomain } from "./swarm-config";

/** Sets/updates the client's website URL. Doesn't touch Swarm — that only happens on verify. */
export async function saveTrackingWebsite(clientId: string, formData: FormData) {
  await requireClientAccess(clientId);

  const websiteUrl = String(formData.get("websiteUrl") || "").trim();
  if (!websiteUrl) throw new Error("Enter a website URL");
  try {
    new URL(websiteUrl);
  } catch {
    throw new Error("That doesn't look like a valid URL (include https://)");
  }

  await prisma.client.update({
    where: { id: clientId },
    data: { trackingWebsiteUrl: websiteUrl, trackingVerifiedAt: null },
  });

  revalidatePath("/clients");
}

/**
 * Calls Swarm's real POST /clients/verify — Swarm fetches the site
 * server-side, confirms the pixel script is actually there, and (only if
 * found) registers + marks the domain verified on its own side too.
 */
export async function verifyTrackingInstall(clientId: string) {
  await requireClientAccess(clientId);

  const client = await prisma.client.findUnique({ where: { id: clientId }, select: { trackingWebsiteUrl: true } });
  if (!client?.trackingWebsiteUrl) throw new Error("Add a website URL first");

  const domain = normalizeDomain(client.trackingWebsiteUrl);

  let result: {
    verified: boolean;
    checkedUrl?: string;
    httpStatus?: number;
    error?: string;
    cacheDetected?: Record<string, string> | null;
  };
  try {
    const res = await fetch(`${SWARM_URL}/clients/verify`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...swarmAuthHeader() },
      body: JSON.stringify({ domain }),
      signal: AbortSignal.timeout(15000),
      cache: "no-store",
    });
    if (res.status === 401) throw new Error("Swarm rejected our credentials — check SWARM_DASHBOARD_USER/PASS");
    if (!res.ok) throw new Error(`Swarm returned an unexpected error (HTTP ${res.status})`);
    result = await res.json();
  } catch (e) {
    return {
      verified: false,
      error:
        e instanceof Error && e.name === "TimeoutError"
          ? "The site took too long to respond — it may be slow, blocking automated requests, or temporarily down. Try again."
          : e instanceof Error
            ? e.message
            : "Couldn't reach Swarm to verify",
    };
  }
  let hasReceivedData = false;
  let visitorCount = 0;
  if (result.verified) {
    await prisma.client.update({ where: { id: clientId }, data: { trackingVerifiedAt: new Date() } });

    // Script tag being present on the page doesn't prove it's actually
    // firing — check whether Swarm has genuinely recorded any real traffic
    // for this domain yet, as a second, stronger confirmation signal.
    try {
      const summaryRes = await fetch(`${SWARM_URL}/reports/summary?site=${encodeURIComponent(domain)}`, {
        headers: swarmAuthHeader(),
        cache: "no-store",
        signal: AbortSignal.timeout(8000),
      });
      if (summaryRes.ok) {
        const summary = await summaryRes.json();
        visitorCount = Number(summary?.total_visitors) || 0;
        hasReceivedData = visitorCount > 0;
      }
    } catch {
      // Non-fatal — the script IS confirmed installed either way; this just
      // couldn't confirm live data yet. Don't fail verification over it.
    }
  }

  revalidatePath("/clients");
  return { ...result, hasReceivedData, visitorCount };
}

/**
 * Mints a short-lived, opaque, single-purpose token scoped to exactly this
 * client's domain — this is what goes in the iframe src, NOT the domain
 * itself. Swarm resolves the real domain server-side on every request; the
 * token reveals nothing if intercepted, and expires in 45 minutes even if
 * never used. Called fresh on every Tracking-tab page render.
 */
export async function getSwarmEmbedUrl(clientId: string): Promise<string | null> {
  await requireClientAccess(clientId);

  const client = await prisma.client.findUnique({ where: { id: clientId }, select: { trackingWebsiteUrl: true, trackingVerifiedAt: true } });
  if (!client?.trackingWebsiteUrl || !client.trackingVerifiedAt) return null;

  const domain = normalizeDomain(client.trackingWebsiteUrl);

  try {
    const res = await fetch(`${SWARM_URL}/embed/session`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...swarmAuthHeader() },
      body: JSON.stringify({ domain }),
      signal: AbortSignal.timeout(10000),
      cache: "no-store",
    });
    if (!res.ok) return null;
    const { token } = await res.json();
    return `${SWARM_URL}/dashboard/swarm?embed_token=${encodeURIComponent(token)}`;
  } catch {
    return null;
  }
}
// ── Lead sheets (Google Sheets → Leads / Breakdown / Growth) ──────────────
// Errors come back as { error } so the real message shows in production.
function errorMessage(e: unknown) {
  return e instanceof Error ? e.message : String(e);
}

// The client (or their coach) works with the client's own connected Google account.
export async function getSpreadsheetTabs(clientId: string, spreadsheetId: string): Promise<{ title?: string; tabs?: string[]; error?: string }> {
  await requireClientAccess(clientId);
  try {
    return await listSheetTabs(await getValidAccessToken(clientId), spreadsheetId);
  } catch (e) {
    return { error: errorMessage(e) };
  }
}

export async function getSheetHeaders(clientId: string, spreadsheetId: string, sheetName: string): Promise<{ headers?: string[]; detected?: string | null; error?: string }> {
  await requireClientAccess(clientId);
  try {
    const { headers } = await getSheetValues(await getValidAccessToken(clientId), spreadsheetId, sheetName);
    const named = headers.filter(Boolean);
    if (!named.length) return { error: "That tab's first row is empty — it needs column headers" };
    return { headers: named, detected: detectStatusColumn(named) };
  } catch (e) {
    return { error: errorMessage(e) };
  }
}

export async function connectClientSheet(
  clientId: string,
  input: { spreadsheetId: string; spreadsheetName: string; sheetName: string; statusColumn: string },
): Promise<{ summary?: SyncSummary; error?: string }> {
  await requireClientAccess(clientId);
  const current = await prisma.clientSheet.findUnique({ where: { clientId } });
  const sameSheet = current?.spreadsheetId === input.spreadsheetId && current?.sheetName === input.sheetName;

  await prisma.$transaction([
    // A different sheet = different leads; start clean so the old ones don't linger as "removed".
    ...(current && !sameSheet ? [prisma.lead.deleteMany({ where: { clientId } })] : []),
    prisma.clientSheet.upsert({
      where: { clientId },
      create: { clientId, ...input },
      update: { ...input, ...(sameSheet ? {} : { lastSyncedAt: null, lastSyncError: null, unmappedStatuses: Prisma.DbNull }) },
    }),
  ]);
  return syncLeads(clientId);
}

export async function syncLeads(clientId: string): Promise<{ summary?: SyncSummary; error?: string }> {
  await requireClientAccess(clientId);
  try {
    const summary = await syncClientSheet(clientId);
    revalidatePath("/clients", "layout");
    return { summary };
  } catch (e) {
    revalidatePath("/clients", "layout");
    return { error: errorMessage(e) };
  }
}

/** Teach the sync what an unrecognised Prospect Status value means, then re-sync. */
export async function mapLeadStatus(clientId: string, value: string, stage: string): Promise<{ summary?: SyncSummary; error?: string }> {
  await requireCoach();
  if (!(LEAD_STAGES as readonly string[]).includes(stage)) return { error: "Unknown stage" };
  const sheet = await prisma.clientSheet.findUnique({ where: { clientId } });
  if (!sheet) return { error: "No sheet connected" };
  const mapping = { ...((sheet.statusMapping as Record<string, string> | null) ?? {}), [normalizeStatus(value)]: stage };
  await prisma.clientSheet.update({ where: { clientId }, data: { statusMapping: mapping } });
  return syncLeads(clientId);
}

export async function disconnectClientSheet(clientId: string) {
  await requireCoach();
  await prisma.$transaction([prisma.lead.deleteMany({ where: { clientId } }), prisma.clientSheet.deleteMany({ where: { clientId } })]);
  revalidatePath("/clients", "layout");
}

/** Removes the client's Google connection. The sheet setup and synced leads stay; syncing resumes after reconnecting. */
export async function disconnectClientGoogle(clientId: string) {
  await requireClientAccess(clientId);
  await prisma.googleAccountConnection.deleteMany({ where: { clientId } });
  revalidatePath("/clients", "layout");
}

// ── Weekly status (the weekly coaching call write-up) ─────────────────────
export async function saveWeeklyUpdate(clientId: string, id: string | null, formData: FormData): Promise<{ error?: string }> {
  const user = await requireCoach();
  const callDateRaw = String(formData.get("callDate") || "");
  const summary = String(formData.get("summary") || "").trim();
  const nextSteps = String(formData.get("nextSteps") || "")
    .split("\n")
    .map((s) => s.replace(/^\s*(?:[-*•]|\d+[.)])\s*/, "").trim()) // strip "- ", "• ", "1. " list markers
    .filter(Boolean);
  const internalNotes = String(formData.get("internalNotes") || "").trim();
  const nextCallRaw = String(formData.get("nextCallAt") || "");
  if (!callDateRaw) return { error: "Pick the call date" };
  if (callDateRaw > sydneyDay(new Date())) return { error: "That date is in the future — log a call once it's happened, or use Schedule call to book one" };
  const nextCallAt = nextCallRaw ? parseSydneyDateTime(nextCallRaw) : null;
  if (nextCallRaw && (!nextCallAt || nextCallAt < new Date())) return { error: "The next call needs a date and time in the future" };
  if (!summary && !nextSteps.length) return { error: "Add a summary or at least one next step" };

  const data = { callDate: new Date(callDateRaw), summary, nextSteps, internalNotes: internalNotes || null };
  if (id) {
    const existing = await prisma.weeklyUpdate.findUnique({ where: { id }, select: { nextSteps: true, stepsDone: true } });
    if (!existing) return { error: "Update not found" };
    // Keep ticks on steps whose text didn't change.
    const stillDone = existing.stepsDone.map((i) => nextSteps.indexOf(existing.nextSteps[i])).filter((i) => i !== -1);
    await prisma.weeklyUpdate.update({ where: { id }, data: { ...data, stepsDone: stillDone } });
  } else {
    await prisma.weeklyUpdate.create({ data: { ...data, clientId, stepsDone: [], createdBy: user.name } });
  }
  if (nextCallAt) await prisma.session.create({ data: { clientId, scheduledAt: nextCallAt, durationMin: 45 } });
  revalidateSessions();
  return {};
}

export async function deleteWeeklyUpdate(id: string) {
  await requireCoach();
  await prisma.weeklyUpdate.delete({ where: { id } });
  revalidatePath("/clients", "layout");
}

export async function toggleWeeklyStep(id: string, index: number, done: boolean) {
  const update = await prisma.weeklyUpdate.findUnique({ where: { id }, select: { clientId: true, nextSteps: true, stepsDone: true } });
  if (!update) throw new Error("Update not found");
  await requireClientAccess(update.clientId);
  if (!Number.isInteger(index) || index < 0 || index >= update.nextSteps.length) throw new Error("Invalid step");
  const set = new Set(update.stepsDone);
  if (done) set.add(index);
  else set.delete(index);
  await prisma.weeklyUpdate.update({ where: { id }, data: { stepsDone: Array.from(set).sort((a, b) => a - b) } });
  revalidatePath("/clients", "layout");
}

// ── Meta (Facebook) Ads — per client ──────────────────────────────────────
export async function connectMetaAds(clientId: string, rawAccountId: string, accessToken: string): Promise<{ error?: string }> {
  await requireClientAccess(clientId);
  const adAccountId = normalizeAccountId(rawAccountId);
  if (!adAccountId) return { error: "The ad account ID is the number in Ads Manager, e.g. act_1234567890 or just 1234567890" };
  if (!accessToken.trim()) return { error: "Paste an access token" };
  try {
    // Verify before saving, so a typo never sits there looking "connected".
    const account = await verifyMetaAccount(adAccountId, accessToken.trim());
    await prisma.client.update({
      where: { id: clientId },
      data: { metaAdAccountId: adAccountId, metaAccountName: account.name, metaAccessToken: encryptToken(accessToken.trim()) },
    });
  } catch (e) {
    return metaErrorInfo(e);
  }
  revalidatePath("/clients", "layout");
  return {};
}

export async function disconnectMetaAds(clientId: string) {
  await requireClientAccess(clientId);
  await prisma.client.update({ where: { id: clientId }, data: { metaAdAccountId: null, metaAccountName: null, metaAccessToken: null } });
  revalidatePath("/clients", "layout");
}

/** Live Meta numbers for the Ads tab — fetched after the page loads so the page never waits on Meta. */
export async function getAdsReport(clientId: string, since: string | null, until: string | null): Promise<{ report?: MetaReport; error?: string; reconnect?: boolean }> {
  await requireClientAccess(clientId);
  const client = await prisma.client.findUnique({ where: { id: clientId }, select: { metaAdAccountId: true, metaAccessToken: true } });
  if (!client?.metaAdAccountId || !client.metaAccessToken) return { error: "No ad account connected", reconnect: true };
  try {
    return { report: await getMetaReport(client.metaAdAccountId, client.metaAccessToken, since, until) };
  } catch (e) {
    return metaErrorInfo(e);
  }
}

/** Ad accounts the client's connected Facebook login can see — for the account picker. */
export async function getMetaAdAccounts(clientId: string): Promise<{ accounts?: MetaAdAccount[]; error?: string; reconnect?: boolean }> {
  await requireClientAccess(clientId);
  const client = await prisma.client.findUnique({ where: { id: clientId }, select: { metaAccessToken: true } });
  if (!client?.metaAccessToken) return { error: "Facebook isn't connected", reconnect: true };
  try {
    return { accounts: await listMetaAdAccounts(decryptToken(client.metaAccessToken)) };
  } catch (e) {
    return metaErrorInfo(e);
  }
}

export async function selectMetaAdAccount(clientId: string, adAccountId: string): Promise<{ error?: string }> {
  const r = await getMetaAdAccounts(clientId); // also checks access
  if (r.error) return { error: r.error };
  const account = r.accounts!.find((a) => a.id === adAccountId);
  if (!account) return { error: "That ad account isn't available to this Facebook login" };
  await prisma.client.update({ where: { id: clientId }, data: { metaAdAccountId: account.id, metaAccountName: account.name } });
  revalidatePath("/clients", "layout");
  return {};
}

// ── Coach previewing the client portal ────────────────────────────────────
/** Coach-only: render client pages exactly as the client sees them (until switched off). */
export async function setClientPreview(on: boolean) {
  await requireCoach();
  if (on) cookies().set(CLIENT_PREVIEW_COOKIE, "1", { path: "/", httpOnly: true, sameSite: "lax", maxAge: 60 * 60 * 8 });
  else cookies().delete(CLIENT_PREVIEW_COOKIE);
  revalidatePath("/clients", "layout");
}
