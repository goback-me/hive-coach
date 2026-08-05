"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

export default function AddReferralModal({ action }: { action: (formData: FormData) => Promise<void> }) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 px-4 py-2 rounded-lg font-bold text-sm"
        style={{ background: "var(--secondary)", color: "#14150f" }}
      >
        <span className="material-symbols-outlined text-[18px]">add</span>
        Add Referral
      </button>

      {open && mounted && createPortal(
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.6)" }}
          onClick={() => setOpen(false)}
        >
          <div className="card rounded-2xl overflow-hidden" style={{ width: "100%", maxWidth: 440 }} onClick={(e) => e.stopPropagation()}>
            <div className="p-5 flex justify-between items-center" style={{ borderBottom: "1px solid var(--border)" }}>
              <h3 className="font-heading font-bold text-lg" style={{ color: "var(--text-primary)" }}>Add Referral</h3>
              <button onClick={() => setOpen(false)} style={{ color: "var(--text-muted)" }}>
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <form
              action={async (fd) => {
                await action(fd);
                setOpen(false);
              }}
              className="p-5 space-y-4"
            >
              <div>
                <label className="text-xs font-semibold block mb-1" style={{ color: "var(--text-secondary)" }}>Name</label>
                <input name="name" required style={{ width: "100%", background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text-primary)" }} className="px-3 py-2 rounded-lg outline-none" placeholder="e.g. Keeram" />
              </div>
              <div>
                <label className="text-xs font-semibold block mb-1" style={{ color: "var(--text-secondary)" }}>Source</label>
                <input name="source" style={{ width: "100%", background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text-primary)" }} className="px-3 py-2 rounded-lg outline-none" placeholder="e.g. WhatsApp, SMS, Instagram" />
              </div>
              <div>
                <label className="text-xs font-semibold block mb-1" style={{ color: "var(--text-secondary)" }}>Note</label>
                <input name="note" style={{ width: "100%", background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text-primary)" }} className="px-3 py-2 rounded-lg outline-none" placeholder="e.g. Intro'd by Drew" />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setOpen(false)} className="px-4 py-2 rounded-lg text-sm font-semibold" style={{ border: "1px solid var(--border)", color: "var(--text-secondary)" }}>Cancel</button>
                <button type="submit" className="px-4 py-2 rounded-lg text-sm font-bold" style={{ background: "var(--secondary)", color: "#14150f" }}>Add</button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
