import { NextResponse } from "next/server";
import { getGoogleAuthUrl } from "@/lib/google-sheets";
import { requireCoach } from "@/lib/auth";

// Connects the single Hive Google account (not per-client) — run this once.
export async function GET() {
  await requireCoach();
  return NextResponse.redirect(getGoogleAuthUrl());
}
