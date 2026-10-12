"use client";

import { useState, type ReactNode } from "react";
import { useFormStatus } from "react-dom";
import { deleteLesson, deleteModule, deleteOnboardingStepTemplate, updateModule, updateOnboardingStepTemplate } from "@/lib/actions";
import { LessonForm } from "./PlaybooksPanel";

// Settings (adapted from Hive OS): click a row to open it for editing, then Save or Delete in place.
const inputStyle = { width: "100%", background: "var(--surface-card)", border: "1px solid var(--border)", color: "var(--text-primary)" } as const;
const inputClass = "px-3 py-2 rounded-lg outline-none text-sm";

function Row({ summary, children }: { summary: ReactNode; children: (close: () => void) => ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-lg" style={{ background: "var(--surface)", border: `1px solid ${open ? "var(--border-strong)" : "transparent"}` }}>
      <button type="button" onClick={() => setOpen(!open)} className="w-full flex items-center gap-3 p-3 text-left">
        <div className="flex-1 min-w-0">{summary}</div>
        <span className="material-symbols-outlined text-[18px]" style={{ color: "var(--text-muted)" }}>{open ? "expand_less" : "edit"}</span>
      </button>
      {open && <div className="px-3 pb-3">{children(() => setOpen(false))}</div>}
    </div>
  );
}

function SaveDelete({ onDelete, what }: { onDelete: () => Promise<void>; what: string }) {
  const { pending } = useFormStatus();
  return (
    <div className="flex justify-end gap-2">
      <button
        type="button"
        disabled={pending}
        onClick={async () => {
          if (confirm(`Delete this ${what}? Every client's progress on it goes too.`)) await onDelete();
        }}
        className="px-3 py-1.5 rounded-lg text-xs font-bold disabled:opacity-50"
        style={{ border: "1px solid var(--border-strong)", color: "var(--danger)" }}
      >
        Delete
      </button>
      <button type="submit" disabled={pending} className="px-3 py-1.5 rounded-lg text-xs font-bold disabled:opacity-50" style={{ background: "var(--secondary)", color: "#14150f" }}>
        {pending ? "Saving…" : "Save"}
      </button>
    </div>
  );
}

export function StepEditor({ index, step }: { index: number; step: { id: string; title: string; description: string | null } }) {
  return (
    <Row
      summary={
        <div className="flex items-center gap-3">
          <span className="text-xs font-bold w-5" style={{ color: "var(--text-muted)" }}>{index + 1}</span>
          <div className="min-w-0">
            <p className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>{step.title}</p>
            {step.description && <p className="text-xs truncate" style={{ color: "var(--text-secondary)" }}>{step.description}</p>}
          </div>
        </div>
      }
    >
      {(close) => (
        <form
          action={async (fd) => {
            await updateOnboardingStepTemplate(fd);
            close();
          }}
          className="space-y-2"
        >
          <input type="hidden" name="id" value={step.id} />
          <input name="title" required defaultValue={step.title} placeholder="Step title" style={inputStyle} className={inputClass} />
          <textarea name="description" defaultValue={step.description ?? ""} placeholder="Description (optional)" rows={2} style={inputStyle} className={`${inputClass} resize-y`} />
          <SaveDelete
            what="step"
            onDelete={async () => {
              const fd = new FormData();
              fd.set("id", step.id);
              await deleteOnboardingStepTemplate(fd);
            }}
          />
        </form>
      )}
    </Row>
  );
}

type Lesson = { id: string; title: string; videoUrl: string | null; content: string | null };

export function ModuleEditor({ index, mod, modules }: { index: number; mod: { id: string; title: string; lessons: Lesson[] }; modules: { id: string; title: string }[] }) {
  return (
    <div className="rounded-xl p-2 space-y-1" style={{ border: "1px solid var(--border)" }}>
      <Row
        summary={
          <>
            <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
              {index + 1}. {mod.title}
            </p>
            <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
              {mod.lessons.length} lesson{mod.lessons.length !== 1 ? "s" : ""}
            </p>
          </>
        }
      >
        {(close) => (
          <form
            action={async (fd) => {
              await updateModule(mod.id, String(fd.get("title") || ""));
              close();
            }}
            className="space-y-2"
          >
            <input name="title" required defaultValue={mod.title} placeholder="Module title" style={inputStyle} className={inputClass} />
            <SaveDelete what="module and all its lessons" onDelete={() => deleteModule(mod.id)} />
          </form>
        )}
      </Row>
      {mod.lessons.map((l) => (
        <div key={l.id} className="ml-4 sm:ml-6">
          <Row
            summary={
              <p className="text-sm flex items-center gap-2" style={{ color: "var(--text-primary)" }}>
                <span className="material-symbols-outlined text-[16px]" style={{ color: l.videoUrl ? "var(--primary)" : "var(--text-muted)" }}>{l.videoUrl ? "play_circle" : "article"}</span>
                {l.title}
              </p>
            }
          >
            {(close) => (
              <div className="-mx-5 -mb-5">
                <LessonForm modules={modules} lesson={{ ...l, moduleId: mod.id }} onDone={close} />
                <div className="flex justify-start px-5 pb-4 -mt-2">
                  <button
                    type="button"
                    onClick={async () => {
                      if (confirm(`Delete "${l.title}"? Every client's progress on it goes too.`)) await deleteLesson(l.id);
                    }}
                    className="px-3 py-1.5 rounded-lg text-xs font-bold"
                    style={{ border: "1px solid var(--border-strong)", color: "var(--danger)" }}
                  >
                    Delete lesson
                  </button>
                </div>
              </div>
            )}
          </Row>
        </div>
      ))}
    </div>
  );
}
