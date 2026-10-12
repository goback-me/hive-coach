"use client";

import { useEffect, useRef, useState, useTransition, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { addTaskComment, createTask, deleteTask, updateTask, updateTaskStatus } from "@/lib/actions";
import type { TaskRow } from "@/lib/tasks";

const STATUSES = ["NOT_STARTED", "IN_PROGRESS", "BLOCKED", "DONE"] as const;

const STATUS_STYLE: Record<string, { color: string; label: string }> = {
  NOT_STARTED: { color: "var(--text-muted)", label: "Not Started" },
  IN_PROGRESS: { color: "#facc15", label: "In Progress" },
  BLOCKED: { color: "var(--danger)", label: "Blocked" },
  DONE: { color: "var(--primary)", label: "Done" },
};

type Filter = "pending" | "overdue" | "done" | "all";

// Logins that can be assigned a task: the client's own users, plus coaches.
export type Person = { name: string; role: "COACH" | "CLIENT"; clientId: string | null };

const inputStyle = { background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text-primary)" };

function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

// Due the whole of its due day; overdue from the day after.
function isOverdue(t: TaskRow) {
  return t.status !== "DONE" && !!t.dueDate && t.dueDate < todayStr();
}

function formatDue(due: string) {
  const [y, m, d] = due.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-AU", { day: "numeric", month: "short" });
}

function timeAgo(iso: string) {
  const mins = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.round(hrs / 24)}d ago`;
}

export default function TaskList({
  tasks,
  clients,
  clientId,
  people = [],
  isCoach,
  showClientColumn = true,
}: {
  tasks: TaskRow[];
  clients?: { id: string; name: string }[];
  clientId?: string;
  people?: Person[];
  isCoach: boolean;
  showClientColumn?: boolean;
}) {
  // Optimistic status changes layered over server props (props refresh after each action).
  const [statusOverride, setStatusOverride] = useState<Record<string, string>>({});
  const [filter, setFilter] = useState<Filter>("pending");
  const [clientFilter, setClientFilter] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [, startTransition] = useTransition();

  const rows = tasks.map((t) => (statusOverride[t.id] ? { ...t, status: statusOverride[t.id] } : t));
  const scoped = clientFilter ? rows.filter((t) => t.clientId === clientFilter) : rows;

  const counts = {
    pending: scoped.filter((t) => t.status !== "DONE").length,
    overdue: scoped.filter(isOverdue).length,
    done: scoped.filter((t) => t.status === "DONE").length,
    all: scoped.length,
  };
  const visible = scoped.filter((t) =>
    filter === "pending" ? t.status !== "DONE" : filter === "overdue" ? isOverdue(t) : filter === "done" ? t.status === "DONE" : true,
  );
  const openTask = rows.find((t) => t.id === openId) ?? null;

  function setStatus(id: string, status: string) {
    setStatusOverride((prev) => ({ ...prev, [id]: status }));
    startTransition(() => updateTaskStatus(id, status));
  }

  const chips: { key: Filter; label: string; color: string }[] = [
    { key: "pending", label: "Pending", color: "var(--text-primary)" },
    { key: "overdue", label: "Overdue", color: "var(--danger)" },
    { key: "done", label: "Done", color: "var(--primary)" },
    { key: "all", label: "All", color: "var(--text-secondary)" },
  ];

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2 mb-4">
        {chips.map((c) => (
          <button
            key={c.key}
            onClick={() => setFilter(c.key)}
            className="px-3 py-1.5 rounded-lg text-sm font-semibold"
            style={{
              color: c.color,
              background: filter === c.key ? "var(--surface-hover)" : "transparent",
              border: `1px solid ${filter === c.key ? "var(--border-strong)" : "var(--border)"}`,
            }}
          >
            {c.label} <b className="ml-1">{counts[c.key]}</b>
          </button>
        ))}

        {showClientColumn && clients && (
          <select value={clientFilter} onChange={(e) => setClientFilter(e.target.value)} style={inputStyle} className="px-3 py-1.5 rounded-lg outline-none text-sm">
            <option value="">All clients</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        )}

        {isCoach && (
          <button
            onClick={() => setCreating(true)}
            className="ml-auto flex items-center gap-2 px-4 py-2 rounded-lg font-bold text-sm"
            style={{ background: "var(--secondary)", color: "#14150f" }}
          >
            <span className="material-symbols-outlined text-[18px]">add</span>
            New Task
          </button>
        )}
      </div>

      <div className="card rounded-2xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr style={{ borderBottom: "1px solid var(--border)" }}>
              <th className="text-left px-4 py-3 font-medium" style={{ color: "var(--text-muted)" }}>Task</th>
              <th className="text-left px-4 py-3 font-medium" style={{ color: "var(--text-muted)" }}>Status</th>
              {showClientColumn && <th className="text-left px-4 py-3 font-medium" style={{ color: "var(--text-muted)" }}>Client</th>}
              <th className="text-left px-4 py-3 font-medium" style={{ color: "var(--text-muted)" }}>Assignee</th>
              <th className="text-left px-4 py-3 font-medium" style={{ color: "var(--text-muted)" }}>Due</th>
              <th className="text-left px-4 py-3 font-medium" style={{ color: "var(--text-muted)" }}>Latest update</th>
            </tr>
          </thead>
          <tbody>
            {visible.map((t) => {
              const s = STATUS_STYLE[t.status] ?? STATUS_STYLE.NOT_STARTED;
              const last = t.comments[t.comments.length - 1];
              // Coach wants to see where the client is waiting on a reply, and vice versa.
              const awaitingMe = last && last.authorRole !== (isCoach ? "COACH" : "CLIENT");
              return (
                <tr
                  key={t.id}
                  onClick={() => setOpenId(t.id)}
                  className="cursor-pointer transition-colors hover:bg-[var(--surface-hover)]"
                  style={{ borderBottom: "1px solid var(--border)" }}
                >
                  <td className="px-4 py-3">
                    <p className="font-semibold" style={{ color: "var(--text-primary)" }}>{t.title}</p>
                    {t.description && (
                      <p className="text-xs mt-0.5 line-clamp-1" style={{ color: "var(--text-muted)" }}>{t.description}</p>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className="flex items-center gap-1.5 text-xs font-semibold" style={{ color: s.color }}>
                      <span className="w-1.5 h-1.5 rounded-full" style={{ background: s.color }} />
                      {s.label}
                    </span>
                  </td>
                  {showClientColumn && <td className="px-4 py-3" style={{ color: "var(--text-secondary)" }}>{t.clientName ?? "—"}</td>}
                  <td className="px-4 py-3" style={{ color: "var(--text-secondary)" }}>{t.assignee ?? "—"}</td>
                  <td className="px-4 py-3 whitespace-nowrap" style={{ color: isOverdue(t) ? "var(--danger)" : "var(--text-secondary)" }}>
                    {t.dueDate ? formatDue(t.dueDate) : "—"}
                    {isOverdue(t) && <span className="ml-1.5 text-[10px] font-bold">OVERDUE</span>}
                  </td>
                  <td className="px-4 py-3">
                    {last ? (
                      <span className="flex items-center gap-1.5 text-xs" style={{ color: awaitingMe ? "var(--primary)" : "var(--text-muted)" }}>
                        <span className="material-symbols-outlined text-[16px]">chat_bubble</span>
                        <span className={awaitingMe ? "font-semibold" : ""}>
                          {last.authorName} · {timeAgo(last.createdAt)}
                        </span>
                        {t.comments.length > 1 && <span>({t.comments.length})</span>}
                      </span>
                    ) : (
                      <span className="text-xs" style={{ color: "var(--text-muted)" }}>—</span>
                    )}
                  </td>
                </tr>
              );
            })}
            {visible.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center" style={{ color: "var(--text-muted)" }}>
                  {tasks.length === 0 ? "No tasks yet." : "Nothing here."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {creating && (
        <Modal title="New Task" onClose={() => setCreating(false)}>
          <TaskForm
            clients={clientId ? undefined : clients}
            clientId={clientId}
            people={people}
            submitLabel="Create task"
            onSubmit={async (fd) => {
              await createTask(fd);
              setCreating(false);
            }}
            onCancel={() => setCreating(false)}
          />
        </Modal>
      )}

      {openTask && (
        <TaskDetail
          task={openTask}
          isCoach={isCoach}
          showClient={showClientColumn}
          people={people}
          onStatus={(status) => setStatus(openTask.id, status)}
          onClose={() => setOpenId(null)}
        />
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
      <div
        className="card rounded-2xl overflow-hidden flex flex-col"
        style={{ width: "100%", maxWidth: 620, maxHeight: "90vh" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-5 flex justify-between items-center gap-4" style={{ borderBottom: "1px solid var(--border)" }}>
          <h3 className="font-heading font-bold text-lg" style={{ color: "var(--text-primary)" }}>{title}</h3>
          <button onClick={onClose} style={{ color: "var(--text-muted)" }}>
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>
        <div className="overflow-y-auto">{children}</div>
      </div>
    </div>,
    document.body,
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <label className="text-xs font-semibold block mb-1" style={{ color: "var(--text-secondary)" }}>{label}</label>
      {children}
    </div>
  );
}

function TaskForm({
  task,
  clients,
  clientId,
  people,
  submitLabel,
  onSubmit,
  onCancel,
}: {
  task?: TaskRow;
  clients?: { id: string; name: string }[];
  clientId?: string;
  people: Person[];
  submitLabel: string;
  onSubmit: (fd: FormData) => Promise<void>;
  onCancel: () => void;
}) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedClient, setSelectedClient] = useState(clientId ?? task?.clientId ?? "");
  const names = (list: Person[]) => Array.from(new Set(list.map((p) => p.name)));
  const clientUsers = names(people.filter((p) => p.role === "CLIENT" && p.clientId === selectedClient));
  const coaches = names(people.filter((p) => p.role === "COACH"));
  // Older tasks may hold a free-text assignee that isn't a login — keep it selectable.
  const legacy = task?.assignee && !people.some((p) => p.name === task.assignee) ? task.assignee : null;

  return (
    <form
      action={async (fd) => {
        setPending(true);
        setError(null);
        try {
          await onSubmit(fd);
        } catch (e) {
          setError(e instanceof Error ? e.message : "Couldn't save the task");
        } finally {
          setPending(false);
        }
      }}
      className="p-5 space-y-4"
    >
      {clientId && <input type="hidden" name="clientId" value={clientId} />}
      <Field label="Task">
        <input name="title" required defaultValue={task?.title} placeholder="e.g. Record your first ad video" style={{ ...inputStyle, width: "100%" }} className="px-3 py-2 rounded-lg outline-none text-sm" />
      </Field>
      <Field label="What's required">
        <textarea
          name="description"
          rows={5}
          defaultValue={task?.description ?? ""}
          placeholder="What they need to do, what 'done' looks like, links…"
          style={{ ...inputStyle, width: "100%" }}
          className="px-3 py-2 rounded-lg outline-none text-sm resize-y"
        />
      </Field>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {clients && (
          <Field label="Client">
            <select
              name="clientId"
              value={selectedClient}
              onChange={(e) => setSelectedClient(e.target.value)}
              style={{ ...inputStyle, width: "100%" }}
              className="px-3 py-2 rounded-lg outline-none text-sm"
            >
              <option value="">No client (internal)</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </Field>
        )}
        <Field label="Due date">
          <input name="dueDate" type="date" defaultValue={task?.dueDate ?? ""} style={{ ...inputStyle, width: "100%" }} className="px-3 py-2 rounded-lg outline-none text-sm" />
        </Field>
        <Field label="Assignee">
          <select name="assignee" defaultValue={task?.assignee ?? ""} style={{ ...inputStyle, width: "100%" }} className="px-3 py-2 rounded-lg outline-none text-sm">
            <option value="">Unassigned</option>
            {clientUsers.length > 0 && (
              <optgroup label="Client">
                {clientUsers.map((n) => (
                  <option key={n} value={n}>{n}</option>
                ))}
              </optgroup>
            )}
            {coaches.length > 0 && (
              <optgroup label="Coach">
                {coaches.map((n) => (
                  <option key={n} value={n}>{n}</option>
                ))}
              </optgroup>
            )}
            {legacy && <option value={legacy}>{legacy}</option>}
          </select>
          {selectedClient && clientUsers.length === 0 && (
            <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>This client has no login yet — add one in Settings → Users.</p>
          )}
        </Field>
      </div>
      {error && <p className="text-sm" style={{ color: "var(--danger)" }}>{error}</p>}
      <div className="flex justify-end gap-2 pt-2">
        <button type="button" onClick={onCancel} className="px-4 py-2 rounded-lg text-sm font-semibold" style={{ border: "1px solid var(--border-strong)", color: "var(--text-secondary)" }}>
          Cancel
        </button>
        <button type="submit" disabled={pending} className="px-4 py-2 rounded-lg text-sm font-bold disabled:opacity-60" style={{ background: "var(--secondary)", color: "#14150f" }}>
          {pending ? "Saving…" : submitLabel}
        </button>
      </div>
    </form>
  );
}

function TaskDetail({
  task,
  isCoach,
  showClient,
  people,
  onStatus,
  onClose,
}: {
  task: TaskRow;
  isCoach: boolean;
  showClient: boolean;
  people: Person[];
  onStatus: (status: string) => void;
  onClose: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [sending, setSending] = useState(false);
  const commentForm = useRef<HTMLFormElement>(null);
  const threadEnd = useRef<HTMLDivElement>(null);

  useEffect(() => {
    threadEnd.current?.scrollIntoView({ block: "nearest" });
  }, [task.comments.length]);

  if (editing) {
    return (
      <Modal title="Edit task" onClose={onClose}>
        <TaskForm
          task={task}
          people={people}
          submitLabel="Save"
          onSubmit={async (fd) => {
            await updateTask(task.id, fd);
            setEditing(false);
          }}
          onCancel={() => setEditing(false)}
        />
      </Modal>
    );
  }

  return (
    <Modal title={task.title} onClose={onClose}>
      <div className="p-5 space-y-5">
        <div className="flex flex-wrap items-center gap-3 text-sm">
          <select
            value={task.status}
            onChange={(e) => onStatus(e.target.value)}
            style={{ ...inputStyle, color: STATUS_STYLE[task.status]?.color }}
            className="px-3 py-1.5 rounded-lg outline-none text-sm font-semibold"
          >
            {STATUSES.map((s) => (
              <option key={s} value={s}>{STATUS_STYLE[s].label}</option>
            ))}
          </select>
          {task.dueDate && (
            <span style={{ color: isOverdue(task) ? "var(--danger)" : "var(--text-secondary)" }}>
              Due {formatDue(task.dueDate)}
              {isOverdue(task) && " · overdue"}
            </span>
          )}
          {showClient && task.clientName && <span style={{ color: "var(--text-secondary)" }}>· {task.clientName}</span>}
          {task.assignee && <span style={{ color: "var(--text-secondary)" }}>· {task.assignee}</span>}

          {isCoach && (
            <div className="ml-auto flex gap-2">
              <button onClick={() => setEditing(true)} className="text-xs font-semibold px-3 py-1.5 rounded-lg" style={{ color: "var(--text-primary)", border: "1px solid var(--border-strong)" }}>
                Edit
              </button>
              <button
                onClick={async () => {
                  if (!confirm("Delete this task and its comments?")) return;
                  await deleteTask(task.id);
                  onClose();
                }}
                className="text-xs font-semibold px-3 py-1.5 rounded-lg"
                style={{ color: "var(--danger)", border: "1px solid var(--border-strong)" }}
              >
                Delete
              </button>
            </div>
          )}
        </div>

        <div>
          <p className="text-xs font-bold tracking-widest mb-2" style={{ color: "var(--text-muted)" }}>WHAT&apos;S REQUIRED</p>
          <p className="text-sm whitespace-pre-wrap" style={{ color: task.description ? "var(--text-primary)" : "var(--text-muted)" }}>
            {task.description || "No details added."}
          </p>
        </div>

        <div>
          <p className="text-xs font-bold tracking-widest mb-3" style={{ color: "var(--text-muted)" }}>
            UPDATES {task.comments.length > 0 && `(${task.comments.length})`}
          </p>
          <div className="space-y-3">
            {task.comments.map((c) => (
              <div key={c.id} className="flex gap-3">
                <div
                  className="w-8 h-8 shrink-0 rounded-full flex items-center justify-center text-xs font-bold"
                  style={
                    c.authorRole === "COACH"
                      ? { background: "var(--primary-tint)", color: "var(--primary)" }
                      : { background: "var(--surface-hover)", color: "var(--text-secondary)" }
                  }
                >
                  {c.authorName.slice(0, 1).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                    <b style={{ color: "var(--text-primary)" }}>{c.authorName}</b>
                    {c.authorRole === "COACH" && " · Coach"} · {timeAgo(c.createdAt)}
                  </p>
                  <p className="text-sm whitespace-pre-wrap mt-0.5" style={{ color: "var(--text-primary)" }}>{c.body}</p>
                </div>
              </div>
            ))}
            {task.comments.length === 0 && (
              <p className="text-sm" style={{ color: "var(--text-muted)" }}>No updates yet.</p>
            )}
            <div ref={threadEnd} />
          </div>

          <form
            ref={commentForm}
            action={async (fd) => {
              setSending(true);
              try {
                await addTaskComment(task.id, fd);
                commentForm.current?.reset();
              } finally {
                setSending(false);
              }
            }}
            className="mt-4 flex gap-2 items-end"
          >
            <textarea
              name="body"
              required
              rows={2}
              placeholder={isCoach ? "Add a comment…" : "Post an update or ask a question…"}
              style={{ ...inputStyle, width: "100%" }}
              className="px-3 py-2 rounded-lg outline-none text-sm resize-y"
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) commentForm.current?.requestSubmit();
              }}
            />
            <button type="submit" disabled={sending} className="px-4 py-2 rounded-lg text-sm font-bold disabled:opacity-60" style={{ background: "var(--secondary)", color: "#14150f" }}>
              {sending ? "…" : "Post"}
            </button>
          </form>
        </div>
      </div>
    </Modal>
  );
}
