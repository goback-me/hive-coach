"use client";

import { RANGE_PRESETS, resolveRange, type DateRange } from "@/lib/lead-stages";

const formatDay = (day: string) => {
  const [y, m, d] = day.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" });
};

/** Prominent period picker: presets plus a custom from/to, with the resolved dates spelled out. */
export default function DateRangeBar({ value, onChange, count, noun = "lead" }: { value: DateRange; onChange: (r: DateRange) => void; count: number; noun?: string }) {
  const { from, to } = resolveRange(value);
  const showing = !from && !to ? "All time" : `${from ? formatDay(from) : "Start"} – ${to ? formatDay(to) : "today"}`;
  const inputStyle = { background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text-primary)" };

  return (
    <div className="card rounded-2xl p-4 space-y-3">
      <div className="flex flex-wrap items-center gap-3">
        <span className="icon-chip w-9 h-9" style={{ background: "var(--primary-tint)" }}>
          <span className="material-symbols-outlined text-[18px]" style={{ color: "var(--primary)" }}>date_range</span>
        </span>
        <div className="mr-2">
          <p className="text-[11px] font-bold tracking-widest" style={{ color: "var(--text-muted)" }}>DATE RANGE</p>
          <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
            {showing}
            <span className="font-normal" style={{ color: "var(--text-muted)" }}>
              {" "}
              · {count} {noun}
              {count === 1 ? "" : "s"}
            </span>
          </p>
        </div>

        <div className="flex flex-wrap gap-1 p-1 rounded-xl ml-auto" style={{ background: "var(--surface-hover)" }}>
          {RANGE_PRESETS.map((p) => {
            const active = value.preset === p.key;
            return (
              <button
                key={p.key}
                onClick={() => onChange(p.key === "custom" ? { preset: "custom", from: value.from ?? from ?? undefined, to: value.to ?? to ?? undefined } : { preset: p.key })}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors"
                style={active ? { background: "var(--surface-card)", color: "var(--primary)", boxShadow: "0 1px 3px rgba(0,0,0,0.12)" } : { color: "var(--text-secondary)" }}
              >
                {p.key === "custom" && <span className="material-symbols-outlined text-[14px]">edit_calendar</span>}
                {p.label}
              </button>
            );
          })}
        </div>
      </div>

      {value.preset === "custom" && (
        <div className="flex flex-wrap items-end gap-3 pt-3" style={{ borderTop: "1px solid var(--border)" }}>
          <label className="text-xs font-semibold" style={{ color: "var(--text-secondary)" }}>
            From
            <input
              type="date"
              value={value.from ?? ""}
              max={value.to || undefined}
              onChange={(e) => onChange({ ...value, from: e.target.value || undefined })}
              className="block mt-1 px-3 py-2 rounded-lg outline-none text-sm"
              style={inputStyle}
            />
          </label>
          <label className="text-xs font-semibold" style={{ color: "var(--text-secondary)" }}>
            To
            <input
              type="date"
              value={value.to ?? ""}
              min={value.from || undefined}
              onChange={(e) => onChange({ ...value, to: e.target.value || undefined })}
              className="block mt-1 px-3 py-2 rounded-lg outline-none text-sm"
              style={inputStyle}
            />
          </label>
          <p className="text-xs pb-2" style={{ color: "var(--text-muted)" }}>Leave either side empty for an open range. Dates are when the lead came in.</p>
        </div>
      )}
    </div>
  );
}
