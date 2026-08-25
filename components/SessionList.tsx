"use client";

import { useState, useTransition } from "react";

type Session = {
  id: string;
  clientName: string;
  clientSlug: string;
  scheduledAt: string;
  durationMin: number;
  status: string;
  notes: string | null;
};

const STATUS_STYLE: Record<string, { color: string; label: string }> = {
  SCHEDULED: { color: "#facc15", label: "Scheduled" },
  COMPLETED: { color: "var(--primary)", label: "Completed" },
  CANCELLED: { color: "var(--text-muted)", label: "Cancelled" },
  NO_SHOW: { color: "var(--danger)", label: "No-show" },
};

const STATUS_ORDER = ["SCHEDULED", "COMPLETED", "NO_SHOW", "CANCELLED"];

export default function SessionList({
  initialSessions,
  clients,
  clientId,
  onCreate,
  onUpdateStatus,
  showClientColumn = true,
}: {
  initialSessions: Session[];
  clients?: { id: string; name: string }[];
  clientId?: string;
  onCreate: (formData: FormData) => Promise<void>;
  onUpdateStatus: (id: string, status: string) => Promise<void>;
  showClientColumn?: boolean;
}) {
  const [sessions, setSessions] = useState(initialSessions);
  const [showForm, setShowForm] = useState(false);
  const [, startTransition] = useTransition();

  const now = new Date();
  const upcoming = sessions.filter((s) => s.status === "SCHEDULED" && new Date(s.scheduledAt) >= now).length;
  const missed = sessions.filter((s) => s.status === "SCHEDULED" && new Date(s.scheduledAt) < now).length;
  const completed = sessions.filter((s) => s.status === "COMPLETED").length;

  function cycleStatus(session: Session) {
    const next = STATUS_ORDER[(STATUS_ORDER.indexOf(session.status) + 1) % STATUS_ORDER.length];
    setSessions((prev) => prev.map((s) => (s.id === session.id ? { ...s, status: next } : s)));
    startTransition(() => {
      onUpdateStatus(session.id, next);
    });
  }

  return (
    <div>
      <div className="flex items-center gap-4 mb-4 text-sm">
        <span style={{ color: "var(--text-primary)" }}><b>{upcoming}</b> Upcoming</span>
        <span style={{ color: "var(--danger)" }}><b>{missed}</b> Needs follow-up</span>
        <span style={{ color: "var(--primary)" }}><b>{completed}</b> Completed</span>
      </div>

      <button
        onClick={() => setShowForm((s) => !s)}
        className="flex items-center gap-2 px-4 py-2 rounded-lg font-bold text-sm mb-4"
        style={{ background: "var(--secondary)", color: "#14150f" }}
      >
        <span className="material-symbols-outlined text-[18px]">add</span>
        Schedule Session
      </button>

      {showForm && (
        <form
          action={async (fd) => {
            await onCreate(fd);
            setShowForm(false);
          }}
          className="card rounded-xl p-4 mb-4 grid grid-cols-4 gap-2"
        >
          {clientId && <input type="hidden" name="clientId" value={clientId} />}
          {!clientId && clients && (
            <select
              name="clientId"
              required
              style={{ background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text-primary)" }}
              className="px-3 py-2 rounded-lg outline-none text-sm"
            >
              <option value="">Choose a client...</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          )}
          <input
            name="scheduledAt"
            type="datetime-local"
            required
            style={{ background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text-primary)" }}
            className="px-3 py-2 rounded-lg outline-none text-sm"
          />
          <input
            name="durationMin"
            type="number"
            defaultValue={45}
            min={5}
            step={5}
            placeholder="Minutes"
            style={{ background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text-primary)" }}
            className="px-3 py-2 rounded-lg outline-none text-sm"
          />
          <input
            name="notes"
            placeholder="Notes (optional)"
            style={{ background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text-primary)" }}
            className="px-3 py-2 rounded-lg outline-none text-sm"
          />
          <button type="submit" className="px-3 py-2 rounded-lg text-sm font-bold" style={{ background: "var(--primary)", color: "#0d0d0b" }}>
            Schedule
          </button>
        </form>
      )}

      <div className="card rounded-2xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr style={{ borderBottom: "1px solid var(--border)" }}>
              <th className="text-left px-4 py-3 font-medium" style={{ color: "var(--text-muted)" }}>Date & time</th>
              <th className="text-left px-4 py-3 font-medium" style={{ color: "var(--text-muted)" }}>Duration</th>
              <th className="text-left px-4 py-3 font-medium" style={{ color: "var(--text-muted)" }}>Status</th>
              {showClientColumn && <th className="text-left px-4 py-3 font-medium" style={{ color: "var(--text-muted)" }}>Client</th>}
              <th className="text-left px-4 py-3 font-medium" style={{ color: "var(--text-muted)" }}>Notes</th>
            </tr>
          </thead>
          <tbody>
            {sessions.map((s) => {
              const style = STATUS_STYLE[s.status] ?? STATUS_STYLE.SCHEDULED;
              const isPastDue = s.status === "SCHEDULED" && new Date(s.scheduledAt) < now;
              return (
                <tr key={s.id} style={{ borderBottom: "1px solid var(--border)" }}>
                  <td className="px-4 py-3" style={{ color: isPastDue ? "var(--danger)" : "var(--text-primary)" }}>
                    {new Date(s.scheduledAt).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })}
                  </td>
                  <td className="px-4 py-3" style={{ color: "var(--text-secondary)" }}>{s.durationMin} min</td>
                  <td className="px-4 py-3">
                    <button onClick={() => cycleStatus(s)} className="flex items-center gap-1.5 text-xs font-semibold" style={{ color: style.color }}>
                      <span className="w-1.5 h-1.5 rounded-full" style={{ background: style.color }} />
                      {style.label}
                    </button>
                  </td>
                  {showClientColumn && <td className="px-4 py-3" style={{ color: "var(--text-secondary)" }}>{s.clientName}</td>}
                  <td className="px-4 py-3" style={{ color: "var(--text-secondary)" }}>{s.notes ?? "—"}</td>
                </tr>
              );
            })}
            {sessions.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center" style={{ color: "var(--text-muted)" }}>No sessions yet.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}