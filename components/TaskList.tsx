"use client";

import { useState, useTransition } from "react";

type Task = {
  id: string;
  title: string;
  status: string;
  assignee: string | null;
  dueDate: string | null;
  source: string;
  clientName?: string | null;
};

const STATUS_STYLE: Record<string, { color: string; label: string }> = {
  NOT_STARTED: { color: "var(--text-muted)", label: "Not Started" },
  IN_PROGRESS: { color: "#facc15", label: "In Progress" },
  BLOCKED: { color: "var(--danger)", label: "Blocked" },
  DONE: { color: "var(--primary)", label: "Done" },
};

export default function TaskList({
  initialTasks,
  clients,
  clientId,
  onCreate,
  onUpdateStatus,
  showClientColumn = true,
}: {
  initialTasks: Task[];
  clients?: { id: string; name: string }[];
  clientId?: string;
  onCreate: (formData: FormData) => Promise<void>;
  onUpdateStatus: (id: string, status: string) => Promise<void>;
  showClientColumn?: boolean;
}) {
  const [tasks, setTasks] = useState(initialTasks);
  const [showForm, setShowForm] = useState(false);
  const [, startTransition] = useTransition();

  const open = tasks.filter((t) => t.status !== "DONE").length;
  const overdue = tasks.filter((t) => t.status !== "DONE" && t.dueDate && new Date(t.dueDate) < new Date()).length;
  const done = tasks.filter((t) => t.status === "DONE").length;

  function cycleStatus(task: Task) {
    const order = ["NOT_STARTED", "IN_PROGRESS", "BLOCKED", "DONE"];
    const next = order[(order.indexOf(task.status) + 1) % order.length];
    setTasks((prev) => prev.map((t) => (t.id === task.id ? { ...t, status: next } : t)));
    startTransition(() => {
      onUpdateStatus(task.id, next);
    });
  }

  return (
    <div>
      <div className="flex items-center gap-4 mb-4 text-sm">
        <span style={{ color: "var(--text-primary)" }}><b>{open}</b> Open</span>
        <span style={{ color: "var(--danger)" }}><b>{overdue}</b> Overdue</span>
        <span style={{ color: "var(--primary)" }}><b>{done}</b> Done</span>
      </div>

      <button
        onClick={() => setShowForm((s) => !s)}
        className="flex items-center gap-2 px-4 py-2 rounded-lg font-bold text-sm mb-4"
        style={{ background: "var(--secondary)", color: "#14150f" }}
      >
        <span className="material-symbols-outlined text-[18px]">add</span>
        New Task
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
          <input
            name="title"
            required
            placeholder="Task title"
            style={{ background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text-primary)" }}
            className="px-3 py-2 rounded-lg outline-none text-sm col-span-2"
          />
          {!clientId && clients && (
            <select
              name="clientId"
              style={{ background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text-primary)" }}
              className="px-3 py-2 rounded-lg outline-none text-sm"
            >
              <option value="">No client</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          )}
          <input
            name="assignee"
            placeholder="Assignee"
            style={{ background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text-primary)" }}
            className="px-3 py-2 rounded-lg outline-none text-sm"
          />
          <input
            name="dueDate"
            type="date"
            style={{ background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text-primary)" }}
            className="px-3 py-2 rounded-lg outline-none text-sm"
          />
          <button type="submit" className="px-3 py-2 rounded-lg text-sm font-bold" style={{ background: "var(--primary)", color: "#0d0d0b" }}>
            Add
          </button>
        </form>
      )}

      <div className="card rounded-2xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr style={{ borderBottom: "1px solid var(--border)" }}>
              <th className="text-left px-4 py-3 font-medium" style={{ color: "var(--text-muted)" }}>Task</th>
              <th className="text-left px-4 py-3 font-medium" style={{ color: "var(--text-muted)" }}>Status</th>
              <th className="text-left px-4 py-3 font-medium" style={{ color: "var(--text-muted)" }}>Assignee</th>
              {showClientColumn && <th className="text-left px-4 py-3 font-medium" style={{ color: "var(--text-muted)" }}>Client</th>}
              <th className="text-left px-4 py-3 font-medium" style={{ color: "var(--text-muted)" }}>Due</th>
            </tr>
          </thead>
          <tbody>
            {tasks.map((t) => {
              const s = STATUS_STYLE[t.status] ?? STATUS_STYLE.NOT_STARTED;
              const isOverdue = t.status !== "DONE" && t.dueDate && new Date(t.dueDate) < new Date();
              return (
                <tr key={t.id} style={{ borderBottom: "1px solid var(--border)" }}>
                  <td className="px-4 py-3" style={{ color: "var(--text-primary)" }}>
                    {t.title}
                    {t.source === "CLICKUP" && (
                      <span className="ml-2 text-[10px] font-bold px-1.5 py-0.5 rounded" style={{ background: "var(--surface-hover)", color: "var(--text-muted)" }}>
                        CLICKUP
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <button onClick={() => cycleStatus(t)} className="flex items-center gap-1.5 text-xs font-semibold" style={{ color: s.color }}>
                      <span className="w-1.5 h-1.5 rounded-full" style={{ background: s.color }} />
                      {s.label}
                    </button>
                  </td>
                  <td className="px-4 py-3" style={{ color: "var(--text-secondary)" }}>{t.assignee ?? "—"}</td>
                  {showClientColumn && <td className="px-4 py-3" style={{ color: "var(--text-secondary)" }}>{t.clientName ?? "—"}</td>}
                  <td className="px-4 py-3" style={{ color: isOverdue ? "var(--danger)" : "var(--text-secondary)" }}>
                    {t.dueDate ? new Date(t.dueDate).toLocaleDateString() : "—"}
                  </td>
                </tr>
              );
            })}
            {tasks.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center" style={{ color: "var(--text-muted)" }}>No tasks yet.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
