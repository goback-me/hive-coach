"use client";

import { useCallback, useEffect, useState, useTransition, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { createLesson, createModule, deleteLesson, deleteModule, toggleLessonComplete, updateLesson, updateModule } from "@/lib/actions";
import { LessonVideo, RichContent, RichTextEditor } from "./RichText";

type Lesson = { id: string; title: string; videoUrl: string | null; content: string | null };
type ModuleWithLessons = { id: string; title: string; lessons: Lesson[] };

const inputStyle = { width: "100%", background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text-primary)" } as const;

export default function PlaybooksPanel({
  clientId,
  modules,
  completedLessonIds,
  isCoach,
}: {
  clientId: string;
  modules: ModuleWithLessons[];
  completedLessonIds: string[];
  isCoach: boolean;
}) {
  const [completed, setCompleted] = useState<Set<string>>(new Set(completedLessonIds));
  const [openId, setOpenId] = useState<string | null>(null);
  const [form, setForm] = useState<{ kind: "module" } | { kind: "lesson"; lesson?: Lesson & { moduleId: string }; moduleId?: string } | null>(null);
  const [, startTransition] = useTransition();

  // Flat reading order for previous / next.
  const ordered = modules.flatMap((m) => m.lessons.map((l) => ({ ...l, moduleId: m.id, moduleTitle: m.title })));
  const total = ordered.length;
  const doneCount = ordered.filter((l) => completed.has(l.id)).length;
  const openIndex = ordered.findIndex((l) => l.id === openId);
  const open = openIndex === -1 ? null : ordered[openIndex];

  function toggle(lessonId: string, value?: boolean) {
    const next = new Set(completed);
    const willComplete = value ?? !next.has(lessonId);
    if (willComplete) next.add(lessonId);
    else next.delete(lessonId);
    setCompleted(next);
    startTransition(() => toggleLessonComplete(clientId, lessonId, willComplete));
  }

  return (
    <div className="space-y-4">
      {/* Progress header */}
      <div className="rounded-2xl p-6" style={{ background: "linear-gradient(135deg, var(--primary-tint) 0%, var(--surface-card) 70%)", border: "1px solid var(--border)" }}>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="max-w-xl">
            <h3 className="font-heading text-2xl font-bold" style={{ color: "var(--text-primary)" }}>Our exact growth playbooks</h3>
            <p className="text-sm mt-1" style={{ color: "var(--text-secondary)" }}>Videos and core material for the program — watch, read and tick each lesson off as you go.</p>
          </div>
          {isCoach && (
            <div className="flex gap-2">
              <button onClick={() => setForm({ kind: "module" })} className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-semibold" style={{ border: "1px solid var(--border-strong)", color: "var(--text-primary)" }}>
                <span className="material-symbols-outlined text-[18px]">create_new_folder</span>
                Add module
              </button>
              <button
                onClick={() => setForm({ kind: "lesson" })}
                disabled={!modules.length}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-bold disabled:opacity-50"
                style={{ background: "var(--secondary)", color: "#14150f" }}
              >
                <span className="material-symbols-outlined text-[18px]">add</span>
                Add lesson
              </button>
            </div>
          )}
        </div>
        <div className="mt-5 flex items-center gap-4">
          <div className="flex-1 h-2.5 rounded-full overflow-hidden" style={{ background: "var(--surface-hover)" }}>
            <div className="h-full rounded-full transition-all duration-500" style={{ width: `${total ? (doneCount / total) * 100 : 0}%`, background: "var(--primary)" }} />
          </div>
          <p className="text-sm font-semibold shrink-0" style={{ color: "var(--text-primary)" }}>
            {doneCount} of {total} lessons
            <span className="font-normal" style={{ color: "var(--text-muted)" }}> · {total ? Math.round((doneCount / total) * 100) : 0}%</span>
          </p>
        </div>
      </div>

      {modules.map((mod, i) => {
        const modDone = mod.lessons.filter((l) => completed.has(l.id)).length;
        const allDone = mod.lessons.length > 0 && modDone === mod.lessons.length;
        return (
          <section key={mod.id} className="card rounded-2xl overflow-hidden">
            <div className="px-5 py-4 flex items-center gap-3" style={{ borderBottom: "1px solid var(--border)" }}>
              <span
                className="w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold shrink-0"
                style={allDone ? { background: "var(--primary)", color: "#0d0d0b" } : { background: "var(--primary-tint)", color: "var(--primary)" }}
              >
                {allDone ? <span className="material-symbols-outlined text-[18px]">check</span> : i + 1}
              </span>
              <div className="flex-1 min-w-0">
                <p className="font-heading font-bold truncate" style={{ color: "var(--text-primary)" }}>{mod.title}</p>
                <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                  {modDone}/{mod.lessons.length} lesson{mod.lessons.length === 1 ? "" : "s"} done
                </p>
              </div>
              {isCoach && (
                <div className="flex gap-1">
                  <IconButton icon="add" title="Add a lesson to this module" onClick={() => setForm({ kind: "lesson", moduleId: mod.id })} />
                  <IconButton
                    icon="edit"
                    title="Rename module"
                    onClick={async () => {
                      const title = prompt("Module name", mod.title);
                      if (title && title.trim() !== mod.title) await updateModule(mod.id, title);
                    }}
                  />
                  <IconButton
                    icon="delete"
                    title="Delete module"
                    danger
                    onClick={async () => {
                      if (confirm(`Delete "${mod.title}" and its ${mod.lessons.length} lesson(s)? Every client's progress on them is removed too.`)) await deleteModule(mod.id);
                    }}
                  />
                </div>
              )}
            </div>
            <div>
              {mod.lessons.map((lesson) => {
                const done = completed.has(lesson.id);
                return (
                  <div
                    key={lesson.id}
                    onClick={() => setOpenId(lesson.id)}
                    className="group flex items-center gap-3 px-5 py-3 cursor-pointer transition-colors hover:bg-[var(--surface-hover)]"
                    style={{ borderBottom: "1px solid var(--border)" }}
                  >
                    <span className="icon-chip w-9 h-9" style={{ background: "var(--surface-hover)" }}>
                      <span className="material-symbols-outlined text-[18px]" style={{ color: lesson.videoUrl ? "var(--primary)" : "var(--text-secondary)" }}>
                        {lesson.videoUrl ? "play_circle" : "article"}
                      </span>
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold truncate" style={{ color: done ? "var(--text-muted)" : "var(--text-primary)" }}>{lesson.title}</p>
                      <p className="text-xs" style={{ color: "var(--text-muted)" }}>{[lesson.videoUrl && "Video", lesson.content && "Notes"].filter(Boolean).join(" · ") || "Empty"}</p>
                    </div>
                    {isCoach && (
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => e.stopPropagation()}>
                        <IconButton icon="edit" title="Edit lesson" onClick={() => setForm({ kind: "lesson", lesson: { ...lesson, moduleId: mod.id } })} />
                        <IconButton
                          icon="delete"
                          title="Delete lesson"
                          danger
                          onClick={async () => {
                            if (confirm(`Delete "${lesson.title}"?`)) await deleteLesson(lesson.id);
                          }}
                        />
                      </div>
                    )}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggle(lesson.id);
                      }}
                      title={done ? "Mark as not done" : "Mark as done"}
                      className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 transition-colors"
                      style={{ background: done ? "var(--primary)" : "var(--surface-hover)", color: done ? "#0d0d0b" : "var(--text-muted)", border: done ? "none" : "1px solid var(--border)" }}
                    >
                      <span className="material-symbols-outlined text-[16px]">check</span>
                    </button>
                  </div>
                );
              })}
              {mod.lessons.length === 0 && <p className="px-5 py-4 text-sm" style={{ color: "var(--text-muted)" }}>No lessons in this module yet.</p>}
            </div>
          </section>
        );
      })}
      {modules.length === 0 && (
        <p className="card rounded-2xl p-8 text-center text-sm" style={{ color: "var(--text-muted)" }}>
          No playbook modules yet{isCoach ? ' — click "Add module" above' : ""}.
        </p>
      )}

      {open && (
        <LessonViewer
          lesson={open}
          position={`${openIndex + 1} of ${total}`}
          done={completed.has(open.id)}
          onToggle={(v) => toggle(open.id, v)}
          onPrev={openIndex > 0 ? () => setOpenId(ordered[openIndex - 1].id) : undefined}
          onNext={openIndex < total - 1 ? () => setOpenId(ordered[openIndex + 1].id) : undefined}
          onClose={() => setOpenId(null)}
        />
      )}

      {form?.kind === "module" && (
        <Modal title="Add module" onClose={() => setForm(null)} width={440}>
          <form
            action={async (fd) => {
              await createModule(fd);
              setForm(null);
            }}
            className="p-5 space-y-4"
          >
            <input name="title" required autoFocus placeholder="e.g. Getting your first 10 clients" style={inputStyle} className="px-3 py-2 rounded-lg outline-none text-sm" />
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setForm(null)} className="px-4 py-2 rounded-lg text-sm font-semibold" style={{ border: "1px solid var(--border-strong)", color: "var(--text-secondary)" }}>
                Cancel
              </button>
              <button type="submit" className="px-4 py-2 rounded-lg text-sm font-bold" style={{ background: "var(--secondary)", color: "#14150f" }}>
                Add module
              </button>
            </div>
          </form>
        </Modal>
      )}
      {form?.kind === "lesson" && (
        <Modal title={form.lesson ? "Edit lesson" : "Add lesson"} onClose={() => setForm(null)} width={820}>
          <LessonForm modules={modules} lesson={form.lesson} moduleId={form.moduleId} onDone={() => setForm(null)} />
        </Modal>
      )}
    </div>
  );
}

