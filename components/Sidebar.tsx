"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import ThemeToggle from "./ThemeToggle";
import { SignOutButton } from "@clerk/nextjs";
import { LogoMark, Wordmark } from "./Logo";

const COACH_NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard", icon: "space_dashboard" },
  { href: "/clients", label: "Clients", icon: "diversity_3" },
  { href: "/referrals", label: "Referrals", icon: "share" },
  { href: "/tasks", label: "Tasks", icon: "task_alt" },
  { href: "/sessions", label: "Sessions", icon: "event" },
  { href: "/settings", label: "Settings", icon: "settings" },
];

// Desktop: a fixed sidebar. Phone/tablet: a top bar with a menu button that slides the same sidebar in.
export default function Sidebar({ user }: { user: { name: string; role: "COACH" | "CLIENT" } }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  // A client login only ever has their own client page — no cross-client
  // nav items are rendered for them at all, not just hidden via CSS.
  const navItems = user.role === "COACH" ? COACH_NAV_ITEMS : [];

  // Close the mobile menu after navigating, and stop the page scrolling behind it while open.
  useEffect(() => setOpen(false), [pathname]);
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <>
      {/* Mobile top bar */}
      <header
        className="md:hidden fixed top-0 inset-x-0 h-14 z-40 flex items-center justify-between px-4"
        style={{ background: "var(--surface-card)", borderBottom: "1px solid var(--border)" }}
      >
        <Link href="/dashboard" className="flex items-center gap-2">
          <LogoMark size={30} />
          <span className="font-heading font-bold text-lg" style={{ color: "var(--text-primary)" }}>The Bakery</span>
        </Link>
        <button onClick={() => setOpen(true)} aria-label="Open menu" className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ color: "var(--text-primary)" }}>
          <span className="material-symbols-outlined">menu</span>
        </button>
      </header>

      {open && <div className="md:hidden fixed inset-0 z-50" style={{ background: "rgba(0,0,0,0.5)" }} onClick={() => setOpen(false)} />}

      <aside
        className={`fixed left-0 top-0 h-full w-64 flex flex-col py-6 px-4 z-50 transition-transform duration-200 md:translate-x-0 ${open ? "translate-x-0" : "-translate-x-full"}`}
        style={{ background: "var(--surface-card)", borderRight: "1px solid var(--border)" }}
      >
        <div className="flex items-start justify-between px-2 mb-8">
          <Wordmark size={40} />
          <button onClick={() => setOpen(false)} aria-label="Close menu" className="md:hidden -mr-2 w-9 h-9 rounded-lg flex items-center justify-center" style={{ color: "var(--text-muted)" }}>
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        <nav className="flex-1 space-y-1">
          {navItems.map((item) => {
            const active = pathname === item.href || pathname?.startsWith(item.href + "/");
            return (
              <Link
                key={item.href}
                href={item.href}
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg font-medium transition-colors"
                style={{
                  color: active ? "var(--primary)" : "var(--text-secondary)",
                  background: active ? "var(--primary-tint)" : "transparent",
                }}
              >
                <span className="material-symbols-outlined">{item.icon}</span>
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="space-y-2 pt-4" style={{ borderTop: "1px solid var(--border)" }}>
          <div className="flex items-center justify-between px-2">
            <div className="flex items-center gap-2 min-w-0">
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
                style={{ background: "var(--primary-tint)", color: "var(--primary)" }}
              >
                {user.name.slice(0, 1).toUpperCase()}
              </div>
              <span className="text-sm font-medium truncate" style={{ color: "var(--text-primary)" }}>
                {user.name}
              </span>
            </div>
            <ThemeToggle />
          </div>
          <SignOutButton redirectUrl="/login">
            <button type="button" className="flex items-center gap-2 text-xs font-semibold w-full px-3 py-1" style={{ color: "var(--text-secondary)" }}>
              <span className="material-symbols-outlined text-[16px]">logout</span>
              Sign out
            </button>
          </SignOutButton>
        </div>
      </aside>
    </>
  );
}
