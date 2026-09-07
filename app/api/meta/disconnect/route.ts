import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireCoach } from "@/lib/auth";

export async function POST(req: NextRequest) {
  await requireCoach();
  const { clientId } = await req.json();
  if (!clientId) return NextResponse.json({ error: "clientId is required" }, { status: 400 });

  await prisma.client.update({
    where: { id: clientId },
    data: { metaAdAccountId: null, metaAccessToken: null },
  });

  return NextResponse.json({ ok: true });
}