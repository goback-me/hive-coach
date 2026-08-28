"use client";

import { useState, useTransition } from "react";

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
  onVerify: (clientId: string) => Promise<{ verified: boolean; checkedUrl?: string; httpStatus?: number; error?: string }>;
}) {
  const [url, setUrl] = useState(websiteUrl ?? "");
  const [verifying, setVerifying] = useState(false);
  const [verifyResult, setVerifyResult] = useState<{ verified: boolean; error?: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const [verified, setVerified] = useState(isVerified);
  const [, startTransition] = useTransition();

  async function handleVerify() {
    setVerifying(true);
    setVerifyResult(null);
    try {
      const result = await onVerify(clientId);
      setVerifyResult(result);
      if (result.verified) setVerified(true);
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
          <button type="submit" className="px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-1" style={{ background: "var(--secondary)", color: "#14150f" }}>
            <span className="material-symbols-outlined text-[16px]">save</span>
            Save
          </button>
        </form>
      </div>

      {url && (
        <div className="card rounded-2xl p-5 mb-4">
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs font-semibold" style={{ color: "var(--text-secondary)" }}>Paste this in their site's &lt;head&gt;</label>
            <button onClick={copySnippet} className="text-xs font-semibold flex items-center gap-1" style={{ color: "var(--primary)" }}>
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
              disabled={verifying}
              className="px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2"
              style={{ background: "var(--primary)", color: "#0d0d0b", opacity: verifying ? 0.6 : 1 }}
            >
              <span className="material-symbols-outlined text-[16px]">{verifying ? "progress_activity" : "check_circle"}</span>
              {verifying ? "Checking..." : "Check installation"}
            </button>
            {verified && (
              <span className="text-xs font-semibold flex items-center gap-1" style={{ color: "var(--primary)" }}>
                <span className="material-symbols-outlined text-[14px]">verified</span>
                Installed
              </span>
            )}
          </div>

          {verifyResult && !verifyResult.verified && (
            <p className="text-xs mt-3" style={{ color: "var(--danger)" }}>
              {verifyResult.error || "Script not found on that page yet — make sure it's pasted and the site is deployed, then check again."}
            </p>
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