"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { createSession, deleteWeeklyUpdate, saveWeeklyUpdate, toggleWeeklyStep, updateSessionStatus } from "@/lib/actions";

export type WeeklyUpdateRow = {
  id: string;
  callDate: string; // "YYYY-MM-DD"
  summary: string;
  nextSteps: string[];
  stepsDone: number[];
  internalNotes: string | null; // only ever populated for a coach viewer
  createdBy: string;
};

const inputStyle = { background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text-primary)", width: "100%" };

const formatDay = (day: string) => {
  const [y, m, d] = day.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-AU", { weekday: "short", day: "numeric", month: "short", year: "numeric" });
};

// The weekly call write-up, newest first: what was covered and the next steps the client ticks off.
export default function WeeklyStatusPanel({
  clientId,
  isCoach,
  updates,
  nextSession,
}: {
  clientId: string;
  isCoach: boolean;
  updates: WeeklyUpdateRow[];
  nextSession: { id: string; label: string } | null;
}) {
  const [done, setDone] = useState<Record<string, number[]>>({});
  const [editing, setEditing] = useState<WeeklyUpdateRow | "new" | null>(null);
  const [scheduling, setScheduling] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const stepsDone = (u: WeeklyUpdateRow) => done[u.id] ?? u.stepsDone;

  async function tick(u: WeeklyUpdateRow, i: number, on: boolean) {
    const before = stepsDone(u);
    setDone((d) => ({ ...d, [u.id]: on ? [...before, i] : before.filter((x) => x !== i) }));
    setError(null);
    try {
      await toggleWeeklyStep(u.id, i, on);
      // Server props are fresh once the action returns — drop the optimistic copy so edits never fight it.
      setDone(({ [u.id]: _, ...rest }) => rest);
    } catch (e) {
      setDone((d) => ({ ...d, [u.id]: before }));
      setError(e instanceof Error ? e.message : "Couldn't save");
    }
  }

  return (
    <div className="space-y-5 max-w-[900px]">
      <div className="card rounded-2xl p-5 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: "var(--primary-tint)" }}>
            <span className="material-symbols-outlined text-[18px]" style={{ color: "var(--primary)" }}>event</span>
          </span>
          <div>
            <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
              {nextSession ? `Next call: ${nextSession.label}` : "No call scheduled yet"}
            </p>
            {isCoach && nextSession && (
              <button
                onClick={async () => {
                  if (confirm("Cancel this call?")) await updateSessionStatus(nextSession.id, "CANCELLED");
                }}
                className="text-xs font-semibold"
                style={{ color: "var(--danger)" }}
              >
                Cancel call
              </button>
            )}
          </div>
        </div>
        {isCoach && (
          <div className="flex flex-wrap gap-2">
            <button onClick={() => setScheduling(true)} className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold" style={{ color: "var(--text-primary)", border: "1px solid var(--border-strong)" }}>
              <span className="material-symbols-outlined text-[18px]">event</span>
              {nextSession ? "Schedule another" : "Schedule call"}
            </button>
            <button onClick={() => setEditing("new")} className="flex items-center gap-2 px-4 py-2 rounded-lg font-bold text-sm" style={{ background: "var(--secondary)", color: "#14150f" }}>
              <span className="material-symbols-outlined text-[18px]">add</span>
              Log weekly call
            </button>
          </div>
        )}
      </div>
      {error && <p className="text-xs" style={{ color: "var(--danger)" }}>{error}</p>}

      {updates.length === 0 && (
        <div className="card rounded-2xl p-8 text-center text-sm" style={{ color: "var(--text-secondary)" }}>
          {isCoach ? "No weekly calls logged yet — log one after each call." : "Your weekly updates will show here after each call."}
        </div>
      )}

      {updates.map((u, idx) => {
        const ticks = stepsDone(u);
        return (
          <div key={u.id} className="card rounded-2xl p-5 space-y-3" style={idx === 0 ? { border: "2px solid var(--primary)" } : undefined}>
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
                {formatDay(u.callDate)}
                <span className="font-normal" style={{ color: "var(--text-muted)" }}> · {u.createdBy}</span>
              </p>
              <div className="flex items-center gap-2">
                {u.nextSteps.length > 0 && (
                  <span className="text-[11px]" style={{ color: "var(--text-muted)" }}>
                    {ticks.length}/{u.nextSteps.length} steps done
                  </span>
                )}
                {idx === 0 && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold" style={{ background: "var(--primary-tint)", color: "var(--primary)" }}>
                    Latest
                  </span>
                )}
                {isCoach && (
                  <button onClick={() => setEditing(u)} className="text-xs font-semibold px-2 py-1 rounded-lg" style={{ color: "var(--text-secondary)", border: "1px solid var(--border)" }}>
                    Edit
                  </button>
                )}
              </div>
            </div>

            {u.summary && <p className="text-sm whitespace-pre-wrap" style={{ color: "var(--text-secondary)" }}>{u.summary}</p>}

            {u.nextSteps.length > 0 && (
              <div className="space-y-1.5">
                <p className="text-xs font-bold tracking-widest" style={{ color: "var(--text-muted)" }}>NEXT STEPS</p>
                {u.nextSteps.map((step, i) => {
                  const on = ticks.includes(i);
                  return (
                    <label key={i} className="flex items-start gap-2 text-sm cursor-pointer" style={{ color: on ? "var(--text-muted)" : "var(--text-primary)" }}>
                      <input type="checkbox" className="mt-1 accent-[var(--primary)]" checked={on} onChange={(e) => tick(u, i, e.target.checked)} />
                      <span style={{ textDecoration: on ? "line-through" : undefined }}>{step}</span>
                    </label>
                  );
                })}
              </div>
            )}

            {u.internalNotes && (
              <div className="rounded-xl p-3 text-sm" style={{ background: "var(--surface-hover)", color: "var(--text-secondary)" }}>
                <p className="text-xs font-bold mb-1" style={{ color: "var(--text-muted)" }}>COACH NOTES — not visible to the client</p>
                <p className="whitespace-pre-wrap">{u.internalNotes}</p>
              </div>
            )}
          </div>
        );
      })}

      {editing && <UpdateForm clientId={clientId} update={editing === "new" ? null : editing} onClose={() => setEditing(null)} />}
      {scheduling && <ScheduleForm clientId={clientId} onClose={() => setScheduling(false)} />}
    </div>
  );
}