function LessonViewer({
  lesson,
  position,
  done,
  onToggle,
  onPrev,
  onNext,
  onClose,
}: {
  lesson: Lesson & { moduleTitle: string };
  position: string;
  done: boolean;
  onToggle: (done: boolean) => void;
  onPrev?: () => void;
  onNext?: () => void;
  onClose: () => void;
}) {
  // Keyboard: Esc closes, ← / → move between lessons.
  const onKey = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft") onPrev?.();
      if (e.key === "ArrowRight") onNext?.();
    },
    [onClose, onPrev, onNext],
  );
  useEffect(() => {
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onKey]);

  return (
    <Modal
      title={lesson.title}
      eyebrow={`${lesson.moduleTitle} · ${position}`}
      onClose={onClose}
      width={900}
      footer={
        <div className="flex items-center gap-2 w-full">
          <button onClick={onPrev} disabled={!onPrev} className="flex items-center gap-1 px-3 py-2 rounded-lg text-sm font-semibold disabled:opacity-30" style={{ color: "var(--text-secondary)" }}>
            <span className="material-symbols-outlined text-[18px]">chevron_left</span>
            Previous
          </button>
          <button
            onClick={() => {
              onToggle(!done);
              if (!done && onNext) onNext(); // finishing a lesson moves straight on to the next one
            }}
            className="mx-auto flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-bold"
            style={done ? { background: "var(--primary-tint)", color: "var(--primary)" } : { background: "var(--secondary)", color: "#14150f" }}
          >
            <span className="material-symbols-outlined text-[18px]">{done ? "check_circle" : "radio_button_unchecked"}</span>
            {done ? "Completed" : onNext ? "Mark complete & next" : "Mark complete"}
          </button>
          <button onClick={onNext} disabled={!onNext} className="flex items-center gap-1 px-3 py-2 rounded-lg text-sm font-semibold disabled:opacity-30" style={{ color: "var(--text-secondary)" }}>
            Next
            <span className="material-symbols-outlined text-[18px]">chevron_right</span>
          </button>
        </div>
      }
    >
      {/* key: a fresh player per lesson, so switching lessons never keeps the old video playing */}
      {lesson.videoUrl && <LessonVideo key={lesson.id} url={lesson.videoUrl} title={lesson.title} />}
      {lesson.content ? (
        <div className="px-8 py-7">
          <RichContent html={lesson.content} />
        </div>
      ) : (
        !lesson.videoUrl && <p className="px-8 py-10 text-center text-sm" style={{ color: "var(--text-muted)" }}>Nothing in this lesson yet.</p>
      )}
    </Modal>
  );
}

