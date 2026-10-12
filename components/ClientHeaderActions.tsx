"use client";

import { useEffect, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { saveDriveUrl, saveHiddenTabs, updateClient } from "@/lib/actions";
import { CLIENT_TABS } from "@/lib/client-tabs";

const outline = { color: "var(--text-primary)", border: "1px solid var(--border-strong)" };

type ClientDetails = { name: string; email: string | null; description: string | null; programId: string | null; status: string };

// Client header: the Google Drive folder (everyone opens it, the coach sets it)
// and, for the coach, which tabs this client sees in their portal.
export default function ClientHeaderActions({
  clientId,
  isCoach,
  driveUrl,
  hiddenTabs,
  details,
  programs,
}: {
  clientId: string;
  isCoach: boolean;
  driveUrl: string | null;
  hiddenTabs: string[];
  details: ClientDetails;
  programs: { id: string; name: string }[];
}) {
  const [open, setOpen] = useState<"drive" | "tabs" | "edit" | null>(null);

  return (
    <div className="w-full sm:w-auto sm:ml-auto flex flex-wrap items-center gap-2">
      {driveUrl && (
        <a href={driveUrl} target="_blank" rel="noreferrer" className="flex items-center gap-2 px-4 py-2 rounded-lg font-bold text-sm" style={{ background: "var(--secondary)", color: "#14150f" }}>
          <span className="material-symbols-outlined text-[18px]">folder_open</span>
          Google Drive
        </a>
      )}
      {isCoach && (
        <>
          <button onClick={() => setOpen("edit")} className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-semibold" style={outline}>
            <span className="material-symbols-outlined text-[18px]">edit_note</span>
            Edit client
          </button>
          <button onClick={() => setOpen("drive")} className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-semibold" style={outline}>
            <span className="material-symbols-outlined text-[18px]">{driveUrl ? "edit" : "add_link"}</span>
            {driveUrl ? "Drive link" : "Add Drive folder"}
          </button>
          <button onClick={() => setOpen("tabs")} className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-semibold" style={outline}>
            <span className="material-symbols-outlined text-[18px]">tab</span>
            Portal tabs
          </button>
        </>
      )}

      {open === "drive" && (
        <Modal title="Google Drive folder" onClose={() => setOpen(null)}>
          <DriveForm clientId={clientId} driveUrl={driveUrl} onDone={() => setOpen(null)} />
        </Modal>
      )}
      {open === "edit" && (
        <Modal title="Edit client" onClose={() => setOpen(null)}>
          <EditClientForm clientId={clientId} details={details} programs={programs} onDone={() => setOpen(null)} />
        </Modal>
      )}
      {open === "tabs" && (
        <Modal title="Portal tabs" onClose={() => setOpen(null)}>
          <TabsForm clientId={clientId} hiddenTabs={hiddenTabs} onDone={() => setOpen(null)} />
        </Modal>
      )}
    </div>
  );
}

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return null;
  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.6)" }} onClick={onClose}>
      <div className="card rounded-2xl overflow-hidden" style={{ width: "100%", maxWidth: 480 }} onClick={(e) => e.stopPropagation()}>
        <div className="p-5 flex justify-between items-center" style={{ borderBottom: "1px solid var(--border)" }}>
          <h3 className="font-heading font-bold text-lg" style={{ color: "var(--text-primary)" }}>{title}</h3>
          <button onClick={onClose} style={{ color: "var(--text-muted)" }}>
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>
        {children}
      </div>
    </div>,
    document.body,
  );
}

