import { NextRequest, NextResponse } from "next/server";
import { syncAllSheets } from "@/lib/lead-sync";

// Re-syncs every client's lead sheet. Call on a schedule (e.g. every 15 min)
// with header `x-cron-secret: $CRON_SECRET`.
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("x-cron-secret") !== secret) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const results = await syncAllSheets();
  return NextResponse.json({ synced: results.filter((r) => r.ok).length, failed: results.filter((r) => !r.ok) });
}
