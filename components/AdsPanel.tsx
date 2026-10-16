"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { connectMetaAds, disconnectMetaAds, getAdsReport, getMetaAdAccounts, selectMetaAdAccount } from "@/lib/actions";
import type { MetaAdAccount } from "@/lib/meta-ads";
import { inDateRange, pct, resolveRange, type DateRange, type LeadView } from "@/lib/lead-stages";
import type { MetaReport } from "@/lib/meta-ads";
import DateRangeBar from "./DateRangeBar";

// A server action can reject outright (network drop, server restart) — show this instead of hanging.
const OFFLINE = "Couldn't reach the server — check your connection and try again";

const inputStyle = { width: "100%", background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text-primary)" } as const;

/** The client's Meta ad account: connect it, then live spend matched against their lead sheet. */
export default function AdsPanel({
  clientId,
  account,
  facebookConnected,
  oauthReady,
  initialError,
  leads,
  hasSheet,
}: {
  clientId: string;
  account: { id: string; name: string | null } | null;
  facebookConnected: boolean; // a Facebook login / token is saved (account may still need picking)
  oauthReady: boolean; // META_APP_ID etc. are set — "Connect with Facebook" can work
  initialError: string | null;
  leads: LeadView[];
  hasSheet: boolean;
}) {
  const [mode, setMode] = useState<"view" | "pick" | "connect">("view");

  if (!facebookConnected || mode === "connect") {
    return <ConnectForm clientId={clientId} oauthReady={oauthReady} initialError={initialError} onCancel={facebookConnected ? () => setMode("view") : undefined} />;
  }
  if (!account || mode === "pick") {
    return <AccountPicker clientId={clientId} current={account?.id ?? null} onDone={account ? () => setMode("view") : undefined} onReconnect={() => setMode("connect")} />;
  }
  return <Report clientId={clientId} account={account} leads={leads} hasSheet={hasSheet} onChange={() => setMode("pick")} onReconnect={() => setMode("connect")} />;
}

/** Opens Facebook login in a popup; the callback page posts back here when it's done. */
function useFacebookPopup(clientId: string, onError: (e: string) => void) {
  const router = useRouter();
  const [waiting, setWaiting] = useState(false);

  useEffect(() => {
    function handle(data: { type?: string; error?: string | null }) {
      if (data?.type !== "meta-connected") return;
      setWaiting(false);
      if (data.error) onError(data.error);
      router.refresh(); // the server now has the token (and maybe the account)
    }
    // BroadcastChannel is the main path (Facebook's page severs window.opener); postMessage is the fallback.
    const channel = typeof BroadcastChannel !== "undefined" ? new BroadcastChannel("meta-connect") : null;
    if (channel) channel.onmessage = (e) => handle(e.data);
    const onMessage = (e: MessageEvent) => e.origin === window.location.origin && handle(e.data);
    window.addEventListener("message", onMessage);
    return () => {
      channel?.close();
      window.removeEventListener("message", onMessage);
    };
  }, [router, onError]);

  return {
    waiting,
    open() {
      const url = `/api/meta/connect?clientId=${clientId}`;
      const w = 620, h = 720;
      const popup = window.open(url, "facebook-connect", `width=${w},height=${h},left=${window.screenX + (window.outerWidth - w) / 2},top=${window.screenY + 60}`);
      if (!popup) window.location.href = url; // popup blocked — do it in this tab
      else setWaiting(true);
    },
  };
}

