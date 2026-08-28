"use client";

import { useState, useTransition } from "react";

type VerifyResult = {
  verified: boolean;
  checkedUrl?: string;
  httpStatus?: number;
  error?: string;
  hasReceivedData?: boolean;
  visitorCount?: number;
  cacheDetected?: Record<string, string> | null;
};

export default function TrackingPanel({
  clientId,
  websiteUrl,
  isVerified,
  embedSnippet,
  embedUrl,
  onSaveWebsite,
  onVerify,
}: {
  clientId: string;
  websiteUrl: string | null;
  isVerified: boolean;
  embedSnippet: string;
  embedUrl: string | null;
  onSaveWebsite: (clientId: string, formData: FormData) => Promise<void>;
  onVerify: (clientId: string) => Promise<VerifyResult>;
}) {
  const [url, setUrl] = useState(websiteUrl ?? "");
  const [verifying, setVerifying] = useState(false);
  const [verifyResult, setVerifyResult] = useState<VerifyResult | null>(null);
  const [copied, setCopied] = useState(false);
  const [verified, setVerified] = useState(isVerified);
  const [saveHover, setSaveHover] = useState(false);
  const [copyHover, setCopyHover] = useState(false);
  const [verifyHover, setVerifyHover] = useState(false);
  const [, startTransition] = useTransition();

  async function handleVerify() {
    setVerifying(true);
    setVerifyResult(null);
    try {
      const result = await onVerify(clientId);
      setVerifyResult(result);
      if (result.verified) setVerified(true);
    } catch (e) {
      // onVerify itself is written to never throw — but if something
      // upstream (auth redirect, unexpected server error) does throw
      // anyway, this is what stops it from failing completely silently.
      setVerifyResult({
        verified: false,
        error: e instanceof Error ? e.message : "Something went wrong checking that site — try again.",
      });
    } finally {
      setVerifying(false);
    }
  }

  function copySnippet() {
    navigator.clipboard.writeText(embedSnippet);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div>
      <h3 className="font-heading text-xl font-bold mb-1" style={{ color: "var(--text-primary)" }}>Tracking</h3>
      <p className="mb-4" style={{ color: "var(--text-secondary)" }}>
        First-party server-side tracking, powered by Swarm.
      </p>

      <div className="card rounded-2xl p-5 mb-4">
        <label className="text-xs font-semibold block mb-2" style={{ color: "var(--text-secondary)" }}>Website</label>
        <form
          action={(fd) => {
            startTransition(() => onSaveWebsite(clientId, fd));
            setVerified(false);
            setVerifyResult(null);
          }}
          className="flex gap-2"
        >
          <input
            name="websiteUrl"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://theirsite.com"
            style={{ flex: 1, background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text-primary)" }}
            className="px-3 py-2 rounded-lg outline-none text-sm"
          />
          <button
            type="submit"
            onMouseEnter={() => setSaveHover(true)}
            onMouseLeave={() => setSaveHover(false)}
            className="px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-1 transition-transform"
            style={{
              background: "var(--secondary)",
              color: "#14150f",
              transform: saveHover ? "translateY(-1px)" : "none",
              boxShadow: saveHover ? "0 4px 12px rgba(0,0,0,0.15)" : "none",
            }}
          >
            <span className="material-symbols-outlined text-[16px]">save</span>
            Save
          </button>
        </form>
      </div>

      {url && (
        <div className="card rounded-2xl p-5 mb-4">
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs font-semibold" style={{ color: "var(--text-secondary)" }}>Paste this in their site's &lt;head&gt;</label>
            <button
              onClick={copySnippet}
              onMouseEnter={() => setCopyHover(true)}
              onMouseLeave={() => setCopyHover(false)}
              className="text-xs font-semibold flex items-center gap-1 transition-opacity"
              style={{ color: "var(--primary)", opacity: copyHover ? 0.7 : 1 }}
            >
              <span className="material-symbols-outlined text-[14px]">{copied ? "check" : "content_copy"}</span>
              {copied ? "Copied" : "Copy"}
            </button>
          </div>
          <pre className="text-xs p-3 rounded-lg overflow-x-auto" style={{ background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text-secondary)" }}>
            {embedSnippet}
          </pre>

          <div className="flex items-center gap-3 mt-4">
            <button
              onClick={handleVerify}
              onMouseEnter={() => setVerifyHover(true)}
              onMouseLeave={() => setVerifyHover(false)}
              disabled={verifying}
              className="px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-transform"
              style={{
                background: "var(--primary)",
                color: "#0d0d0b",
                opacity: verifying ? 0.6 : 1,
                transform: verifyHover && !verifying ? "translateY(-1px)" : "none",
                boxShadow: verifyHover && !verifying ? "0 4px 12px rgba(0,0,0,0.15)" : "none",
                cursor: verifying ? "default" : "pointer",
              }}
            >
              <span className={`material-symbols-outlined text-[16px] ${verifying ? "animate-spin" : ""}`}>
                {verifying ? "progress_activity" : "check_circle"}
              </span>
              {verifying ? "Checking..." : "Check installation"}
            </button>
            {verified && (
              <span className="text-xs font-semibold flex items-center gap-1" style={{ color: "var(--primary)" }}>
                <span className="material-symbols-outlined text-[14px]">verified</span>
                Installed
              </span>
            )}
          </div>

          {/* Error state — always shown when the last check failed, whether
              from a bad result or a thrown exception (both funnel here). */}
          {verifyResult && !verifyResult.verified && (
            <div className="mt-3 p-3 rounded-lg text-xs" style={{ background: "rgba(248,113,113,0.1)", color: "var(--danger)" }}>
              <p className="font-semibold mb-1">Couldn't confirm installation</p>
              {verifyResult.cacheDetected ? (
                <p>
                  We can't see the script yet — but this page looks like it's being served from a <strong>cache</strong>, not freshly generated.
                  If the snippet was just added, ask them to clear their site's cache (WP Rocket, LiteSpeed Cache, Cloudflare, or whatever
                  caching plugin/CDN they use) and check again in a minute.
                </p>
              ) : (
                <p>{verifyResult.error || "Script not found on that page yet — make sure it's pasted and the site is deployed, then check again."}</p>
              )}
              {verifyResult.checkedUrl && (
                <p className="mt-1" style={{ color: "var(--text-muted)" }}>
                  Checked: <span className="font-mono">{verifyResult.checkedUrl}</span>
                  {verifyResult.httpStatus ? ` (HTTP ${verifyResult.httpStatus})` : ""}
                </p>
              )}
            </div>
          )}

          {/* Success — but distinguish "script present" from "actually
              sending real data", since those are two different confidence
              levels and conflating them hides a real "installed but not
              actually firing" failure mode. */}
          {verifyResult && verifyResult.verified && (
            <div
              className="mt-3 p-3 rounded-lg text-xs"
              style={{ background: verifyResult.hasReceivedData ? "rgba(163,230,53,0.15)" : "rgba(250,204,21,0.12)", color: verifyResult.hasReceivedData ? "var(--primary)" : "#b45309" }}
            >
              {verifyResult.hasReceivedData ? (
                <p>✓ Script found, and already receiving real traffic ({verifyResult.visitorCount} visitor{verifyResult.visitorCount === 1 ? "" : "s"} recorded so far).</p>
              ) : (
                <p>✓ Script found on the page — but no visits recorded yet. That's normal if nobody's browsed the site since it was added; check back after someone visits.</p>
              )}
            </div>
          )}
        </div>
      )}

      {!verified && url && (
        <div className="card rounded-2xl p-10 text-center" style={{ border: "1px dashed var(--border-strong)" }}>
          <span className="material-symbols-outlined text-4xl mb-2" style={{ color: "var(--text-muted)" }}>bar_chart</span>
          <p className="font-semibold" style={{ color: "var(--text-primary)" }}>Dashboard will show up once verified</p>
          <p className="text-sm" style={{ color: "var(--text-secondary)" }}>Paste the snippet on their site, then click "Check installation."</p>
        </div>
      )}

      {verified && !embedUrl && (
        <div className="card rounded-2xl p-6 text-center" style={{ color: "var(--danger)" }}>
          Couldn't load the live dashboard right now — refresh the page to try again.
        </div>
      )}

      {verified && embedUrl && (
        <div className="card rounded-2xl overflow-hidden" style={{ height: 560 }}>
          <iframe
            src={embedUrl}
            title="Swarm tracking dashboard"
            style={{ width: "100%", height: "100%", border: "none", display: "block" }}
            sandbox="allow-scripts allow-same-origin allow-forms allow-downloads allow-popups"
            referrerPolicy="no-referrer"
          />
        </div>
      )}
    </div>
  );
}