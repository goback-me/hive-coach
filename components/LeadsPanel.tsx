"use client";

import { Fragment, useState } from "react";
import { disconnectClientSheet, mapLeadStatus, syncLeads } from "@/lib/actions";
import { inDateRange, LEAD_STAGES, money, resolveRange, STAGE_COLOR, STAGE_LABEL, type DateRange, type LeadStageValue, type LeadView } from "@/lib/lead-stages";
import DateRangeBar from "./DateRangeBar";
import BreakdownPanel from "./BreakdownPanel";
import LeadSheetSetup from "./LeadSheetSetup";

export type SheetInfo = {
  spreadsheetId: string;
  spreadsheetName: string;
  sheetName: string;
  statusColumn: string | null;
  lastSyncedAt: string | null;
  lastSyncError: string | null;
  unmapped: Record<string, number>;
};

function timeAgo(iso: string) {
  const mins = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.round(mins / 60);
  return hrs < 24 ? `${hrs}h ago` : `${Math.round(hrs / 24)}d ago`;
}

const PAGE = 100;

export default function LeadsPanel({
  clientId,
  isCoach,
  googleConnected,
  googleEmail,
  googleError,
  sheet,
  leads,
}: {
  clientId: string;
  isCoach: boolean;
  googleConnected: boolean;
  googleEmail: string | null;
  googleError: string | null;
  sheet: SheetInfo | null;
  leads: LeadView[];
}) {
  const [view, setView] = useState<"leads" | "breakdown">("leads");
  const [range, setRange] = useState<DateRange>({ preset: "all" });
  const [stage, setStage] = useState<LeadStageValue | "">("");
  const [q, setQ] = useState("");
  const [shown, setShown] = useState(PAGE);
  const [openId, setOpenId] = useState<string | null>(null);
  const [changing, setChanging] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [message, setMessage] = useState<{ text: string; error?: boolean } | null>(null);

  if (!sheet || changing) {
    return (
      <LeadSheetSetup
        clientId={clientId}
        googleConnected={googleConnected}
        googleEmail={googleEmail}
        googleError={googleError}
        onCancel={sheet ? () => setChanging(false) : undefined}
      />
    );
  }

  async function sync() {
    setSyncing(true);
    setMessage(null);
    const r = await syncLeads(clientId);
    setSyncing(false);
    setMessage(
      r.error
        ? { text: r.error, error: true }
        : { text: `Synced ${r.summary!.leads} leads — ${r.summary!.created} new, ${r.summary!.updated} updated${r.summary!.removed ? `, ${r.summary!.removed} removed` : ""}.` },
    );
  }

  const bounds = resolveRange(range);
  const ranged = leads.filter((l) => inDateRange(l.date, bounds));
  const counts = Object.fromEntries(LEAD_STAGES.map((s) => [s, ranged.filter((l) => l.stage === s).length])) as Record<LeadStageValue, number>;
  const needle = q.trim().toLowerCase();
  const filtered = ranged.filter(
    (l) =>
      (!stage || l.stage === stage) &&
      (!needle || [l.name, l.email, l.phone, l.source, l.campaign, l.statusRaw].some((v) => v?.toLowerCase().includes(needle))),
  );
  const unmapped = Object.entries(sheet.unmapped);

  return (
    <div className="space-y-5">
      {/* Sync bar */}
      <div className="card rounded-2xl px-5 py-4 flex flex-wrap items-center gap-3 text-sm">
        <span className="material-symbols-outlined text-[20px]" style={{ color: "var(--primary)" }}>table_view</span>
        <span style={{ color: "var(--text-primary)" }}>
          <b>{sheet.spreadsheetName}</b> <span style={{ color: "var(--text-muted)" }}>› {sheet.sheetName}</span>
        </span>
        {googleEmail && <span style={{ color: "var(--text-muted)" }}>via {googleEmail}</span>}
        <span style={{ color: sheet.lastSyncError ? "var(--danger)" : "var(--text-muted)" }} suppressHydrationWarning>
          {sheet.lastSyncError ? `Last sync failed: ${sheet.lastSyncError}` : sheet.lastSyncedAt ? `Synced ${timeAgo(sheet.lastSyncedAt)}` : "Not synced yet"}
        </span>
        <div className="ml-auto flex gap-2">
          <a
            href={`https://docs.google.com/spreadsheets/d/${sheet.spreadsheetId}`}
            target="_blank"
            rel="noreferrer"
            className="text-xs font-semibold px-3 py-1.5 rounded-lg"
            style={{ color: "var(--text-primary)", border: "1px solid var(--border-strong)" }}
          >
            Open sheet
          </a>
          <button onClick={() => setChanging(true)} className="text-xs font-semibold px-3 py-1.5 rounded-lg" style={{ color: "var(--text-primary)", border: "1px solid var(--border-strong)" }}>
            {googleConnected ? "Change sheet" : "Google settings"}
          </button>
          {isCoach && (
            <>
              <button
                onClick={async () => {
                  if (confirm("Disconnect this sheet? Synced leads are removed from The Bakery (the sheet itself isn't touched).")) await disconnectClientSheet(clientId);
                }}
                className="text-xs font-semibold px-3 py-1.5 rounded-lg"
                style={{ color: "var(--danger)", border: "1px solid var(--border-strong)" }}
              >
                Disconnect
              </button>
            </>
          )}
          <button onClick={sync} disabled={syncing} className="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-lg disabled:opacity-60" style={{ background: "var(--secondary)", color: "#14150f" }}>
            <span className={`material-symbols-outlined text-[16px] ${syncing ? "animate-spin" : ""}`}>sync</span>
            {syncing ? "Syncing…" : "Sync now"}
          </button>
        </div>
        {message && <p className="w-full text-xs" style={{ color: message.error ? "var(--danger)" : "var(--primary)" }}>{message.text}</p>}
        {!googleConnected && (
          <p className="w-full text-xs flex items-center gap-2" style={{ color: "var(--danger)" }}>
            Google is disconnected for this client, so leads can&apos;t sync.
            <a href={`/api/google/connect?clientId=${clientId}`} className="font-bold underline">
              Connect Google
            </a>
          </p>
        )}
      </div>

      {isCoach && unmapped.length > 0 && <UnmappedStatuses clientId={clientId} unmapped={unmapped} statusColumn={sheet.statusColumn} />}

      <DateRangeBar value={range} onChange={setRange} count={ranged.length} />

      {/* Leads / Breakdown */}
      <div className="flex flex-wrap items-center gap-2">
        {(["leads", "breakdown"] as const).map((v) => (
          <button
            key={v}
            onClick={() => setView(v)}
            className="px-4 py-1.5 rounded-lg text-sm font-semibold"
            style={view === v ? { background: "var(--primary-tint)", color: "var(--primary)" } : { color: "var(--text-secondary)" }}
          >
            {v === "leads" ? "Leads" : "Breakdown"}
          </button>
        ))}
      </div>

      {view === "breakdown" ? (
        <BreakdownPanel leads={ranged} />
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-2">
            <StageChip label="All" count={ranged.length} active={!stage} color="var(--text-primary)" onClick={() => setStage("")} />
            {LEAD_STAGES.filter((s) => counts[s]).map((s) => (
              <StageChip key={s} label={STAGE_LABEL[s]} count={counts[s]} active={stage === s} color={STAGE_COLOR[s]} onClick={() => setStage(stage === s ? "" : s)} />
            ))}
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search name, phone, email…"
              className="ml-auto px-3 py-1.5 rounded-lg outline-none text-sm"
              style={{ background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text-primary)", minWidth: 240 }}
            />
          </div>

          <div className="card rounded-2xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: "1px solid var(--border)" }}>
                  {["Date", "Name", "Phone", "Email", "Source", "Status", "Value"].map((h) => (
                    <th key={h} className={`px-4 py-3 font-medium ${h === "Value" ? "text-right" : "text-left"}`} style={{ color: "var(--text-muted)" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.slice(0, shown).map((l) => (
                  <Fragment key={l.id}>
                    <tr
                      onClick={() => setOpenId(openId === l.id ? null : l.id)}
                      className="cursor-pointer transition-colors hover:bg-[var(--surface-hover)]"
                      style={{ borderBottom: "1px solid var(--border)" }}
                    >
                      <td className="px-4 py-3 whitespace-nowrap" style={{ color: "var(--text-secondary)" }}>
                        {new Date(l.date).toLocaleDateString("en-AU", { day: "numeric", month: "short" })}
                      </td>
                      <td className="px-4 py-3 font-semibold" style={{ color: "var(--text-primary)" }}>{l.name ?? "—"}</td>
                      <td className="px-4 py-3 whitespace-nowrap" style={{ color: "var(--text-secondary)" }}>{l.phone ?? "—"}</td>
                      <td className="px-4 py-3" style={{ color: "var(--text-secondary)" }}>{l.email ?? "—"}</td>
                      <td className="px-4 py-3" style={{ color: "var(--text-secondary)" }}>
                        {l.source ?? "—"}
                        {l.campaign && <span className="block text-xs" style={{ color: "var(--text-muted)" }}>{l.campaign}</span>}
                      </td>
                      <td className="px-4 py-3">
                        <span className="flex items-center gap-1.5 text-xs font-semibold" style={{ color: STAGE_COLOR[l.stage] }}>
                          <span className="w-1.5 h-1.5 rounded-full" style={{ background: STAGE_COLOR[l.stage] }} />
                          {STAGE_LABEL[l.stage]}
                        </span>
                        {l.statusRaw && l.statusRaw.toLowerCase() !== STAGE_LABEL[l.stage].toLowerCase() && (
                          <span className="block text-[11px] mt-0.5" style={{ color: "var(--text-muted)" }}>“{l.statusRaw}”</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right" style={{ color: "var(--text-primary)" }}>{l.value ? money(l.value) : "—"}</td>
                    </tr>
                    {openId === l.id && l.raw && (
                      <tr style={{ borderBottom: "1px solid var(--border)", background: "var(--surface)" }}>
                        <td colSpan={7} className="px-6 py-4">
                          <p className="text-xs font-bold tracking-widest mb-3" style={{ color: "var(--text-muted)" }}>SHEET ROW</p>
                          <dl className="grid grid-cols-2 md:grid-cols-4 gap-x-6 gap-y-2 text-sm">
                            {Object.entries(l.raw)
                              .filter(([, v]) => v)
                              .map(([k, v]) => (
                                <div key={k} className="min-w-0">
                                  <dt className="text-xs" style={{ color: "var(--text-muted)" }}>{k}</dt>
                                  <dd className="break-words whitespace-pre-wrap" style={{ color: "var(--text-primary)" }}>{v}</dd>
                                </div>
                              ))}
                          </dl>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center" style={{ color: "var(--text-muted)" }}>
                      {leads.length ? "No leads match." : "No leads in the sheet yet."}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
            {filtered.length > shown && (
              <button onClick={() => setShown(shown + PAGE)} className="w-full py-3 text-sm font-semibold" style={{ color: "var(--primary)" }}>
                Show more ({filtered.length - shown} left)
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function StageChip({ label, count, active, color, onClick }: { label: string; count: number; active: boolean; color: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="px-3 py-1.5 rounded-lg text-xs font-semibold"
      style={{ color, background: active ? "var(--surface-hover)" : "transparent", border: `1px solid ${active ? "var(--border-strong)" : "var(--border)"}` }}
    >
      {label} <b className="ml-1">{count}</b>
    </button>
  );
}

// Values in the Prospect Status column the rules don't recognise — the coach says what each means once.
function UnmappedStatuses({ clientId, unmapped, statusColumn }: { clientId: string; unmapped: [string, number][]; statusColumn: string | null }) {
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="card rounded-2xl p-5" style={{ borderColor: "#facc15" }}>
      <p className="text-sm font-semibold mb-1" style={{ color: "var(--text-primary)" }}>
        {unmapped.length} {statusColumn ?? "status"} value{unmapped.length > 1 ? "s" : ""} not recognised
      </p>
      <p className="text-xs mb-3" style={{ color: "var(--text-secondary)" }}>Those leads show as &quot;New / no update&quot; until you say what each value means.</p>
      <div className="space-y-2">
        {unmapped.map(([value, rows]) => (
          <div key={value} className="flex items-center gap-3 text-sm">
            <span className="font-semibold" style={{ color: "var(--text-primary)" }}>“{value}”</span>
            <span className="text-xs" style={{ color: "var(--text-muted)" }}>{rows} lead{rows > 1 ? "s" : ""}</span>
            <select
              disabled={!!busy}
              defaultValue=""
              onChange={async (e) => {
                if (!e.target.value) return;
                setBusy(value);
                setError(null);
                const r = await mapLeadStatus(clientId, value, e.target.value);
                setBusy(null);
                if (r.error) setError(r.error);
              }}
              className="ml-auto px-2 py-1 rounded-lg outline-none text-xs"
              style={{ background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text-primary)" }}
            >
              <option value="">Means…</option>
              {LEAD_STAGES.map((s) => (
                <option key={s} value={s}>{STAGE_LABEL[s]}</option>
              ))}
            </select>
          </div>
        ))}
      </div>
      {busy && <p className="text-xs mt-2" style={{ color: "var(--text-secondary)" }}>Re-syncing…</p>}
      {error && <p className="text-xs mt-2" style={{ color: "var(--danger)" }}>{error}</p>}
    </div>
  );
}
