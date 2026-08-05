"use client";

import { useState, useTransition } from "react";

type StepTemplate = { id: string; title: string; description: string | null; icon: string };
type Progress = { templateId: string; completedAt: string | null };

export default function OnboardingChecklist({
  clientId,
  templates,
  progress,
  onToggle,
}: {
  clientId: string;
  templates: StepTemplate[];
  progress: Progress[];
  onToggle: (clientId: string, templateId: string, completed: boolean) => Promise<void>;
}) {
  const [completedMap, setCompletedMap] = useState<Record<string, boolean>>(
    Object.fromEntries(progress.map((p) => [p.templateId, !!p.completedAt]))
  );
  const [, startTransition] = useTransition();

  const completedCount = templates.filter((t) => completedMap[t.id]).length;
  const pct = templates.length > 0 ? Math.round((completedCount / templates.length) * 100) : 0;

  function toggle(templateId: string) {
    const next = !completedMap[templateId];
    setCompletedMap((prev) => ({ ...prev, [templateId]: next }));
    startTransition(() => {
      onToggle(clientId, templateId, next);
    });
  }

  return (
    <div>
      <div className="card rounded-2xl p-5 mb-4">
        <div className="flex justify-between text-sm mb-2">
          <span style={{ color: "var(--text-primary)" }} className="font-semibold">Onboarding progress</span>
          <span style={{ color: "var(--text-secondary)" }}>{completedCount}/{templates.length} complete</span>
        </div>
        <div className="h-2 rounded-full overflow-hidden" style={{ background: "var(--surface-hover)" }}>
          <div className="h-full rounded-full" style={{ width: `${pct}%`, background: "var(--primary)" }} />
        </div>
      </div>

      <div className="space-y-2">
        {templates.map((t) => {
          const done = completedMap[t.id];
          return (
            <div
              key={t.id}
              onClick={() => toggle(t.id)}
              className="card rounded-xl p-4 flex items-center gap-3 cursor-pointer"
              style={{ opacity: done ? 0.6 : 1 }}
            >
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                style={{ background: done ? "var(--primary-tint)" : "var(--surface-hover)", color: done ? "var(--primary)" : "var(--text-muted)" }}
              >
                <span className="material-symbols-outlined text-[18px]">{done ? "check" : t.icon}</span>
              </div>
              <div>
                <p className="font-medium text-sm" style={{ color: "var(--text-primary)", textDecoration: done ? "line-through" : "none" }}>
                  {t.title}
                </p>
                {t.description && <p className="text-xs" style={{ color: "var(--text-secondary)" }}>{t.description}</p>}
              </div>
            </div>
          );
        })}
        {templates.length === 0 && (
          <p style={{ color: "var(--text-secondary)" }}>
            No onboarding steps set up yet — add a template in Settings.
          </p>
        )}
      </div>
    </div>
  );
}
