"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

export default function AddClientModal({
  action,
  programs,
}: {
  action: (formData: FormData) => Promise<void>;
  programs: { id: string; name: string }[];
}) {
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
        Add Client
      </button>

      {open && mounted && createPortal(
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.6)" }}
          onClick={() => setOpen(false)}
        >
          <div
            className="card rounded-2xl overflow-hidden"
            style={{ width: "100%", maxWidth: 480 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-5 flex justify-between items-center" style={{ borderBottom: "1px solid var(--border)" }}>
              <h3 className="font-heading font-bold text-lg" style={{ color: "var(--text-primary)" }}>Add Client</h3>
              <button onClick={() => setOpen(false)} style={{ color: "var(--text-muted)" }}>
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <form action={action} className="p-5 space-y-4">
              <div>
                <label className="text-xs font-semibold block mb-1" style={{ color: "var(--text-secondary)" }}>Client name</label>
                <input
                  name="name"
                  required
                  style={{ width: "100%", background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text-primary)" }}
                  className="px-3 py-2 rounded-lg outline-none"
                  placeholder="e.g. Sarah Chen"
                />
              </div>
              <div>
                <label className="text-xs font-semibold block mb-1" style={{ color: "var(--text-secondary)" }}>Description</label>
                <input
                  name="description"
                  style={{ width: "100%", background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text-primary)" }}
                  className="px-3 py-2 rounded-lg outline-none"
                  placeholder="e.g. Tattoo artist marketing consulting"
                />
              </div>
              <div>
                <label className="text-xs font-semibold block mb-1" style={{ color: "var(--text-secondary)" }}>Program</label>
                <select
                  name="programId"
                  style={{ width: "100%", background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text-primary)" }}
                  className="px-3 py-2 rounded-lg outline-none"
                >
                  <option value="">No program</option>
                  {programs.map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold block mb-1" style={{ color: "var(--text-secondary)" }}>Status</label>
                <select
                  name="status"
                  defaultValue="ONBOARDING"
                  style={{ width: "100%", background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text-primary)" }}
                  className="px-3 py-2 rounded-lg outline-none"
                >
                  <option value="ONBOARDING">Onboarding</option>
                  <option value="ACTIVE">Active</option>
                  <option value="CHURNED">Churned</option>
                </select>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setOpen(false)} className="px-4 py-2 rounded-lg text-sm font-semibold" style={{ border: "1px solid var(--border)", color: "var(--text-secondary)" }}>
                  Cancel
                </button>
                <button type="submit" className="px-4 py-2 rounded-lg text-sm font-bold" style={{ background: "var(--secondary)", color: "#14150f" }}>
                  Create client
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