function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function UpdateForm({ clientId, update, onClose }: { clientId: string; update: WeeklyUpdateRow | null; onClose: () => void }) {
  const [mounted, setMounted] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => setMounted(true), []);
  if (!mounted) return null;

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.6)" }} onClick={onClose}>
      <div className="card rounded-2xl overflow-hidden flex flex-col" style={{ width: "100%", maxWidth: 620, maxHeight: "90vh" }} onClick={(e) => e.stopPropagation()}>
        <div className="p-5 flex justify-between items-center" style={{ borderBottom: "1px solid var(--border)" }}>
          <h3 className="font-heading font-bold text-lg" style={{ color: "var(--text-primary)" }}>{update ? "Edit weekly update" : "Log weekly call"}</h3>
          <button onClick={onClose} style={{ color: "var(--text-muted)" }}>
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>
        <form
          action={async (fd) => {
            setPending(true);
            setError(null);
            const r = await saveWeeklyUpdate(clientId, update?.id ?? null, fd);
            setPending(false);
            if (r.error) setError(r.error);
            else onClose();
          }}
          className="p-5 space-y-4 overflow-y-auto"
        >
          <div>
            <label className="text-xs font-semibold block mb-1" style={{ color: "var(--text-secondary)" }}>Call date</label>
            <input name="callDate" type="date" required max={todayStr()} defaultValue={update?.callDate ?? todayStr()} style={inputStyle} className="px-3 py-2 rounded-lg outline-none text-sm" />
          </div>
          <div>
            <label className="text-xs font-semibold block mb-1" style={{ color: "var(--text-secondary)" }}>What we covered (the client sees this)</label>
            <textarea name="summary" rows={4} defaultValue={update?.summary} placeholder="Wins, numbers, what we worked through…" style={inputStyle} className="px-3 py-2 rounded-lg outline-none text-sm resize-y" />
          </div>
          <div>
            <label className="text-xs font-semibold block mb-1" style={{ color: "var(--text-secondary)" }}>Next steps — one per line (the client ticks these off)</label>
            <textarea
              name="nextSteps"
              rows={4}
              defaultValue={update?.nextSteps.join("\n")}
              placeholder={"Update the Prospect Status on every lead\nRecord 2 new ad videos"}
              style={inputStyle}
              className="px-3 py-2 rounded-lg outline-none text-sm resize-y"
            />
          </div>
          <div>
            <label className="text-xs font-semibold block mb-1" style={{ color: "var(--text-secondary)" }}>Coach notes (private)</label>
            <textarea name="internalNotes" rows={2} defaultValue={update?.internalNotes ?? ""} placeholder="Only coaches see this" style={inputStyle} className="px-3 py-2 rounded-lg outline-none text-sm resize-y" />
          </div>
          {!update && (
            <div>
              <label className="text-xs font-semibold block mb-1" style={{ color: "var(--text-secondary)" }}>Book the next call (optional, Sydney time)</label>
              <input name="nextCallAt" type="datetime-local" style={inputStyle} className="px-3 py-2 rounded-lg outline-none text-sm" />
            </div>
          )}
          {error && <p className="text-sm" style={{ color: "var(--danger)" }}>{error}</p>}
          <div className="flex items-center gap-2 pt-2">
            {update && (
              <button
                type="button"
                onClick={async () => {
                  if (!confirm("Delete this weekly update?")) return;
                  await deleteWeeklyUpdate(update.id);
                  onClose();
                }}
                className="px-4 py-2 rounded-lg text-sm font-semibold"
                style={{ color: "var(--danger)", border: "1px solid var(--border-strong)" }}
              >
                Delete
              </button>
            )}
            <button type="button" onClick={onClose} className="ml-auto px-4 py-2 rounded-lg text-sm font-semibold" style={{ border: "1px solid var(--border-strong)", color: "var(--text-secondary)" }}>
              Cancel
            </button>
            <button type="submit" disabled={pending} className="px-4 py-2 rounded-lg text-sm font-bold disabled:opacity-60" style={{ background: "var(--secondary)", color: "#14150f" }}>
              {pending ? "Saving…" : "Save"}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body,
  );
}

