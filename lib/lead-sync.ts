import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getSheetValues, getValidAccessToken } from "@/lib/google-sheets";
import {
  DATE_OPT_IN_KEYWORDS,
  findColumn,
  findHeaderIndex,
  formatSheetDate,
  normalizeEmail,
  normalizeHeader,
  normalizeName,
  normalizePhone,
  normalizeStatus,
  parseSheetDate,
  serialToDate,
} from "@/lib/sheet-parse";
import { impliedSteps, resolveStatus, type LeadStageValue } from "@/lib/lead-stages";

export type SyncSummary = { rows: number; leads: number; created: number; updated: number; removed: number; unmapped: number };

function parseMoney(v: unknown): number | null {
  if (typeof v === "number") return Number.isFinite(v) && v !== 0 ? v : null;
  const n = Number(String(v ?? "").replace(/[^0-9.-]/g, ""));
  return Number.isFinite(n) && n !== 0 ? n : null;
}

function parseMapping(json: unknown): Record<string, LeadStageValue> {
  if (!json || typeof json !== "object") return {};
  return Object.fromEntries(Object.entries(json as Record<string, LeadStageValue>).map(([k, v]) => [normalizeStatus(k), v]));
}

/** Pulls a client's sheet into Lead rows. Records the outcome on ClientSheet either way. */
export async function syncClientSheet(clientId: string): Promise<SyncSummary> {
  const sheet = await prisma.clientSheet.findUnique({ where: { clientId } });
  if (!sheet) throw new Error("No sheet connected for this client");
  try {
    return await runSync(sheet);
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    await prisma.clientSheet.update({ where: { id: sheet.id }, data: { lastSyncError: message.slice(0, 500) } });
    throw e;
  }
}

/** Every connected sheet, one at a time (cron). Failures are recorded per client and don't stop the rest. */
export async function syncAllSheets() {
  const sheets = await prisma.clientSheet.findMany({ where: { client: { isActive: true } }, select: { clientId: true } });
  const results: { clientId: string; ok: boolean; error?: string }[] = [];
  for (const { clientId } of sheets) {
    try {
      await syncClientSheet(clientId);
      results.push({ clientId, ok: true });
    } catch (e) {
      results.push({ clientId, ok: false, error: e instanceof Error ? e.message : String(e) });
    }
  }
  return results;
}

type Sheet = NonNullable<Awaited<ReturnType<typeof prisma.clientSheet.findUnique>>>;

