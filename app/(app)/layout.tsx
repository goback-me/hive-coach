import type { ReactNode } from "react";
import Sidebar from "@/components/Sidebar";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { CLIENT_TABS } from "@/lib/client-tabs";

export default async function AppGroupLayout({ children }: { children: ReactNode }) {
  const user = await requireUser(); // redirects to /login if not signed in

  // A client's sidebar lists the sections of their own portal (minus tabs their coach hid).
  const client =
    user.role === "CLIENT" && user.clientId
      ? await prisma.client.findUnique({ where: { id: user.clientId }, select: { slug: true, hiddenTabs: true } })
      : null;
  const clientNav = client
    ? { slug: client.slug, tabs: CLIENT_TABS.filter((t) => !client.hiddenTabs.includes(t.key)).map((t) => ({ key: t.key, label: t.label })) }
    : null;

  return (
    <>
      <Sidebar user={{ name: user.name, role: user.role }} clientNav={clientNav} />
      <main className="md:ml-64 min-h-screen pt-14 md:pt-0 min-w-0">{children}</main>
    </>
  );
}
