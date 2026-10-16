import type { ReactNode } from "react";
import { LEGAL } from "@/lib/legal";

export const LEGAL_LINKS = [
  { href: "/privacy", label: "Privacy Policy" },
  { href: "/terms", label: "Terms of Service" },
  { href: "/data-deletion", label: "Data deletion" },
];

/** Title block at the top of each legal page. */
export function LegalTitle({ title, intro }: { title: string; intro?: ReactNode }) {
  return (
    <div className="mb-6 pb-6" style={{ borderBottom: "1px solid var(--border)" }}>
      <h1 className="font-heading text-3xl sm:text-4xl font-bold" style={{ color: "var(--text-primary)" }}>
        {title}
      </h1>
      <p className="text-sm mt-2" style={{ color: "var(--text-muted)" }}>
        Last updated {LEGAL.updated}
      </p>
      {intro && (
        <p className="mt-4" style={{ color: "var(--text-secondary)" }}>
          {intro}
        </p>
      )}
    </div>
  );
}
