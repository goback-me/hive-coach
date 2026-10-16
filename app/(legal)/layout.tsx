import type { ReactNode } from "react";
import Link from "next/link";
import { Wordmark } from "@/components/Logo";
import { LEGAL } from "@/lib/legal";
import { LEGAL_LINKS } from "@/components/Legal";

// Public (signed-out) shell for the legal pages.
export default function LegalLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col" style={{ background: "var(--surface)" }}>
      <header className="w-full max-w-3xl mx-auto px-4 sm:px-6 py-6 flex items-center justify-between gap-4">
        <Link href="/" aria-label={`${LEGAL.product} home`}>
          <Wordmark size={36} />
        </Link>
        <Link href="/login" className="text-sm font-semibold px-4 py-2 rounded-lg" style={{ color: "var(--text-primary)", border: "1px solid var(--border-strong)" }}>
          Sign in
        </Link>
      </header>

      <main className="w-full max-w-3xl mx-auto px-4 sm:px-6 pb-12 flex-1">
        <article className="card rounded-2xl p-6 sm:p-10">{children}</article>
      </main>

      <footer className="w-full max-w-3xl mx-auto px-4 sm:px-6 pb-10 flex flex-wrap items-center justify-between gap-3 text-xs" style={{ color: "var(--text-muted)" }}>
        <span>
          © {new Date().getFullYear()} {LEGAL.product}
        </span>
        <nav className="flex flex-wrap gap-4">
          {LEGAL_LINKS.map((l) => (
            <Link key={l.href} href={l.href} className="hover:underline" style={{ color: "var(--text-secondary)" }}>
              {l.label}
            </Link>
          ))}
          <a href={`mailto:${LEGAL.email}`} className="hover:underline" style={{ color: "var(--text-secondary)" }}>
            Contact
          </a>
        </nav>
      </footer>
    </div>
  );
}
