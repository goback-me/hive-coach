"use client";

import { useId } from "react";

// The Bakery Academy mark: an ivory "B" wearing a lime graduation cap on the olive tile.
// Same artwork as app/icon.svg (the favicon).
export function LogoMark({ size = 40, className }: { size?: number; className?: string }) {
  // Unique per instance: the same logo is on the page twice (desktop sidebar + hidden mobile bar), and a
  // gradient id shared with a display:none copy doesn't paint.
  const tile = `bakery-tile-${useId().replace(/:/g, "")}`;
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" className={className} role="img" aria-label="The Bakery Academy">
      <defs>
        <linearGradient id={tile} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#7a9e16" />
          <stop offset="1" stopColor="#3f5409" />
        </linearGradient>
      </defs>
      <rect width="64" height="64" rx="15" fill={`url(#${tile})`} />
      <path
        d="M22 26 V52 M22 26 H32 a6.5 6.5 0 0 1 0 13 H22 M22 39 H34 a6.5 6.5 0 0 1 0 13 H22"
        fill="none"
        stroke="#fafaf8"
        strokeWidth="6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M32 7 L55 15.5 L32 24 L9 15.5Z" fill="#d9f99d" />
      <path d="M18 19 V24.5 Q32 30 46 24.5 V19" fill="#d9f99d" />
      <path d="M52 16.5 V25" stroke="#d9f99d" strokeWidth="2.4" strokeLinecap="round" />
    </svg>
  );
}

/** Mark + "The Bakery / Academy" wordmark, as in the sidebar and sign-in page. */
export function Wordmark({ size = 40 }: { size?: number }) {
  return (
    <div className="flex items-center gap-3">
      <LogoMark size={size} className="shrink-0" />
      <div className="min-w-0">
        <p className="font-heading font-bold leading-none" style={{ color: "var(--text-primary)", fontSize: size * 0.48 }}>
          The Bakery
        </p>
        <p className="text-[10px] uppercase mt-1" style={{ color: "var(--text-muted)", letterSpacing: "0.3em" }}>
          Academy
        </p>
      </div>
    </div>
  );
}
