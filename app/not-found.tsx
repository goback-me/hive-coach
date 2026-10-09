import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export default async function NotFound() {
  const user = await getCurrentUser();

  // A client gets sent back to their own page, not a coach-only dead end.
  let clientHomeHref: string | null = null;
  if (user?.role === "CLIENT" && user.clientId) {
    const client = await prisma.client.findUnique({ where: { id: user.clientId }, select: { slug: true } });
    if (client) clientHomeHref = `/clients/${client.slug}`;
  }

  const primaryHref = user ? (clientHomeHref ?? "/dashboard") : "/login";
  const primaryLabel = user ? "Back to home base" : "Sign in";

  const quickLinks =
    user?.role === "COACH"
      ? [
          { href: "/dashboard", icon: "space_dashboard", label: "Dashboard" },
          { href: "/clients", icon: "diversity_3", label: "Clients" },
          { href: "/sessions", icon: "event", label: "Sessions" },
          { href: "/settings", icon: "settings", label: "Settings" },
        ]
      : [];

  return (
    <div className="min-h-screen flex items-center justify-center px-6" style={{ background: "var(--surface)" }}>
      <div className="w-full max-w-md text-center">
        <div
          className="font-heading font-bold leading-none mb-2"
          style={{ fontSize: 96, color: "var(--primary)", letterSpacing: "-0.03em" }}
        >
          404
        </div>

        <h1 className="font-heading text-2xl font-bold mb-2" style={{ color: "var(--text-primary)" }}>
          Not in the playbook
        </h1>
        <p className="text-sm mb-8" style={{ color: "var(--text-secondary)" }}>
          That page got cut before kickoff. Check the link, or head back to home base.
        </p>

        <Link
          href={primaryHref}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-bold mb-8"
          style={{ background: "var(--primary)", color: "#0d0d0b" }}
        >
          <span className="material-symbols-outlined text-[18px]">arrow_back</span>
          {primaryLabel}
        </Link>

        {quickLinks.length > 0 && (
          <div>
            <p className="text-[10px] font-bold tracking-widest mb-3" style={{ color: "var(--text-muted)" }}>
              OR JUMP TO
            </p>
            <div className="grid grid-cols-2 gap-2">
              {quickLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="card rounded-xl p-3 flex items-center gap-2 text-sm font-medium hover:shadow-md transition-shadow"
                  style={{ color: "var(--text-primary)" }}
                >
                  <span className="material-symbols-outlined text-[18px]" style={{ color: "var(--text-muted)" }}>
                    {link.icon}
                  </span>
                  {link.label}
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}