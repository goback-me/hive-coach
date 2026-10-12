import type { ReactNode } from "react";
import Sidebar from "@/components/Sidebar";
import { requireUser } from "@/lib/auth";

export default async function AppGroupLayout({ children }: { children: ReactNode }) {
  const user = await requireUser(); // redirects to /login if not signed in

  return (
    <>
      <Sidebar user={{ name: user.name, role: user.role }} />
      <main className="md:ml-64 min-h-screen pt-14 md:pt-0 min-w-0">{children}</main>
    </>
  );
}