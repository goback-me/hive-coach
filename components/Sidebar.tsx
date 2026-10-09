"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import ThemeToggle from "./ThemeToggle";
import { SignOutButton } from "@clerk/nextjs";

const COACH_NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard", icon: "space_dashboard" },
  { href: "/clients", label: "Clients", icon: "diversity_3" },
  { href: "/referrals", label: "Referrals", icon: "share" },
  { href: "/tasks", label: "Tasks", icon: "task_alt" },
  { href: "/sessions", label: "Sessions", icon: "event" },
  { href: "/settings", label: "Settings", icon: "settings" },
];

export default function Sidebar({ user }: { user: { name: string; role: "COACH" | "CLIENT" } }) {
  const pathname = usePathname();
  // A client login only ever has their own client page — no cross-client
  // nav items are rendered for them at all, not just hidden via CSS.
  const navItems = user.role === "COACH" ? COACH_NAV_ITEMS : [];

  return (
    <aside
      className="fixed left-0 top-0 h-full w-64 flex flex-col py-6 px-4 z-50"
      style={{ background: "var(--surface-card)", borderRight: "1px solid var(--border)" }}
    >
      <div className="flex items-center gap-3 px-2 mb-8">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold"
          style={{ background: "var(--primary)" }}
        >
          C
        </div>
        <div>
          <h1 className="font-heading font-bold text-lg leading-none" style={{ color: "var(--text-primary)" }}>
            Coach OS
          </h1>
          <p className="text-[10px] uppercase tracking-widest" style={{ color: "var(--text-muted)" }}>
            Client Command
          </p>
        </div>
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
          <button
            type="button"
            className="flex items-center gap-2 text-xs font-semibold w-full px-3 py-1"
            style={{ color: "var(--text-secondary)" }}
          >
            <span className="material-symbols-outlined text-[16px]">logout</span>
            Sign out
          </button>
        </SignOutButton>
      </div>
    </aside>
  );
}