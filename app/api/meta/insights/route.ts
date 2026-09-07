import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getMetaInsights } from "@/lib/meta-ads";
import { requireUser } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const clientId = req.nextUrl.searchParams.get("clientId");
  if (!clientId) return NextResponse.json({ error: "clientId is required" }, { status: 400 });

  const scope = await requireUser();
  if (scope.role === "CLIENT" && clientId !== scope.clientId) {
    return NextResponse.json({ error: "Not authorized for this client" }, { status: 403 });
  }

  const client = await prisma.client.findUnique({ where: { id: clientId } });
  if (!client?.metaAdAccountId || !client?.metaAccessToken) {
    return NextResponse.json({ error: "No Meta ad account connected for this client" }, { status: 400 });
  }

  try {
    const insights = await getMetaInsights(client.metaAdAccountId, client.metaAccessToken);
    return NextResponse.json(insights);
  } catch (err: any) {
    console.error("Meta insights fetch failed:", err);
    return NextResponse.json({ error: err.message ?? "failed" }, { status: 500 });
  }
}