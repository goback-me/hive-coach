"use client";

import { useEffect, useState, type ReactNode } from "react";

// `hidden` = hidden from the client's portal; only the coach ever gets those tabs, marked so they know.
export default function ClientTabsShell({
  tabs,
  initialTab,
}: {
  tabs: { key: string; label: string; content: ReactNode; hidden?: boolean }[];
  initialTab?: string; // ?tab= — e.g. back on Leads after connecting Google
}) {
  const [active, setActive] = useState(tabs.some((t) => t.key === initialTab) ? initialTab : tabs[0]?.key);
  // In-page links like ?tab=leads change the URL without remounting — follow them.
  useEffect(() => {
    if (initialTab && tabs.some((t) => t.key === initialTab)) setActive(initialTab);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialTab]);

  return (
    <div>
      <div className="flex gap-x-6 mb-6 overflow-x-auto md:flex-wrap -mx-4 px-4 md:mx-0 md:px-0" style={{ borderBottom: "1px solid var(--border)", scrollbarWidth: "none" }}>
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setActive(t.key)}
            title={t.hidden ? "Hidden from the client" : undefined}
            className="pb-3 text-sm font-semibold flex items-center gap-1 whitespace-nowrap shrink-0"
            style={{
              color: active === t.key ? "var(--primary)" : "var(--text-secondary)",
              borderBottom: active === t.key ? "2px solid var(--primary)" : "2px solid transparent",
              opacity: t.hidden ? 0.55 : 1,
            }}
          >
            {t.label}
            {t.hidden && <span className="material-symbols-outlined text-[14px]">visibility_off</span>}
          </button>
        ))}
      </div>
      <div>{tabs.find((t) => t.key === active)?.content}</div>
    </div>
  );
}
