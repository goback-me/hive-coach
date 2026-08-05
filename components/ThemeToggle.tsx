"use client";

import { useEffect, useState } from "react";

export default function ThemeToggle() {
  const [isDark, setIsDark] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem("theme");
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const dark = stored === "dark" || (stored === null && prefersDark);
    document.documentElement.classList.toggle("dark", dark);
    setIsDark(dark);
    setMounted(true);
  }, []);

  function toggle() {
    const next = !isDark;
    setIsDark(next);
    document.documentElement.classList.toggle("dark", next);
    localStorage.setItem("theme", next ? "dark" : "light");
  }

  if (!mounted) return <div className="w-14 h-7" />;

  return (
    <button
      onClick={toggle}
      aria-label="Toggle dark mode"
      style={{
        width: 52,
        height: 28,
        borderRadius: 14,
        background: isDark ? "var(--primary)" : "var(--border-strong)",
        position: "relative",
        transition: "background 0.2s ease",
        border: "none",
        cursor: "pointer",
        flexShrink: 0,
      }}
    >
      <span
        style={{
          position: "absolute",
          top: 3,
          left: isDark ? 27 : 3,
          width: 22,
          height: 22,
          borderRadius: "50%",
          background: "#ffffff",
          transition: "left 0.2s ease",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 12,
        }}
      >
        {isDark ? "🌙" : "☀️"}
      </span>
    </button>
  );
}
