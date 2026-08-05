"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

type Link = { id: string; code: string; label: string };

export default function ReferralLinkManager({
  links,
  action,
}: {
  links: Link[];
  action: (formData: FormData) => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [origin, setOrigin] = useState("");

  useEffect(() => {
    setMounted(true);
    setOrigin(window.location.origin);
  }, []);

  function copy(link: Link) {
    navigator.clipboard.writeText(`${origin}/refer/${link.code}`);
    setCopiedId(link.id);
    setTimeout(() => setCopiedId(null), 1500);
  }

  return (
    <div>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-semibold"
        style={{ border: "1px solid var(--border-strong)", color: "var(--text-secondary)" }}
      >
        <span className="material-symbols-outlined text-[16px]">link</span>
        Referral links
      </button>

      {open && mounted && createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.6)" }} onClick={() => setOpen(false)}>
          <div className="card rounded-2xl overflow-hidden" style={{ width: "100%", maxWidth: 520 }} onClick={(e) => e.stopPropagation()}>
            <div className="p-5 flex justify-between items-center" style={{ borderBottom: "1px solid var(--border)" }}>
              <h3 className="font-heading font-bold text-lg" style={{ color: "var(--text-primary)" }}>Referral links</h3>
              <button onClick={() => setOpen(false)} style={{ color: "var(--text-muted)" }}>
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div className="p-5 space-y-2" style={{ borderBottom: "1px solid var(--border)" }}>
              {links.length === 0 && (
                <p className="text-sm" style={{ color: "var(--text-secondary)" }}>No links yet — create one below.</p>
              )}
              {links.map((link) => (
                <div key={link.id} className="flex items-center justify-between rounded-lg p-3" style={{ background: "var(--surface)" }}>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>{link.label}</p>
                    <p className="text-xs truncate" style={{ color: "var(--text-muted)" }}>{origin}/refer/{link.code}</p>
                  </div>
                  <button
                    onClick={() => copy(link)}
                    className="text-xs font-bold px-3 py-1.5 rounded-lg shrink-0 ml-2"
                    style={{ background: "var(--primary-tint)", color: "var(--primary)" }}
                  >
                    {copiedId === link.id ? "Copied!" : "Copy"}
                  </button>
                </div>
              ))}
            </div>

            <form action={action} className="p-5 flex gap-2">
              <input
                name="label"
                required
                placeholder="e.g. Instagram bio link"
                style={{ flex: 1, background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text-primary)" }}
                className="px-3 py-2 rounded-lg outline-none text-sm"
              />
              <button type="submit" className="px-4 py-2 rounded-lg text-sm font-bold" style={{ background: "var(--secondary)", color: "#14150f" }}>
                Create
              </button>
            </form>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
