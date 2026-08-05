import type { ReactNode } from "react";
import Sidebar from "@/components/Sidebar";

export default function AppGroupLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <Sidebar />
      <main className="ml-64 min-h-screen">{children}</main>
    </>
  );
}
