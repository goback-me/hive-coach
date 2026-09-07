"use client";

import { Fragment, useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { LEAD_STATUSES, LEAD_STATUS_LABELS, LEAD_STATUS_STYLE, type LeadStatusValue } from "@/lib/lead-status";
import type { SyncSummary, CampaignFunnelRow } from "@/lib/lead-sync";
import type { DateRangePreset } from "@/lib/date-range";
import DateRangeDropdown from "@/components/DateRangeDropdown";
import LeadTimelineChart, { type TimeSeriesPoint } from "@/components/LeadTimelineChart";

type LeadRow = {
  id: string;
  name: string | null;
  phone: string | null;
  email: string | null;
  source: string | null;
  campaign: string | null;
  status: LeadStatusValue;
  value: number | null;
  raw: Record<string, string> | null;
  lastSyncedAt: string | null;
};

type ActivityRow = {
  id: string;
  fromStatus: LeadStatusValue;
  toStatus: LeadStatusValue;
  value: number | null;
  changedBy: string;
  changedAt: string;
};

const PAGE_SIZE = 25;

export default function LeadsPanel({
  clientId,
  viewerRole,
  hasSheet,
  funnel: initialFunnel,
  onSync,
  onUpdateStatus,
}: {
  clientId: string;
  viewerRole: "COACH" | "CLIENT";
  hasSheet: boolean;
  funnel: CampaignFunnelRow[];
  onSync: (clientId: string) => Promise<SyncSummary>;
  onUpdateStatus: (leadId: string, status: string, value?: number) => Promise<void>;
}) {
  const isCoach = viewerRole === "COACH";

  const [dateRange, setDateRange] = useState<DateRangePreset>("maximum");
  const [funnel, setFunnel] = useState(initialFunnel);
  const [loadingFunnel, setLoadingFunnel] = useState(false);
  const [series, setSeries] = useState<TimeSeriesPoint[]>([]);
  const [loadingSeries, setLoadingSeries] = useState(false);

  const [leads, setLeads] = useState<LeadRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<LeadStatusValue | "">("");
  const [loadingLeads, setLoadingLeads] = useState(false);

  const [syncing, setSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [activityByLead, setActivityByLead] = useState<Record<string, ActivityRow[]>>({});
  const [loadingActivity, setLoadingActivity] = useState<string | null>(null);
  const [pendingChange, setPendingChange] = useState<{ lead: LeadRow; status: LeadStatusValue } | null>(null);
  const [pendingValue, setPendingValue] = useState("");
  const [, startTransition] = useTransition();

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  function loadLeads() {
    if (!hasSheet) return;
    setLoadingLeads(true);
    const params = new URLSearchParams({ clientId, page: String(page), pageSize: String(PAGE_SIZE), range: dateRange });
    if (statusFilter) params.set("status", statusFilter);
    fetch(`/api/leads?${params.toString()}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.error) throw new Error(data.error);
        setLeads(data.leads);
        setTotal(data.total);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoadingLeads(false));
  }

  function loadFunnel() {
    if (!hasSheet) return;
    setLoadingFunnel(true);
    fetch(`/api/leads/funnel?clientId=${clientId}&range=${dateRange}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.error) throw new Error(data.error);
        setFunnel(data.funnel);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoadingFunnel(false));
  }

  function loadSeries() {
    if (!hasSheet) return;
    setLoadingSeries(true);
    fetch(`/api/leads/timeseries?clientId=${clientId}&range=${dateRange}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.error) throw new Error(data.error);
        setSeries(data.points);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoadingSeries(false));
  }

  useEffect(() => {
    loadLeads();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, statusFilter, hasSheet]);

  useEffect(() => {
    setPage(1);
    loadLeads();
    loadFunnel();
    loadSeries();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dateRange]);

  const lastSynced = leads
    .map((l) => l.lastSyncedAt)
    .filter(Boolean)
    .sort()
    .at(-1);

  function refreshAfterChange(leadId: string) {
    loadLeads();
    loadFunnel();
    loadSeries();
    if (activityByLead[leadId]) loadActivity(leadId);
  }

  function sync() {
    setSyncing(true);
    setError(null);
    setSyncMessage(null);
    onSync(clientId)
      .then((summary) => {
        setSyncMessage(`Synced ${summary.total} leads — ${summary.created} new, ${summary.updated} updated.`);
        setPage(1);
        loadLeads();
        loadFunnel();
        loadSeries();
      })
      .catch((e) => setError(e.message))
      .finally(() => setSyncing(false));
  }

  function requestStatusChange(lead: LeadRow, status: LeadStatusValue) {
    setPendingValue(lead.value ? String(lead.value) : "");
    setPendingChange({ lead, status });
  }

  function confirmStatusChange(skipValue: boolean) {
    if (!pendingChange) return;
    const { lead, status } = pendingChange;
    const value = !skipValue && pendingValue.trim() ? Number(pendingValue) : undefined;
    setLeads((prev) => prev.map((l) => (l.id === lead.id ? { ...l, status } : l))); // optimistic
    setPendingChange(null);
    startTransition(() => {
      onUpdateStatus(lead.id, status, Number.isFinite(value) ? value : undefined)
        .then(() => refreshAfterChange(lead.id))
        .catch((e) => setError(e.message));
    });
  }

  function toggleExpanded(leadId: string) {
    const next = expandedId === leadId ? null : leadId;
    setExpandedId(next);
    if (next && !activityByLead[next]) loadActivity(next);
  }

  function loadActivity(leadId: string) {
    setLoadingActivity(leadId);
    fetch(`/api/leads/activity?leadId=${leadId}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.error) throw new Error(data.error);
        setActivityByLead((prev) => ({ ...prev, [leadId]: data.activity }));
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoadingActivity(null));
  }

  if (!hasSheet) {
    return (
      <div className="card rounded-2xl p-8 text-center">
        <span className="material-symbols-outlined text-4xl mb-2" style={{ color: "var(--text-muted)" }}>person_search</span>
        <p className="font-semibold" style={{ color: "var(--text-primary)" }}>No lead sheet connected yet</p>
        <p className="text-sm mt-1" style={{ color: "var(--text-secondary)" }}>
          {isCoach ? (
            <>Connect this client's Google Sheet on the <Link href="/leads" className="font-semibold" style={{ color: "var(--primary)" }}>Leads page</Link> first.</>
          ) : (
            "Ask your coach to connect your lead sheet."
          )}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          {isCoach && (
            lastSynced ? (
              <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                Last synced {new Date(lastSynced).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}
              </p>
            ) : (
              <p className="text-xs" style={{ color: "var(--text-muted)" }}>Never synced yet</p>
            )
          )}
          {syncMessage && <p className="text-xs mt-0.5" style={{ color: "var(--primary)" }}>{syncMessage}</p>}
          {error && <p className="text-xs mt-0.5" style={{ color: "var(--danger)" }}>{error}</p>}
        </div>
        <div className="flex items-center gap-2">
          <DateRangeDropdown value={dateRange} onChange={setDateRange} />
          {isCoach && (
            <button
              onClick={sync}
              disabled={syncing}
              className="btn-gradient flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold disabled:opacity-50"
            >
              <span className="material-symbols-outlined text-[18px]">sync</span>
              {syncing ? "Syncing…" : "Sync now"}
            </button>
          )}
        </div>
      </div>

      <div className="card rounded-2xl p-5">
        <div className="flex items-center justify-between mb-1">
          <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>Lead activity over time</p>
          {loadingSeries && <span className="text-xs" style={{ color: "var(--text-muted)" }}>Updating…</span>}
        </div>
        <LeadTimelineChart points={series} />
      </div>

      <div>
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>Campaign performance</p>
          {loadingFunnel && <span className="text-xs" style={{ color: "var(--text-muted)" }}>Updating…</span>}
        </div>
        {funnel.length === 0 ? (
          <div className="card rounded-2xl p-6 text-center text-sm" style={{ color: "var(--text-secondary)" }}>
            No leads in this date range.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {funnel.map((row) => {
              const contactRate = row.total > 0 ? Math.round((row.contacted / row.total) * 100) : 0;
              const winRate = row.total > 0 ? Math.round((row.won / row.total) * 100) : 0;
              const costPerLead = row.spend != null && row.total > 0 ? row.spend / row.total : null;
              return (
                <div key={row.campaign} className="card rounded-2xl p-5">
                  <div className="flex justify-between items-start gap-2 mb-4">
                    <p className="font-semibold text-sm truncate" title={row.campaign} style={{ color: "var(--text-primary)" }}>
                      {row.campaign}
                    </p>
                    {row.spend != null && (
                      <span className="text-xs font-bold whitespace-nowrap" style={{ color: "var(--text-secondary)" }}>
                        ${row.spend.toLocaleString()}
                        {row.spendSource && <span className="font-normal" style={{ color: "var(--text-muted)" }}> ({row.spendSource})</span>}
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-4 gap-2 mb-4">
                    <MiniStat label="Leads" value={row.total} />
                    <MiniStat label="Contacted" value={row.contacted} />
                    <MiniStat label="Won" value={row.won} color="var(--primary)" />
                    <MiniStat label="Lost/DQ" value={row.lostOrDisqualified} color="var(--danger)" />
                  </div>

                  <div className="h-1.5 rounded-full mb-2 overflow-hidden flex" style={{ background: "var(--surface-hover)" }}>
                    <div style={{ width: `${winRate}%`, background: "var(--primary)" }} />
                    <div style={{ width: `${Math.max(contactRate - winRate, 0)}%`, background: "var(--border-strong)" }} />
                  </div>

                  <div className="flex items-center justify-between text-xs flex-wrap gap-y-1">
                    <span style={{ color: "var(--text-secondary)" }}>
                      Contact rate <strong style={{ color: "var(--text-primary)" }}>{contactRate}%</strong>
                    </span>
                    <span style={{ color: "var(--text-secondary)" }}>
                      Win rate <strong style={{ color: "var(--text-primary)" }}>{winRate}%</strong>
                    </span>
                    {costPerLead != null && (
                      <span style={{ color: "var(--text-secondary)" }}>
                        Cost/lead <strong style={{ color: "var(--text-primary)" }}>${costPerLead.toFixed(2)}</strong>
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="card rounded-2xl p-5 overflow-x-auto">
        <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
          <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>{total.toLocaleString()} leads</p>
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value as LeadStatusValue | "");
              setPage(1);
            }}
            className="px-3 py-1.5 rounded-lg text-xs font-bold outline-none"
            style={{ background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text-primary)" }}
          >
            <option value="">All statuses</option>
            {LEAD_STATUSES.map((s) => (
              <option key={s} value={s}>{LEAD_STATUS_LABELS[s]}</option>
            ))}
          </select>
        </div>

        {loadingLeads ? (
          <p className="text-sm py-6 text-center" style={{ color: "var(--text-secondary)" }}>Loading…</p>
        ) : leads.length === 0 ? (
          <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
            {total === 0 ? "No leads yet." : "No leads match this filter."}
          </p>
        ) : (
          <>
            <table className="w-full text-left text-sm min-w-[640px]">
              <thead>
                <tr style={{ borderBottom: "1px solid var(--border)" }}>
                  {["Name", "Contact", "Source", "Campaign", "Status", "Value", ""].map((h, i) => (
                    <th key={i} className="py-2 pr-4 text-xs font-bold whitespace-nowrap" style={{ color: "var(--text-secondary)" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {leads.map((lead) => {
                  const st = LEAD_STATUS_STYLE[lead.status];
                  const expanded = expandedId === lead.id;
                  const rawEntries = lead.raw ? Object.entries(lead.raw).filter(([, v]) => v) : [];
                  const activity = activityByLead[lead.id];
                  return (
                    <Fragment key={lead.id}>
                      <tr style={{ borderBottom: expanded ? "none" : "1px solid var(--border)" }}>
                        <td className="py-2 pr-4 font-medium whitespace-nowrap" style={{ color: "var(--text-primary)" }}>{lead.name || "—"}</td>
                        <td className="py-2 pr-4 whitespace-nowrap" style={{ color: "var(--text-secondary)" }}>
                          {lead.phone || lead.email || "—"}
                        </td>
                        <td className="py-2 pr-4 whitespace-nowrap" style={{ color: "var(--text-secondary)" }}>{lead.source || "—"}</td>
                        <td className="py-2 pr-4 whitespace-nowrap" style={{ color: "var(--text-secondary)" }}>{lead.campaign || "—"}</td>
                        <td className="py-2 pr-4">
                          {isCoach ? (
                            <select
                              value={lead.status}
                              onChange={(e) => requestStatusChange(lead, e.target.value as LeadStatusValue)}
                              className="px-2 py-1 rounded-full text-xs font-bold outline-none border-0"
                              style={{ background: st.bg, color: st.color }}
                            >
                              {LEAD_STATUSES.map((s) => (
                                <option key={s} value={s}>{LEAD_STATUS_LABELS[s]}</option>
                              ))}
                            </select>
                          ) : (
                            <span className="px-2 py-1 rounded-full text-xs font-bold" style={{ background: st.bg, color: st.color }}>
                              {LEAD_STATUS_LABELS[lead.status]}
                            </span>
                          )}
                        </td>
                        <td className="py-2 pr-4 whitespace-nowrap" style={{ color: "var(--text-primary)" }}>
                          {lead.value != null ? `$${lead.value.toLocaleString()}` : "—"}
                        </td>
                        <td className="py-2 pr-4">
                          <button
                            onClick={() => toggleExpanded(lead.id)}
                            className="text-xs font-semibold whitespace-nowrap"
                            style={{ color: "var(--primary)" }}
                          >
                            {expanded ? "Hide" : isCoach ? "Details" : "History"}
                          </button>
                        </td>
                      </tr>
                      {expanded && (
                        <tr style={{ borderBottom: "1px solid var(--border)" }}>
                          <td colSpan={7} className="pb-3 pt-0">
                            <div className="p-3 rounded-lg space-y-3" style={{ background: "var(--surface-hover)" }}>
                              <div>
                                <p className="text-[10px] font-bold tracking-wide mb-1.5" style={{ color: "var(--text-secondary)" }}>
                                  {isCoach ? "ACTIVITY" : "STATUS HISTORY"}
                                </p>
                                {loadingActivity === lead.id ? (
                                  <p className="text-xs" style={{ color: "var(--text-muted)" }}>Loading…</p>
                                ) : !activity || activity.length === 0 ? (
                                  <p className="text-xs" style={{ color: "var(--text-muted)" }}>No manual status changes yet.</p>
                                ) : (
                                  <div className="space-y-1">
                                    {activity.map((a) => (
                                      <p key={a.id} className="text-xs" style={{ color: "var(--text-primary)" }}>
                                        {isCoach && <strong>{a.changedBy}</strong>}{isCoach && " changed status "}
                                        {!isCoach && "Status changed "}
                                        <span style={{ color: "var(--text-secondary)" }}>{LEAD_STATUS_LABELS[a.fromStatus]} → </span>
                                        <strong>{LEAD_STATUS_LABELS[a.toStatus]}</strong>
                                        {a.value != null && <span style={{ color: "var(--text-secondary)" }}> · ${a.value.toLocaleString()}</span>}
                                        <span style={{ color: "var(--text-muted)" }}>
                                          {" · "}
                                          {new Date(a.changedAt).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}
                                        </span>
                                      </p>
                                    ))}
                                  </div>
                                )}
                              </div>
                              {isCoach && rawEntries.length > 0 && (
                                <div>
                                  <p className="text-[10px] font-bold tracking-wide mb-1.5" style={{ color: "var(--text-secondary)" }}>DETAILS</p>
                                  <div className="grid grid-cols-3 gap-x-6 gap-y-1.5">
                                    {rawEntries.map(([k, v]) => (
                                      <div key={k} className="min-w-0">
                                        <p className="text-[10px]" style={{ color: "var(--text-muted)" }}>{k}</p>
                                        <p className="text-xs truncate" style={{ color: "var(--text-primary)" }}>{v}</p>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>

            <div className="flex items-center justify-between mt-4">
              <p className="text-xs" style={{ color: "var(--text-muted)" }}>Page {page} of {totalPages}</p>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  className="px-3 py-1.5 rounded-lg text-xs font-bold disabled:opacity-40"
                  style={{ border: "1px solid var(--border)", color: "var(--text-secondary)" }}
                >
                  Previous
                </button>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                  className="px-3 py-1.5 rounded-lg text-xs font-bold disabled:opacity-40"
                  style={{ border: "1px solid var(--border)", color: "var(--text-secondary)" }}
                >
                  Next
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {pendingChange && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.6)" }}
          onClick={() => setPendingChange(null)}
        >
          <div className="card rounded-2xl p-5 w-full max-w-sm" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-heading font-bold text-lg mb-1" style={{ color: "var(--text-primary)" }}>
              Move to {LEAD_STATUS_LABELS[pendingChange.status]}
            </h3>
            <p className="text-sm mb-4" style={{ color: "var(--text-secondary)" }}>
              {pendingChange.lead.name || "This lead"} — add a deal value or profit figure (optional).
            </p>
            <input
              autoFocus
              type="number"
              value={pendingValue}
              onChange={(e) => setPendingValue(e.target.value)}
              placeholder="e.g. 1200"
              className="w-full px-3 py-2 rounded-lg outline-none text-sm mb-4"
              style={{ background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text-primary)" }}
            />
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => confirmStatusChange(true)}
                className="px-4 py-2 rounded-lg text-sm font-semibold"
                style={{ border: "1px solid var(--border)", color: "var(--text-secondary)" }}
              >
                Skip
              </button>
              <button
                onClick={() => confirmStatusChange(false)}
                className="btn-gradient px-4 py-2 rounded-lg text-sm font-bold"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function MiniStat({ label, value, color }: { label: string; value: number; color?: string }) {
  return (
    <div>
      <p className="font-heading font-bold text-lg" style={{ color: color ?? "var(--text-primary)" }}>{value}</p>
      <p className="text-[10px]" style={{ color: "var(--text-muted)" }}>{label}</p>
    </div>
  );
}
