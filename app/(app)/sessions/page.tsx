import { prisma } from "@/lib/prisma";
import { createSession, updateSessionStatus } from "@/lib/actions";
import { requireCoach } from "@/lib/auth";
import SessionList from "@/components/SessionList";

export const dynamic = "force-dynamic";

export default async function SessionsPage() {
  await requireCoach(); // agency-wide session calendar; clients see their own sessions on their client page

  const [sessions, clients] = await Promise.all([
    prisma.session.findMany({
      orderBy: { scheduledAt: "desc" },
      include: { client: { select: { name: true, slug: true } } },
    }),
    prisma.client.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } }),
  ]);

  const sessionData = sessions.map((s) => ({
    id: s.id,
    clientName: s.client.name,
    clientSlug: s.client.slug,
    scheduledAt: s.scheduledAt.toISOString(),
    durationMin: s.durationMin,
    status: s.status,
    notes: s.notes,
  }));

  return (
    <div className="p-10 max-w-[1500px] mx-auto">
      <div className="mb-6">
        <h1 className="font-heading text-3xl font-bold" style={{ color: "var(--text-primary)" }}>Sessions</h1>
        <p style={{ color: "var(--text-secondary)" }}>Every coaching session across every client.</p>
      </div>
      <SessionList initialSessions={sessionData} clients={clients} onCreate={createSession} onUpdateStatus={updateSessionStatus} />
    </div>
  );
}