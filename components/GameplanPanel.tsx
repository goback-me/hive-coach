"use client";

import { useState } from "react";

export default function GameplanPanel({
  clientId,
  currentLink,
  onSave,
}: {
  clientId: string;
  currentLink: string | null;
  onSave: (clientId: string, formData: FormData) => Promise<void>;
}) {
  const [link, setLink] = useState(currentLink ?? "");
  const isValidFigma = /^https:\/\/(www\.)?figma\.com\//.test(link);

  return (
    <div>
      <h3 className="font-heading text-xl font-bold mb-1" style={{ color: "var(--text-primary)" }}>Gameplan</h3>
      <p className="mb-4" style={{ color: "var(--text-secondary)" }}>Embed a Figma strategy page for this client.</p>

      <div className="card rounded-2xl p-5 mb-4">
        <label className="text-xs font-semibold block mb-2" style={{ color: "var(--text-secondary)" }}>Figma Link</label>
        <form action={onSave.bind(null, clientId)} className="flex gap-2">
          <input
            name="figmaLink"
            value={link}
            onChange={(e) => setLink(e.target.value)}
            placeholder="https://www.figma.com/design/..."
            style={{ flex: 1, background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text-primary)" }}
            className="px-3 py-2 rounded-lg outline-none text-sm"
          />
          <button type="submit" className="px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-1" style={{ background: "var(--secondary)", color: "#14150f" }}>
            <span className="material-symbols-outlined text-[16px]">save</span>
            Save
          </button>
        </form>
        <p className="text-xs mt-2" style={{ color: "var(--text-muted)" }}>
          Paste any Figma file, prototype, or board URL. It will be embedded below and on the client's own portal.
        </p>
      </div>

      {isValidFigma ? (
        <div className="rounded-2xl overflow-hidden" style={{ border: "1px solid var(--border)", height: 600 }}>
          <iframe
            src={`https://www.figma.com/embed?embed_host=coach-os&url=${encodeURIComponent(link)}`}
            style={{ width: "100%", height: "100%", border: "none" }}
            allowFullScreen
          />
        </div>
      ) : (
        <div className="card rounded-2xl p-10 text-center" style={{ border: "1px dashed var(--border-strong)" }}>
          <span className="material-symbols-outlined text-4xl mb-2" style={{ color: "var(--text-muted)" }}>auto_awesome</span>
          <p className="font-semibold" style={{ color: "var(--text-primary)" }}>No gameplan linked yet</p>
          <p className="text-sm" style={{ color: "var(--text-secondary)" }}>Paste a Figma link above to embed the strategy for this client.</p>
        </div>
      )}
    </div>
  );
}