function DriveForm({ clientId, driveUrl, onDone }: { clientId: string; driveUrl: string | null; onDone: () => void }) {
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  return (
    <form
      action={async (fd) => {
        setPending(true);
        const r = await saveDriveUrl(clientId, fd);
        setPending(false);
        if (r.error) setError(r.error);
        else onDone();
      }}
      className="p-5 space-y-3"
    >
      <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
        The client&apos;s shared folder for assets, course files and documents. It shows as a <b>Google Drive</b> button on their portal.
      </p>
      <input
        name="driveUrl"
        defaultValue={driveUrl ?? ""}
        placeholder="https://drive.google.com/drive/folders/…"
        className="w-full px-3 py-2 rounded-lg outline-none text-sm"
        style={{ background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text-primary)" }}
      />
      <p className="text-xs" style={{ color: "var(--text-muted)" }}>Leave empty and save to remove it. Make sure the folder is shared with the client.</p>
      {error && <p className="text-sm" style={{ color: "var(--danger)" }}>{error}</p>}
      <div className="flex justify-end">
        <button type="submit" disabled={pending} className="px-4 py-2 rounded-lg text-sm font-bold disabled:opacity-60" style={{ background: "var(--secondary)", color: "#14150f" }}>
          {pending ? "Saving…" : "Save"}
        </button>
      </div>
    </form>
  );
}

function TabsForm({ clientId, hiddenTabs, onDone }: { clientId: string; hiddenTabs: string[]; onDone: () => void }) {
  const [hidden, setHidden] = useState(new Set(hiddenTabs));
  const [pending, setPending] = useState(false);
  return (
    <div className="p-5 space-y-3">
      <p className="text-sm" style={{ color: "var(--text-secondary)" }}>Tabs this client sees on their portal. You always see every tab.</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {CLIENT_TABS.map((t) => {
          const visible = !hidden.has(t.key);
          return (
            <label key={t.key} className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm cursor-pointer" style={{ background: "var(--surface-hover)", color: visible ? "var(--text-primary)" : "var(--text-muted)" }}>
              <input
                type="checkbox"
                className="accent-[var(--primary)]"
                checked={visible}
                onChange={() => {
                  const next = new Set(hidden);
                  if (visible) next.add(t.key);
                  else next.delete(t.key);
                  setHidden(next);
                }}
              />
              {t.label}
            </label>
          );
        })}
      </div>
      <div className="flex justify-end">
        <button
          onClick={async () => {
            setPending(true);
            await saveHiddenTabs(clientId, Array.from(hidden));
            setPending(false);
            onDone();
          }}
          disabled={pending}
          className="px-4 py-2 rounded-lg text-sm font-bold disabled:opacity-60"
          style={{ background: "var(--secondary)", color: "#14150f" }}
        >
          {pending ? "Saving…" : "Save"}
        </button>
      </div>
    </div>
  );
}

function EditClientForm({ clientId, details, programs, onDone }: { clientId: string; details: ClientDetails; programs: { id: string; name: string }[]; onDone: () => void }) {
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const input = { width: "100%", background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text-primary)" } as const;
  const label = "text-xs font-semibold block mb-1";
  return (
    <form
      action={async (fd) => {
        setPending(true);
        const r = await updateClient(clientId, fd);
        setPending(false);
        if (r.error) setError(r.error);
        else onDone();
      }}
      className="p-5 space-y-3"
    >
      <div>
        <label className={label} style={{ color: "var(--text-secondary)" }}>Client name</label>
        <input name="name" required defaultValue={details.name} style={input} className="px-3 py-2 rounded-lg outline-none text-sm" />
      </div>
      <div>
        <label className={label} style={{ color: "var(--text-secondary)" }}>Email</label>
        <input name="email" type="email" defaultValue={details.email ?? ""} placeholder="owner@business.com" style={input} className="px-3 py-2 rounded-lg outline-none text-sm" />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className={label} style={{ color: "var(--text-secondary)" }}>Program</label>
          <select name="programId" defaultValue={details.programId ?? ""} style={input} className="px-3 py-2 rounded-lg outline-none text-sm">
            <option value="">No program</option>
            {programs.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className={label} style={{ color: "var(--text-secondary)" }}>Status</label>
          <select name="status" defaultValue={details.status} style={input} className="px-3 py-2 rounded-lg outline-none text-sm">
            <option value="ONBOARDING">Onboarding</option>
            <option value="ACTIVE">Active</option>
            <option value="CHURNED">Churned</option>
          </select>
        </div>
      </div>
      <div>
        <label className={label} style={{ color: "var(--text-secondary)" }}>Description</label>
        <textarea name="description" rows={2} defaultValue={details.description ?? ""} placeholder="What they do" style={input} className="px-3 py-2 rounded-lg outline-none text-sm resize-y" />
      </div>
      <p className="text-xs" style={{ color: "var(--text-muted)" }}>Renaming keeps the same page address, so saved links keep working. Login names are edited in Settings → Users.</p>
      {error && <p className="text-sm" style={{ color: "var(--danger)" }}>{error}</p>}
      <div className="flex justify-end">
        <button type="submit" disabled={pending} className="px-4 py-2 rounded-lg text-sm font-bold disabled:opacity-60" style={{ background: "var(--secondary)", color: "#14150f" }}>
          {pending ? "Saving…" : "Save"}
        </button>
      </div>
    </form>
  );
}
