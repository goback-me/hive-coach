import { prisma } from "@/lib/prisma";
import { requireCoach } from "@/lib/auth";
import { getTasks } from "@/lib/tasks";
import TaskList from "@/components/TaskList";

export const dynamic = "force-dynamic";

export default async function TasksPage() {
  await requireCoach(); // global cross-client task list; clients see their own tasks on their client page

  const [tasks, clients, people] = await Promise.all([
    getTasks(),
    prisma.client.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } }),
    prisma.user.findMany({ select: { name: true, role: true, clientId: true }, orderBy: { name: "asc" } }),
  ]);

  return (
    <div className="p-4 md:p-10 max-w-[1500px] mx-auto">
      <div className="mb-6">
        <h1 className="font-heading text-3xl font-bold" style={{ color: "var(--text-primary)" }}>Tasks</h1>
        <p style={{ color: "var(--text-secondary)" }}>What every client owes, what&apos;s overdue, and where they&apos;re waiting on you.</p>
      </div>
      <TaskList tasks={tasks} clients={clients} people={people} isCoach />
    </div>
  );
}
