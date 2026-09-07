import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireCoach } from "@/lib/auth";
import { LEAD_STATUSES } from "@/lib/lead-status";

// Saves which columns show, and (optionally) which visible column is the
// "status" column used for the filter dropdown. A status column that isn't
// in visibleColumns is rejected — hidden column data never leaves the server,
// so it can't power a filter either. `statusMapping` (sheet value -> one of
// our 6 lead statuses) feeds the Leads tab's sync (lib/lead-sync.ts) — it's
// independent of visibleColumns/the raw-table filter above.
export async function POST(req: NextRequest) {
  await requireCoach();
  const { clientId, visibleColumns, statusColumn, statusMapping } = await req.json();
  if (!clientId || !Array.isArray(visibleColumns)) {
    return NextResponse.json({ error: "clientId and visibleColumns[] are required" }, { status: 400 });
  }
  if (statusColumn && !visibleColumns.includes(statusColumn)) {
    return NextResponse.json({ error: "statusColumn must be one of the visible columns" }, { status: 400 });
  }
  if (statusMapping && typeof statusMapping === "object") {
    for (const v of Object.values(statusMapping)) {
      if (!LEAD_STATUSES.includes(v as never)) {
        return NextResponse.json({ error: `Invalid status mapping value: ${v}` }, { status: 400 });
      }
    }
  }

  await prisma.clientSheet.update({
    where: { clientId },
    data: {
      visibleColumns,
      statusColumn: statusColumn ?? null,
      ...(statusMapping ? { statusMapping } : {}),
    },
  });

  return NextResponse.json({ ok: true });
}
