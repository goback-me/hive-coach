"use client";

import { useRouter } from "next/navigation";

export default function ClientFilter({
  clients,
  activeSlug,
}: {
  clients: { slug: string; name: string }[];
  activeSlug: string;
}) {
  const router = useRouter();

  return (
    <div
      className="flex items-center gap-2 px-4 py-2 rounded-lg"
      style={{ background: "var(--surface-card)", border: "1px solid var(--border)" }}
    >
      <span className="material-symbols-outlined text-[18px]" style={{ color: "var(--text-secondary)" }}>filter_list</span>
      <span className="text-xs font-semibold" style={{ color: "var(--text-secondary)" }}>Client:</span>
      <select
        value={activeSlug}
        onChange={(e) => router.push(`/leads?client=${e.target.value}`)}
        className="text-sm font-semibold bg-transparent outline-none cursor-pointer"
        style={{ color: "var(--primary)" }}
      >
        {clients.map((c) => (
          <option key={c.slug} value={c.slug}>
            {c.name}
          </option>
        ))}
      </select>
    </div>
  );
}