function AccountPicker({ clientId, current, onDone, onReconnect }: { clientId: string; current: string | null; onDone?: () => void; onReconnect: () => void }) {
  const [accounts, setAccounts] = useState<MetaAdAccount[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState<string | null>(null);

  useEffect(() => {
    getMetaAdAccounts(clientId)
      .then((r) => (r.error ? setError(r.error) : setAccounts(r.accounts!)))
      .catch(() => setError(OFFLINE));
  }, [clientId]);

  async function pick(id: string) {
    setSaving(id);
    setError(null);
    const r = await selectMetaAdAccount(clientId, id).catch(() => ({ error: OFFLINE }));
    setSaving(null);
    if (r.error) setError(r.error);
    else onDone?.();
  }

  return (
    <div className="card rounded-2xl p-6 space-y-4 max-w-[760px]">
      <div className="flex items-start gap-4">
        <FacebookMark />
        <div>
          <h3 className="font-heading font-bold text-xl" style={{ color: "var(--text-primary)" }}>Which ad account runs your ads?</h3>
          <p className="text-sm" style={{ color: "var(--text-secondary)" }}>Facebook is connected — pick the account to track spend from.</p>
        </div>
      </div>
      {error && <p className="text-sm" style={{ color: "var(--danger)" }}>{error}</p>}
      {!accounts && !error && <p className="text-sm" style={{ color: "var(--text-muted)" }}>Loading your ad accounts…</p>}
      {accounts?.length === 0 && (
        <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
          This Facebook login can&apos;t see any ad accounts. Reconnect with the login that manages your ads, or ask the account owner to give you access in Business Settings.
        </p>
      )}
      <div className="space-y-2">
        {accounts?.map((a) => (
          <button
            key={a.id}
            onClick={() => pick(a.id)}
            disabled={!!saving}
            className="w-full flex items-center gap-3 rounded-xl px-4 py-3 text-left transition-colors hover:bg-[var(--surface-hover)] disabled:opacity-60"
            style={{ border: `1px solid ${a.id === current ? "var(--primary)" : "var(--border)"}` }}
          >
            <span className="material-symbols-outlined" style={{ color: a.active ? "var(--primary)" : "var(--text-muted)" }}>campaign</span>
            <span className="flex-1 min-w-0">
              <span className="block font-semibold truncate" style={{ color: "var(--text-primary)" }}>{a.name}</span>
              <span className="block text-xs" style={{ color: "var(--text-muted)" }}>
                {a.id} · {a.currency}
                {!a.active && " · not active"}
              </span>
            </span>
            <span className="text-sm font-bold" style={{ color: "var(--primary)" }}>{saving === a.id ? "Saving…" : a.id === current ? "Current" : "Use this"}</span>
          </button>
        ))}
      </div>
      <div className="flex justify-between gap-2 pt-1">
        <button onClick={onReconnect} className="text-xs font-semibold" style={{ color: "var(--text-secondary)" }}>
          Use a different Facebook login
        </button>
        {onDone && (
          <button onClick={onDone} className="px-4 py-2 rounded-lg text-sm font-semibold" style={{ border: "1px solid var(--border-strong)", color: "var(--text-secondary)" }}>
            Cancel
          </button>
        )}
      </div>
    </div>
  );
}

function FacebookMark({ size = 44 }: { size?: number }) {
  return (
    <span className="rounded-xl flex items-center justify-center shrink-0" style={{ width: size, height: size, background: "#1877F2" }}>
      <svg viewBox="0 0 24 24" width={size * 0.55} height={size * 0.55} fill="#fff" aria-hidden>
        <path d="M13.5 22v-8h2.7l.4-3.2h-3.1V8.8c0-.9.3-1.5 1.6-1.5h1.7V4.4c-.3 0-1.3-.1-2.5-.1-2.4 0-4.1 1.5-4.1 4.2v2.3H7.5V14h2.7v8h3.3z" />
      </svg>
    </span>
  );
}

function Report({ clientId, account, leads, hasSheet, onChange, onReconnect }: { clientId: string; account: { id: string; name: string | null }; leads: LeadView[]; hasSheet: boolean; onChange: () => void; onReconnect: () => void }) {
  const [range, setRange] = useState<DateRange>({ preset: "month" });
  const [report, setReport] = useState<MetaReport | null>(null);
  const [error, setError] = useState<{ message: string; reconnect?: boolean } | null>(null);
  const [loading, setLoading] = useState(true);
  const [attempt, setAttempt] = useState(0); // bumped by "Try again"
  const [disconnecting, setDisconnecting] = useState(false);
  const req = useRef(0);
  const bounds = resolveRange(range);

  useEffect(() => {
    const id = ++req.current;
    setLoading(true);
    setError(null);
    getAdsReport(clientId, bounds.from, bounds.to)
      .catch(() => ({ error: OFFLINE, reconnect: false, report: undefined }))
      .then((r) => {
        if (id !== req.current) return; // a newer range was picked meanwhile
        setLoading(false);
        if (r.error) setError({ message: r.error, reconnect: r.reconnect });
        else setReport(r.report!);
      });
  }, [clientId, bounds.from, bounds.to, attempt]);

  const money = (n: number, cents = false) =>
    n.toLocaleString("en-AU", { style: "currency", currency: report?.currency ?? "AUD", maximumFractionDigits: cents ? 2 : 0, minimumFractionDigits: cents ? 2 : 0 });

  // Cost per lead / sale comes from the client's own lead sheet for the same dates — what the ads actually produced.
  const sheetLeads = leads.filter((l) => inDateRange(l.date, bounds));
  const sheetWon = sheetLeads.filter((l) => l.events.some((e) => e.stage === "WON")).length;
  const t = report?.totals;
  const leadCount = hasSheet ? sheetLeads.length : t?.leads ?? 0;
  const maxSeries = Math.max(...(report?.series.map((s) => s.spend) ?? [0]), 1);
  // Connected, but Meta has nothing for these dates (new account, paused ads, or a reviewer's test account).
  const empty = !!report && report.campaigns.length === 0 && report.totals.spend === 0;

  async function disconnect() {
    if (!confirm("Disconnect this ad account? The Bakery deletes its saved Facebook access and stops reading this account's ad data.")) return;
    setDisconnecting(true);
    try {
      await disconnectMetaAds(clientId);
    } catch {
      setDisconnecting(false);
      alert("Couldn't disconnect just now — please try again.");
    }
  }

  return (
    <div className="space-y-5">
      <div className="card rounded-2xl px-5 py-4 flex flex-wrap items-center gap-3">
        <span className="icon-chip w-10 h-10" style={{ background: "var(--primary-tint)" }}>
          <span className="material-symbols-outlined text-[20px]" style={{ color: "var(--primary)" }}>campaign</span>
        </span>
        <div className="min-w-0">
          <p className="font-semibold truncate" style={{ color: "var(--text-primary)" }}>{account.name ?? "Meta ad account"}</p>
          <p className="text-xs flex items-center gap-1.5" style={{ color: "var(--text-muted)" }}>
            <span className="w-1.5 h-1.5 rounded-full" style={{ background: error ? "var(--danger)" : "var(--primary)" }} />
            {account.id} · Meta Ads {error ? "· needs attention" : "connected"}
          </p>
        </div>
        <div className="ml-auto flex gap-2">
          <button onClick={onChange} className="text-xs font-semibold px-3 py-1.5 rounded-lg" style={{ color: "var(--text-primary)", border: "1px solid var(--border-strong)" }}>
            Change account
          </button>
          <button
            onClick={disconnect}
            disabled={disconnecting}
            className="text-xs font-semibold px-3 py-1.5 rounded-lg disabled:opacity-60"
            style={{ color: "var(--danger)", border: "1px solid var(--border-strong)" }}
          >
            {disconnecting ? "Disconnecting…" : "Disconnect"}
          </button>
        </div>
      </div>

      <DateRangeBar value={range} onChange={setRange} count={sheetLeads.length} />

      {error ? (
        <div className="card rounded-2xl p-6 flex flex-wrap items-center gap-4" style={{ borderColor: "var(--danger)" }}>
          <span className="material-symbols-outlined text-3xl" style={{ color: "var(--danger)" }}>error</span>
          <div className="flex-1 min-w-[200px]">
            <p className="font-semibold" style={{ color: "var(--text-primary)" }}>Couldn&apos;t load spend from Meta</p>
            <p className="text-sm" style={{ color: "var(--text-secondary)" }}>{error.message}</p>
          </div>
          {error.reconnect ? (
            <button onClick={onReconnect} className="px-4 py-2 rounded-lg text-sm font-bold" style={{ background: "var(--secondary)", color: "#14150f" }}>
              Reconnect Facebook
            </button>
          ) : (
            <button onClick={() => setAttempt((n) => n + 1)} className="px-4 py-2 rounded-lg text-sm font-bold" style={{ background: "var(--secondary)", color: "#14150f" }}>
              Try again
            </button>
          )}
        </div>
      ) : empty ? (
        <div className={`card rounded-2xl p-10 flex flex-col items-center text-center gap-2 transition-opacity ${loading ? "opacity-50" : ""}`}>
          <span className="icon-chip w-12 h-12" style={{ background: "var(--primary-tint)" }}>
            <span className="material-symbols-outlined text-[26px]" style={{ color: "var(--primary)" }}>query_stats</span>
          </span>
          <h3 className="font-heading font-bold text-lg mt-1" style={{ color: "var(--text-primary)" }}>No ad activity in this period</h3>
          <p className="text-sm max-w-md" style={{ color: "var(--text-secondary)" }}>
            {account.name ?? "This ad account"} is connected, but Meta has no spend for these dates. Try a longer date range, or check back once a campaign is running.
          </p>
        </div>
      ) : (
        <>
          <div className={`grid grid-cols-2 xl:grid-cols-4 gap-4 transition-opacity ${loading ? "opacity-50" : ""}`}>
            <Kpi label="Ad spend" value={t ? money(t.spend) : "…"} />
            <Kpi label={hasSheet ? "Leads (from sheet)" : "Leads (Meta)"} value={t ? String(leadCount) : "…"} sub={t && leadCount ? `${money(t.spend / leadCount, true)} per lead` : undefined} />
            <Kpi label="Won" value={t ? String(sheetWon) : "…"} sub={t && sheetWon ? `${money(t.spend / sheetWon)} per sale` : hasSheet ? undefined : "Connect the lead sheet to track sales"} />
            <Kpi label="Clicks" value={t ? t.clicks.toLocaleString() : "…"} sub={t && t.impressions ? `${pct(t.clicks / t.impressions)} CTR · ${t.impressions.toLocaleString()} impressions` : undefined} />
          </div>

          {report && report.series.length > 1 && report.totals.spend > 0 && (
            <div className={`card rounded-2xl p-6 transition-opacity ${loading ? "opacity-50" : ""}`}>
              <h3 className="font-heading font-bold text-lg mb-4" style={{ color: "var(--text-primary)" }}>Spend over time</h3>
              <div className="flex items-end gap-[3px] h-36">
                {report.series.map((s) => (
                  <div
                    key={s.label}
                    title={`${s.label}: ${money(s.spend)}`}
                    className="flex-1 rounded-t-sm transition-colors hover:opacity-80"
                    style={{ height: `${Math.max((s.spend / maxSeries) * 100, s.spend ? 3 : 1)}%`, background: "var(--primary)" }}
                  />
                ))}
              </div>
              <div className="flex justify-between mt-2 text-[10px]" style={{ color: "var(--text-muted)" }}>
                <span>{report.series[0].label}</span>
                <span>{report.series[report.series.length - 1].label}</span>
              </div>
            </div>
          )}

          <div className={`card rounded-2xl overflow-hidden transition-opacity ${loading ? "opacity-50" : ""}`}>
            <h3 className="font-heading font-bold text-lg px-6 pt-5 pb-3" style={{ color: "var(--text-primary)" }}>Campaigns</h3>
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: "1px solid var(--border)" }}>
                  {["Campaign", "Status", "Spend", "Impressions", "Clicks", "CTR", "CPC", "Meta leads"].map((h, i) => (
                    <th key={h} className={`px-4 py-3 font-medium ${i > 1 ? "text-right" : "text-left"}`} style={{ color: "var(--text-muted)" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {report?.campaigns.map((c) => (
                  <tr key={c.id} style={{ borderBottom: "1px solid var(--border)" }}>
                    <td className="px-4 py-3 font-semibold" style={{ color: "var(--text-primary)" }}>{c.name}</td>
                    <td className="px-4 py-3">
                      <span className="flex items-center gap-1.5 text-xs font-semibold" style={{ color: c.status === "ACTIVE" ? "var(--primary)" : "var(--text-muted)" }}>
                        <span className="w-1.5 h-1.5 rounded-full" style={{ background: c.status === "ACTIVE" ? "var(--primary)" : "var(--text-muted)" }} />
                        {c.status.charAt(0) + c.status.slice(1).toLowerCase().replace(/_/g, " ")}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right font-semibold" style={{ color: "var(--text-primary)" }}>{money(c.spend)}</td>
                    <td className="px-4 py-3 text-right" style={{ color: "var(--text-secondary)" }}>{c.impressions.toLocaleString()}</td>
                    <td className="px-4 py-3 text-right" style={{ color: "var(--text-secondary)" }}>{c.clicks.toLocaleString()}</td>
                    <td className="px-4 py-3 text-right" style={{ color: "var(--text-secondary)" }}>{c.impressions ? pct(c.clicks / c.impressions) : "—"}</td>
                    <td className="px-4 py-3 text-right" style={{ color: "var(--text-secondary)" }}>{c.clicks ? money(c.spend / c.clicks, true) : "—"}</td>
                    <td className="px-4 py-3 text-right" style={{ color: "var(--text-secondary)" }}>{c.leads || "—"}</td>
                  </tr>
                ))}
                {report && report.campaigns.length === 0 && (
                  <tr>
                    <td colSpan={8} className="px-4 py-8 text-center" style={{ color: "var(--text-muted)" }}>No ad activity in this period.</td>
                  </tr>
                )}
                {!report && (
                  <tr>
                    <td colSpan={8} className="px-4 py-8 text-center" style={{ color: "var(--text-muted)" }}>Loading from Meta…</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}

function Kpi({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="card rounded-2xl p-5">
      <p className="text-sm" style={{ color: "var(--text-secondary)" }}>{label}</p>
      <p className="font-heading text-3xl font-bold mt-1" style={{ color: "var(--text-primary)" }}>{value}</p>
      {sub && <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>{sub}</p>}
    </div>
  );
}

function ConnectForm({ clientId, oauthReady, initialError, onCancel }: { clientId: string; oauthReady: boolean; initialError: string | null; onCancel?: () => void }) {
  const [accountId, setAccountId] = useState("");
  const [token, setToken] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(initialError);
  const [showToken, setShowToken] = useState(!oauthReady);
  const facebook = useFacebookPopup(clientId, setError);

  async function save() {
    setSaving(true);
    setError(null);
    const r = await connectMetaAds(clientId, accountId, token).catch(() => ({ error: OFFLINE }));
    setSaving(false);
    if (r.error) return setError(r.error);
    setToken(""); // don't keep the raw token around
    onCancel?.();
  }

  return (
    <div className="card rounded-2xl p-6 space-y-5 max-w-[900px]">
      <div className="flex items-start gap-4">
        <FacebookMark />
        <div>
          <h3 className="font-heading font-bold text-xl" style={{ color: "var(--text-primary)" }}>Connect your Facebook ad account</h3>
          <p className="text-sm" style={{ color: "var(--text-secondary)" }}>See ad spend, clicks and cost per lead next to your lead sheet. Read-only — nothing in your ad account is changed.</p>
        </div>
      </div>

      <div className="rounded-2xl p-6 flex flex-col items-center text-center gap-3" style={{ background: "var(--surface)", border: "1px dashed var(--border-strong)" }}>
        <button
          onClick={facebook.open}
          disabled={!oauthReady || facebook.waiting}
          className="flex items-center gap-3 px-6 py-3 rounded-xl font-bold text-white shadow-sm transition-transform hover:scale-[1.02] disabled:opacity-60 disabled:hover:scale-100"
          style={{ background: "#1877F2" }}
        >
          <svg viewBox="0 0 24 24" width="20" height="20" fill="#fff" aria-hidden>
            <path d="M13.5 22v-8h2.7l.4-3.2h-3.1V8.8c0-.9.3-1.5 1.6-1.5h1.7V4.4c-.3 0-1.3-.1-2.5-.1-2.4 0-4.1 1.5-4.1 4.2v2.3H7.5V14h2.7v8h3.3z" />
          </svg>
          {facebook.waiting ? "Waiting for Facebook…" : "Connect with Facebook"}
        </button>
        <p className="text-xs" style={{ color: "var(--text-muted)" }}>
          {oauthReady
            ? "A Facebook window opens — log in, allow access to your ads, and you're done."
            : "One-click Facebook connect isn't switched on yet (the Meta app keys need adding). Use an access token below for now."}
        </p>
        <p className="text-xs" style={{ color: "var(--text-muted)" }}>
          Read-only access to ad performance (ads_read) — we never post, change or spend anything. See our{" "}
          <Link href="/privacy" target="_blank" className="underline" style={{ color: "var(--text-secondary)" }}>
            Privacy Policy
          </Link>
          .
        </p>
        {facebook.waiting && (
          <button onClick={facebook.open} className="text-xs font-semibold" style={{ color: "var(--primary)" }}>
            Window didn&apos;t open? Try again
          </button>
        )}
      </div>

      {error && !showToken && <p className="text-sm" style={{ color: "var(--danger)" }}>{error}</p>}

      {!showToken ? (
        <div className="flex justify-between items-center">
          <button onClick={() => setShowToken(true)} className="text-xs font-semibold" style={{ color: "var(--text-secondary)" }}>
            Using a system user? Paste an access token instead
          </button>
          {onCancel && (
            <button onClick={onCancel} className="px-4 py-2 rounded-lg text-sm font-semibold" style={{ border: "1px solid var(--border-strong)", color: "var(--text-secondary)" }}>
              Cancel
            </button>
          )}
        </div>
      ) : (
      <>
      <ol className="text-sm space-y-1.5 rounded-xl p-4" style={{ background: "var(--surface)", color: "var(--text-secondary)" }}>
        <li>
          <b style={{ color: "var(--text-primary)" }}>1.</b> Ad account ID: in{" "}
          <a href="https://adsmanager.facebook.com/" target="_blank" rel="noreferrer" style={{ color: "var(--primary)" }}>
            Ads Manager
          </a>
          , it&apos;s the number next to the account name (act_…).
        </li>
        <li>
          <b style={{ color: "var(--text-primary)" }}>2.</b> Access token: in{" "}
          <a href="https://business.facebook.com/settings/system-users" target="_blank" rel="noreferrer" style={{ color: "var(--primary)" }}>
            Business Settings → System users
          </a>
          , pick (or add) a system user with access to the ad account, click <b>Generate new token</b> and tick <b>ads_read</b>.
        </li>
      </ol>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <label className="text-xs font-semibold block mb-1" style={{ color: "var(--text-secondary)" }}>Ad account ID</label>
          <input value={accountId} onChange={(e) => setAccountId(e.target.value)} placeholder="act_1234567890" style={inputStyle} className="px-3 py-2 rounded-lg outline-none text-sm" />
        </div>
        <div>
          <label className="text-xs font-semibold block mb-1" style={{ color: "var(--text-secondary)" }}>Access token</label>
          <input
            type="password"
            autoComplete="off"
            value={token}
            onChange={(e) => setToken(e.target.value)}
            placeholder="Paste the token"
            style={inputStyle}
            className="px-3 py-2 rounded-lg outline-none text-sm"
          />
        </div>
      </div>
      <p className="text-xs" style={{ color: "var(--text-muted)" }}>The token is checked with Meta, then stored encrypted — it&apos;s never shown again or sent to the browser.</p>

      {error && <p className="text-sm" style={{ color: "var(--danger)" }}>{error}</p>}
      <div className="flex justify-end gap-2">
        {onCancel && (
          <button onClick={onCancel} className="px-4 py-2 rounded-lg text-sm font-semibold" style={{ border: "1px solid var(--border-strong)", color: "var(--text-secondary)" }}>
            Cancel
          </button>
        )}
        <button onClick={save} disabled={saving || !accountId.trim() || !token.trim()} className="px-4 py-2 rounded-lg text-sm font-bold disabled:opacity-50" style={{ background: "var(--secondary)", color: "#14150f" }}>
          {saving ? "Checking with Meta…" : "Connect ad account"}
        </button>
      </div>
      </>
      )}
    </div>
  );
}
