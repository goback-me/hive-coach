"use client";

import { useState, type ReactNode } from "react";
import { connectClientSheet, disconnectClientGoogle, getSheetHeaders, getSpreadsheetTabs } from "@/lib/actions";

const inputStyle = { background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text-primary)", width: "100%" };

function sheetIdFromInput(v: string) {
  return v.match(/\/spreadsheets\/d\/([a-zA-Z0-9_-]+)/)?.[1] ?? v.trim();
}

/** Connect this client's Google account, then pick their sheet, tab and Prospect Status column. */
export default function LeadSheetSetup({
  clientId,
  googleEmail,
  googleConnected,
  googleError,
  onCancel,
}: {
  clientId: string;
  googleEmail: string | null;
  googleConnected: boolean;
  googleError: string | null;
  onCancel?: () => void;
}) {
  const [url, setUrl] = useState("");
  const [spreadsheetId, setSpreadsheetId] = useState("");
  const [title, setTitle] = useState("");
  const [tabs, setTabs] = useState<string[]>([]);
  const [tab, setTab] = useState("");
  const [headers, setHeaders] = useState<string[]>([]);
  const [statusColumn, setStatusColumn] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function readSheet() {
    const id = sheetIdFromInput(url);
    setSpreadsheetId(id);
    setTabs([]);
    setTab("");
    setHeaders([]);
    setError(null);
    if (!id) return;
    setBusy("Opening the sheet…");
    const r = await getSpreadsheetTabs(clientId, id);
    setBusy(null);
    if (r.error) return setError(`Couldn't open that sheet with ${googleEmail ?? "the connected account"} — check the link, and that this Google account can open it.`);
    setTitle(r.title ?? "");
    setTabs(r.tabs ?? []);
    if (r.tabs?.length === 1) pickTab(id, r.tabs[0]);
  }

  async function pickTab(id: string, name: string) {
    setTab(name);
    setHeaders([]);
    setError(null);
    if (!name) return;
    setBusy("Reading columns…");
    const r = await getSheetHeaders(clientId, id, name);
    setBusy(null);
    if (r.error) return setError(r.error);
    setHeaders(r.headers ?? []);
    setStatusColumn(r.detected ?? "");
  }

  async function connect() {
    setBusy("Connecting and syncing leads…");
    setError(null);
    const r = await connectClientSheet(clientId, { spreadsheetId, spreadsheetName: title || spreadsheetId, sheetName: tab, statusColumn });
    setBusy(null);
    if (r.error) setError(r.error);
    else onCancel?.();
  }

  return (
    <div className="card rounded-2xl p-6 space-y-5">
      <div>
        <h3 className="font-heading font-bold text-lg mb-1" style={{ color: "var(--text-primary)" }}>Connect your lead sheet</h3>
        <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
          Leads come from your Google Sheet with a <b>Prospect Status</b> column. The Bakery only reads it — it never edits your sheet.
        </p>
      </div>

      {/* Step 1 — this client's Google account */}
      <Step n={1} title="Connect Google" done={googleConnected}>
        {googleConnected ? (
          <div className="flex flex-wrap items-center gap-3 text-sm">
            <span style={{ color: "var(--text-primary)" }}>
              Connected as <b>{googleEmail ?? "Google account"}</b>
            </span>
            <a href={`/api/google/connect?clientId=${clientId}`} className="text-xs font-semibold" style={{ color: "var(--primary)" }}>
              Use a different account
            </a>
            <button
              onClick={async () => {
                if (confirm("Disconnect this Google account? Leads stop syncing until you connect again.")) await disconnectClientGoogle(clientId);
              }}
              className="text-xs font-semibold"
              style={{ color: "var(--danger)" }}
            >
              Disconnect
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            <p className="text-sm" style={{ color: "var(--text-secondary)" }}>Sign in with the Google account that owns (or can open) the lead sheet.</p>
            <a href={`/api/google/connect?clientId=${clientId}`} className="inline-flex items-center gap-2 px-4 py-2 rounded-lg font-bold text-sm" style={{ background: "var(--secondary)", color: "#14150f" }}>
              <span className="material-symbols-outlined text-[18px]">link</span>
              Connect Google
            </a>
          </div>
        )}
        {googleError && <p className="text-sm mt-2" style={{ color: "var(--danger)" }}>Google connection failed: {googleError}</p>}
      </Step>

      {/* Step 2 — the sheet */}
      <Step n={2} title="Choose the sheet" done={false} disabled={!googleConnected}>
        <div className="space-y-3">
          <div className="flex gap-2">
            <input
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && readSheet()}
              placeholder="Paste the Google Sheet link — https://docs.google.com/spreadsheets/d/…"
              style={inputStyle}
              className="px-3 py-2 rounded-lg outline-none text-sm"
            />
            <button onClick={readSheet} disabled={!url.trim() || !!busy} className="px-4 py-2 rounded-lg text-sm font-semibold shrink-0 disabled:opacity-50" style={{ color: "var(--text-primary)", border: "1px solid var(--border-strong)" }}>
              Open
            </button>
          </div>
          {tabs.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold block mb-1" style={{ color: "var(--text-secondary)" }}>Tab in “{title}”</label>
                <select value={tab} onChange={(e) => pickTab(spreadsheetId, e.target.value)} style={inputStyle} className="px-3 py-2 rounded-lg outline-none text-sm">
                  <option value="">Choose a tab…</option>
                  {tabs.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold block mb-1" style={{ color: "var(--text-secondary)" }}>Prospect Status column</label>
                <select value={statusColumn} disabled={!headers.length} onChange={(e) => setStatusColumn(e.target.value)} style={inputStyle} className="px-3 py-2 rounded-lg outline-none text-sm disabled:opacity-50">
                  <option value="">{headers.length ? "Choose the status column…" : "—"}</option>
                  {headers.map((h) => (
                    <option key={h} value={h}>{h}</option>
                  ))}
                </select>
              </div>
            </div>
          )}
        </div>
      </Step>

      {busy && <p className="text-sm" style={{ color: "var(--text-secondary)" }}>{busy}</p>}
      {error && <p className="text-sm" style={{ color: "var(--danger)" }}>{error}</p>}

      <div className="flex justify-end gap-2">
        {onCancel && (
          <button onClick={onCancel} className="px-4 py-2 rounded-lg text-sm font-semibold" style={{ border: "1px solid var(--border-strong)", color: "var(--text-secondary)" }}>
            Cancel
          </button>
        )}
        <button
          onClick={connect}
          disabled={!googleConnected || !spreadsheetId || !tab || !statusColumn || !!busy}
          className="px-4 py-2 rounded-lg text-sm font-bold disabled:opacity-50"
          style={{ background: "var(--secondary)", color: "#14150f" }}
        >
          Connect &amp; sync
        </button>
      </div>
    </div>
  );
}

function Step({ n, title, done, disabled, children }: { n: number; title: string; done: boolean; disabled?: boolean; children: ReactNode }) {
  return (
    <div className="flex gap-4" style={{ opacity: disabled ? 0.45 : 1, pointerEvents: disabled ? "none" : undefined }}>
      <span
        className="w-7 h-7 shrink-0 rounded-full flex items-center justify-center text-xs font-bold"
        style={done ? { background: "var(--primary)", color: "#0d0d0b" } : { background: "var(--surface-hover)", color: "var(--text-secondary)" }}
      >
        {done ? <span className="material-symbols-outlined text-[16px]">check</span> : n}
      </span>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold mb-2" style={{ color: "var(--text-primary)" }}>{title}</p>
        {children}
      </div>
    </div>
  );
}
