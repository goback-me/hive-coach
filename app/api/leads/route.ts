import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { LEAD_STATUSES } from "@/lib/lead-status";
import { DATE_RANGE_PRESETS, resolveDateRange, type DateRangePreset } from "@/lib/date-range";

// Paginated — the Leads tab can have 1000+ rows once a real sheet is synced,
// so the client never receives more than one page (with its `raw` JSON blob
// per row) at a time. See components/LeadsPanel.tsx.
export async function GET(req: NextRequest) {
  const clientId = req.nextUrl.searchParams.get("clientId");
  if (!clientId) return NextResponse.json({ error: "clientId is required" }, { status: 400 });

  const user = await requireUser();
  if (user.role === "CLIENT" && clientId !== user.clientId) {
    return NextResponse.json({ error: "Not authorized for this client" }, { status: 403 });
  }

  const page = Math.max(1, Number(req.nextUrl.searchParams.get("page") ?? "1") || 1);
  const pageSize = Math.min(100, Math.max(1, Number(req.nextUrl.searchParams.get("pageSize") ?? "25") || 25));
  const statusParam = req.nextUrl.searchParams.get("status");
  const status = statusParam && LEAD_STATUSES.includes(statusParam as never) ? statusParam : undefined;

  const rangeParam = req.nextUrl.searchParams.get("range");
  const preset: DateRangePreset = DATE_RANGE_PRESETS.includes(rangeParam as DateRangePreset)
    ? (rangeParam as DateRangePreset)
    : "maximum";
  const { from, to } = resolveDateRange(preset);
  const createdAt = from || to ? { ...(from ? { gte: from } : {}), ...(to ? { lt: to } : {}) } : undefined;

  const where = { clientId, ...(status ? { status: status as never } : {}), ...(createdAt ? { createdAt } : {}) };

  const [total, leads] = await Promise.all([
    prisma.lead.count({ where }),
    prisma.lead.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
  ]);

  return NextResponse.json({
    total,
    page,
    pageSize,
    leads: leads.map((l) => ({
      id: l.id,
      name: l.name,
      phone: l.phone,
      email: l.email,
      source: l.source,
      campaign: l.campaign,
      status: l.status,
      value: l.value ? Number(l.value) : null,
      raw: l.raw,
      lastSyncedAt: l.lastSyncedAt?.toISOString() ?? null,
    })),
  });
}
