import { prisma } from "@/lib/prisma";
import ClientFilter from "@/components/ClientFilter";
import GoogleAccountCard from "@/components/GoogleAccountCard";
import LeadsSheetPanel from "@/components/LeadsSheetPanel";
import { requireUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function LeadsPage({
  searchParams,
}: {
  searchParams: { client?: string; error?: string };
}) {
  const user = await requireUser();

  const [allClients, googleConnection] = await Promise.all([
    prisma.client.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true, slug: true },
    }),
    prisma.googleAccountConnection.findFirst({ orderBy: { connectedAt: "desc" } }),
  ]);

  // A client login never sees the other clients in the picker — this list
  // backs both the dropdown and the fallback/lookup below.
  const clients = user.role === "COACH" ? allClients : allClients.filter((c) => c.id === user.clientId);

  if (clients.length === 0) {
    return (
      <div className="p-10 max-w-[1400px] mx-auto">
        <h1 className="font-heading text-3xl font-bold" style={{ color: "var(--text-primary)" }}>Leads</h1>
        <p className="mt-2" style={{ color: "var(--text-secondary)" }}>Add a client first, then assign their lead sheet here.</p>
      </div>
    );
  }

  const activeSlug = searchParams.client ?? clients[0].slug;
  const activeClient = clients.find((c) => c.slug === activeSlug) ?? clients[0];

  const sheet = await prisma.clientSheet.findUnique({ where: { clientId: activeClient.id } });

  return (
    <div className="p-10 max-w-[1400px] mx-auto space-y-6">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="font-heading text-3xl font-bold" style={{ color: "var(--text-primary)" }}>Leads</h1>
          <p className="text-sm mt-1" style={{ color: "var(--text-secondary)" }}>
            Live lead data pulled from each client's assigned Google Sheet.
          </p>
        </div>
        {user.role === "COACH" && <ClientFilter clients={clients} activeSlug={activeClient.slug} />}
      </div>

      {searchParams.error && (
        <div className="p-3 rounded-lg text-sm" style={{ background: "var(--danger-tint)", color: "var(--danger)" }}>
          Couldn't connect: {searchParams.error}
        </div>
      )}

      {/* The single admin Google account connection is an agency-level
          integration control — not something a client login should see
          or manage. */}
      {user.role === "COACH" && (
        <GoogleAccountCard connected={Boolean(googleConnection)} googleEmail={googleConnection?.googleEmail ?? null} />
      )}

      <LeadsSheetPanel
        clientId={activeClient.id}
        googleConnected={Boolean(googleConnection)}
        spreadsheetId={sheet?.spreadsheetId ?? null}
        spreadsheetName={sheet?.spreadsheetName ?? null}
        sheetName={sheet?.sheetName ?? null}
      />
    </div>
  );
}