async function runSync(sheet: Sheet): Promise<SyncSummary> {
  const token = await getValidAccessToken(sheet.clientId);
  const { headers, rows, cells } = await getSheetValues(token, sheet.spreadsheetId, sheet.sheetName);

  const statusIdx = findHeaderIndex(headers, sheet.statusColumn);
  // A missing status column would quietly turn every lead into NEW — stop and say why.
  if (sheet.statusColumn && statusIdx === -1) throw new Error(`Status column '${sheet.statusColumn}' not found in the sheet`);

  const nameIdx = findColumn(headers, ["name", "full name"], ["campaign", "ad", "adset", "ad set", "business", "first", "last"]);
  const firstIdx = findColumn(headers, ["first name"]);
  const lastIdx = findColumn(headers, ["last name", "surname"]);
  const phoneIdx = findColumn(headers, ["phone", "mobile"]);
  const emailIdx = findColumn(headers, ["email"]);
  const sourceIdx = findColumn(headers, ["source", "platform"], ["utm"]);
  const campaignIdx = findColumn(headers, ["campaign"]);
  const valueIdx = findColumn(headers, ["quote value", "job value", "deal value", "value", "revenue generated", "revenue", "amount"]);
  const dateIdx = findColumn(headers, [...DATE_OPT_IN_KEYWORDS, "lead date", "date added", "created", "submitted", "date"]);
  const dateLike = new Set(headers.map((h, i) => (normalizeHeader(h).split(" ").includes("date") ? i : -1)).filter((i) => i !== -1));

  const mapping = parseMapping(sheet.statusMapping);
  const unmapped: Record<string, number> = {};
  const isInitial = !sheet.lastSyncedAt; // first import: dates come from the sheet, not from now
  const now = new Date();

  // Every lead this client has had from the sheet, removed ones included — a
  // row that reappears gets its old lead back instead of a duplicate.
  const existing = await prisma.lead.findMany({
    where: { clientId: sheet.clientId },
    include: { stageEvents: { select: { stage: true } } },
  });
  type Existing = (typeof existing)[number];
  const byEmail = new Map<string, Existing>();
  const byPhone = new Map<string, Existing>();
  const byName = new Map<string, Existing>();
  for (const l of [...existing].sort((a, b) => Number(!!b.deletedAt) - Number(!!a.deletedAt))) {
    if (l.email) byEmail.set(normalizeEmail(l.email), l);
    if (l.phone) byPhone.set(normalizePhone(l.phone), l);
    if (l.name) byName.set(normalizeName(l.name), l);
  }

  // Match order: email, then phone, then name. A lead matched by one row can't
  // be claimed by another row through the weaker phone/name fallback.
  // ponytail: two different people with the same name and no email/phone merge. Fine at coaching volumes.
  const claimed = new Map<string, number>();
  const seen = new Set<string>();
  const createdIdentities = new Set<string>(); // a new lead listed twice in the sheet is created once
  const summary: SyncSummary = { rows: rows.length, leads: 0, created: 0, updated: 0, removed: 0, unmapped: 0 };
  const ops: Prisma.PrismaPromise<unknown>[] = [];

  rows.forEach((row, rowIdx) => {
    const text = (i: number) => (i === -1 ? "" : row[i].trim());
    const name = text(nameIdx) || [text(firstIdx), text(lastIdx)].filter(Boolean).join(" ");
    const phoneText = text(phoneIdx);
    const phone = /^4\d{8}$/.test(phoneText) ? "0" + phoneText : phoneText; // a mobile stored as a number loses its 0
    const email = text(emailIdx);
    if (!(email || phone || name)) return; // blank row
    summary.leads++;

    const free = (l: Existing | undefined) => (l && (!claimed.has(l.id) || claimed.get(l.id) === rowIdx) ? l : undefined);
    const match =
      (email && byEmail.get(normalizeEmail(email))) ||
      free(phone ? byPhone.get(normalizePhone(phone)) : undefined) ||
      free(name ? byName.get(normalizeName(name)) : undefined) ||
      undefined;

    const statusRaw = statusIdx === -1 ? "" : text(statusIdx);
    const classified = resolveStatus(statusRaw, mapping, unmapped);
    const optInAt = dateIdx === -1 ? null : parseSheetDate(cells[rowIdx][dateIdx]);
    const raw = Object.fromEntries(
      headers.map((h, i) => {
        const cell = cells[rowIdx][i];
        const shown = dateLike.has(i) && typeof cell === "number" ? (serialToDate(cell) ? formatSheetDate(serialToDate(cell)!) : row[i]) : row[i];
        return [h || `Column ${i + 1}`, shown];
      }),
    );
    const data = {
      name: name || null,
      phone: phone || null,
      email: email || null,
      source: text(sourceIdx) || null,
      campaign: text(campaignIdx) || null,
      stage: classified.stage,
      statusRaw: statusRaw || null,
      value: valueIdx === -1 ? null : parseMoney(cells[rowIdx][valueIdx]),
      optInAt,
      raw,
      externalKey: normalizeName(`${email}|${phone}|${name}`),
    };
    const steps = impliedSteps(classified);

    if (match) {
      claimed.set(match.id, rowIdx);
      seen.add(match.id);
      const have = new Set(match.stageEvents.map((e) => e.stage));
      const newSteps = steps.filter((s) => !have.has(s));
      const changed =
        match.deletedAt !== null ||
        match.name !== data.name ||
        match.phone !== data.phone ||
        match.email !== data.email ||
        match.source !== data.source ||
        match.campaign !== data.campaign ||
        match.stage !== data.stage ||
        match.statusRaw !== data.statusRaw ||
        (match.value === null ? null : Number(match.value)) !== data.value ||
        match.optInAt?.getTime() !== data.optInAt?.getTime() ||
        JSON.stringify(match.raw) !== JSON.stringify(data.raw);
      if (changed) {
        summary.updated++;
        ops.push(prisma.lead.update({ where: { id: match.id }, data: { ...data, deletedAt: null, lastSyncedAt: now } }));
      }
      if (newSteps.length) {
        // Reached since the last sync — the sheet has no edit times, so "now" is the best date we have.
        ops.push(prisma.leadStageEvent.createMany({ data: newSteps.map((stage) => ({ leadId: match.id, stage, at: now })), skipDuplicates: true }));
      }
    } else {
      const ids = [email && `e:${normalizeEmail(email)}`, phone && `p:${normalizePhone(phone)}`, name && `n:${normalizeName(name)}`].filter(Boolean) as string[];
      if (ids.some((id) => createdIdentities.has(id))) return;
      ids.forEach((id) => createdIdentities.add(id));
      summary.created++;
      const at = isInitial ? (optInAt ?? now) : now;
      ops.push(
        prisma.lead.create({
          data: {
            ...data,
            clientId: sheet.clientId,
            lastSyncedAt: now,
            stageEvents: { create: steps.map((stage) => ({ stage, at, inferred: isInitial })) },
          },
        }),
      );
    }
  });

  // Rows gone from the sheet → soft-delete (kept so they come back with history if re-added).
  const gone = existing.filter((l) => !l.deletedAt && !seen.has(l.id)).map((l) => l.id);
  summary.removed = gone.length;
  if (gone.length) ops.push(prisma.lead.updateMany({ where: { id: { in: gone } }, data: { deletedAt: now } }));

  summary.unmapped = Object.values(unmapped).reduce((a, b) => a + b, 0);
  ops.push(
    prisma.clientSheet.update({
      where: { id: sheet.id },
      data: { lastSyncedAt: now, lastSyncError: null, unmappedStatuses: unmapped },
    }),
  );

  // ponytail: one transaction per sync; batch it if a sheet ever grows past a few thousand rows
  await prisma.$transaction(ops);
  return summary;
}