function ScheduleForm({ clientId, onClose }: { clientId: string; onClose: () => void }) {
  const [mounted, setMounted] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => setMounted(true), []);
  if (!mounted) return null;

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.6)" }} onClick={onClose}>
      <div className="card rounded-2xl overflow-hidden" style={{ width: "100%", maxWidth: 440 }} onClick={(e) => e.stopPropagation()}>
        <div className="p-5 flex justify-between items-center" style={{ borderBottom: "1px solid var(--border)" }}>
          <h3 className="font-heading font-bold text-lg" style={{ color: "var(--text-primary)" }}>Schedule call</h3>
          <button onClick={onClose} style={{ color: "var(--text-muted)" }}>
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>
        <form
          action={async (fd) => {
            setPending(true);
            setError(null);
            try {
              await createSession(fd);
              onClose();
            } catch (e) {
              setError(e instanceof Error ? e.message : "Couldn't schedule the call");
            } finally {
              setPending(false);
            }
          }}
          className="p-5 space-y-4"
        >
          <input type="hidden" name="clientId" value={clientId} />
          <div>
            <label className="text-xs font-semibold block mb-1" style={{ color: "var(--text-secondary)" }}>Date &amp; time (Sydney)</label>
            <input name="scheduledAt" type="datetime-local" required style={inputStyle} className="px-3 py-2 rounded-lg outline-none text-sm" />
          </div>
          <div>
            <label className="text-xs font-semibold block mb-1" style={{ color: "var(--text-secondary)" }}>Length</label>
            <select name="durationMin" defaultValue="45" style={inputStyle} className="px-3 py-2 rounded-lg outline-none text-sm">
              {[15, 30, 45, 60, 90].map((m) => (
                <option key={m} value={m}>{m} min</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs font-semibold block mb-1" style={{ color: "var(--text-secondary)" }}>Notes (optional)</label>
            <input name="notes" placeholder="Agenda, meeting link…" style={inputStyle} className="px-3 py-2 rounded-lg outline-none text-sm" />
          </div>
          {error && <p className="text-sm" style={{ color: "var(--danger)" }}>{error}</p>}
          <div className="flex justify-end gap-2">
            <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg text-sm font-semibold" style={{ border: "1px solid var(--border-strong)", color: "var(--text-secondary)" }}>
              Cancel
            </button>
            <button type="submit" disabled={pending} className="px-4 py-2 rounded-lg text-sm font-bold disabled:opacity-60" style={{ background: "var(--secondary)", color: "#14150f" }}>
              {pending ? "Scheduling…" : "Schedule"}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body,
  );
}
