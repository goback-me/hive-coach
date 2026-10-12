"use client";

import { useTransition } from "react";
import { setClientPreview } from "@/lib/actions";

/** Coach-only switch between the coach's view of a client and exactly what the client sees. */
export default function ClientViewToggle({ previewing }: { previewing: boolean }) {
  const [pending, startTransition] = useTransition();
  const set = (on: boolean) => startTransition(() => setClientPreview(on));

  return (
    <div className={`inline-flex p-1 rounded-xl text-xs font-semibold ${pending ? "opacity-60" : ""}`} style={{ background: "var(--surface-hover)" }} role="group" aria-label="View">
      {([
        [false, "Coach view", "admin_panel_settings"],
        [true, "Client view", "visibility"],
      ] as const).map(([on, label, icon]) => {
        const active = previewing === on;
        return (
          <button
            key={label}
            onClick={() => !active && set(on)}
            aria-pressed={active}
            disabled={pending}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-colors"
            style={active ? { background: "var(--surface-card)", color: "var(--primary)", boxShadow: "0 1px 3px rgba(0,0,0,0.12)" } : { color: "var(--text-secondary)" }}
          >
            <span className="material-symbols-outlined text-[16px]">{icon}</span>
            {label}
          </button>
        );
      })}
    </div>
  );
}

export function ClientPreviewBanner({ clientName }: { clientName: string }) {
  const [pending, startTransition] = useTransition();
  return (
    <div className="mb-5 rounded-xl px-4 py-3 flex flex-wrap items-center gap-3 text-sm" style={{ background: "#facc15", color: "#14150f" }}>
      <span className="material-symbols-outlined text-[20px]">visibility</span>
      <span className="flex-1 min-w-[200px]">
        <b>Client view</b> — you&apos;re seeing exactly what {clientName} sees. Coach-only buttons, hidden tabs and private notes are hidden.
      </span>
      <button
        onClick={() => startTransition(() => setClientPreview(false))}
        disabled={pending}
        className="px-3 py-1.5 rounded-lg font-bold text-xs disabled:opacity-60"
        style={{ background: "#14150f", color: "#facc15" }}
      >
        {pending ? "Switching…" : "Exit client view"}
      </button>
    </div>
  );
}