/** Add or edit a lesson — also used by Settings → Playbooks library. */
export function LessonForm({
  modules,
  lesson,
  moduleId,
  onDone,
}: {
  modules: { id: string; title: string }[];
  lesson?: Lesson & { moduleId: string };
  moduleId?: string;
  onDone?: () => void;
}) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  return (
    <form
      action={async (fd) => {
        setPending(true);
        setError(null);
        setSaved(false);
        const r = lesson ? await updateLesson(lesson.id, fd) : await createLesson(fd);
        setPending(false);
        if (r.error) return setError(r.error);
        if (onDone) onDone();
        else setSaved(true);
      }}
      className="p-5 space-y-3"
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <label className="text-xs font-semibold block mb-1" style={{ color: "var(--text-secondary)" }}>Module</label>
          <select name="moduleId" required defaultValue={lesson?.moduleId ?? moduleId ?? ""} style={inputStyle} className="px-3 py-2 rounded-lg outline-none text-sm">
            <option value="">Choose a module…</option>
            {modules.map((m) => (
              <option key={m.id} value={m.id}>{m.title}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-xs font-semibold block mb-1" style={{ color: "var(--text-secondary)" }}>Lesson title</label>
          <input name="title" required defaultValue={lesson?.title} placeholder="e.g. Writing ads that convert" style={inputStyle} className="px-3 py-2 rounded-lg outline-none text-sm" />
        </div>
      </div>
      <div>
        <label className="text-xs font-semibold block mb-1" style={{ color: "var(--text-secondary)" }}>Main video — YouTube, Loom or Vimeo link (optional)</label>
        <input name="videoUrl" defaultValue={lesson?.videoUrl ?? ""} placeholder="https://www.youtube.com/watch?v=…" style={inputStyle} className="px-3 py-2 rounded-lg outline-none text-sm" />
      </div>
      <div>
        <label className="text-xs font-semibold block mb-1" style={{ color: "var(--text-secondary)" }}>Notes — headings, lists, links, images and more videos</label>
        <RichTextEditor name="content" defaultValue={lesson?.content} placeholder="Write the lesson notes…" />
      </div>
      {error && <p className="text-sm" style={{ color: "var(--danger)" }}>{error}</p>}
      {saved && <p className="text-sm" style={{ color: "var(--primary)" }}>Lesson added.</p>}
      <div className="flex justify-end gap-2 pt-1">
        {onDone && (
          <button type="button" onClick={onDone} className="px-4 py-2 rounded-lg text-sm font-semibold" style={{ border: "1px solid var(--border-strong)", color: "var(--text-secondary)" }}>
            Cancel
          </button>
        )}
        <button type="submit" disabled={pending} className="px-4 py-2 rounded-lg text-sm font-bold disabled:opacity-60" style={{ background: "var(--secondary)", color: "#14150f" }}>
          {pending ? "Saving…" : lesson ? "Save lesson" : "Add lesson"}
        </button>
      </div>
    </form>
  );
}

function IconButton({ icon, title, onClick, danger }: { icon: string; title: string; onClick: () => void; danger?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      aria-label={title}
      className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-[var(--surface-hover)]"
      style={{ color: danger ? "var(--danger)" : "var(--text-secondary)" }}
    >
      <span className="material-symbols-outlined text-[18px]">{icon}</span>
    </button>
  );
}

function Modal({ title, eyebrow, onClose, width, footer, children }: { title: string; eyebrow?: string; onClose: () => void; width: number; footer?: ReactNode; children: ReactNode }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return null;
  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.65)" }} onClick={onClose}>
      <div className="card rounded-2xl overflow-hidden flex flex-col" style={{ width: "100%", maxWidth: width, maxHeight: "92vh" }} onClick={(e) => e.stopPropagation()}>
        <div className="px-6 py-4 flex justify-between items-center gap-4 shrink-0" style={{ borderBottom: "1px solid var(--border)" }}>
          <div className="min-w-0">
            {eyebrow && <p className="text-[11px] font-bold tracking-widest uppercase truncate" style={{ color: "var(--text-muted)" }}>{eyebrow}</p>}
            <h3 className="font-heading font-bold text-xl truncate" style={{ color: "var(--text-primary)" }}>{title}</h3>
          </div>
          <button onClick={onClose} style={{ color: "var(--text-muted)" }} aria-label="Close">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>
        <div className="overflow-y-auto">{children}</div>
        {footer && (
          <div className="px-4 py-3 shrink-0 flex" style={{ borderTop: "1px solid var(--border)" }}>
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}
