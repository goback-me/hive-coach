"use client";

import { useEffect, useRef, useState } from "react";
import { DATE_RANGE_PRESETS, DATE_RANGE_LABELS, type DateRangePreset } from "@/lib/date-range";

export default function DateRangeDropdown({
  value,
  onChange,
}: {
  value: DateRangePreset;
  onChange: (v: DateRangePreset) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-semibold"
        style={{ border: "1px solid var(--border)", color: "var(--text-primary)", background: "var(--surface)" }}
      >
        {DATE_RANGE_LABELS[value]}
        <span className="material-symbols-outlined text-[16px]" style={{ color: "var(--text-muted)" }}>
          {open ? "expand_less" : "expand_more"}
        </span>
      </button>
      {open && (
        <div
          className="absolute right-0 z-20 mt-1 rounded-lg overflow-hidden py-1 min-w-[190px]"
          style={{ background: "var(--surface-card)", border: "1px solid var(--border)", boxShadow: "0 20px 40px -16px rgba(0,0,0,0.25)" }}
        >
          {DATE_RANGE_PRESETS.map((p) => {
            const active = p === value;
            return (
              <button
                key={p}
                onClick={() => {
                  onChange(p);
                  setOpen(false);
                }}
                className="w-full text-left px-3 py-2 text-sm"
                style={{
                  color: active ? "var(--primary)" : "var(--text-primary)",
                  background: active ? "var(--primary-tint)" : "transparent",
                  fontWeight: active ? 700 : 500,
                }}
              >
                {DATE_RANGE_LABELS[p]}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
