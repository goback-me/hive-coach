import { prisma } from "@/lib/prisma";
import { createTask, updateTaskStatus } from "@/lib/actions";
import TaskList from "@/components/TaskList";

export default async function TasksPage() {
  const [tasks, clients] = await Promise.all([
    prisma.task.findMany({ orderBy: { dueDate: "asc" }, include: { client: { select: { name: true } } } }),
    prisma.client.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } }),
  ]);

  const taskData = tasks.map((t) => ({
    id: t.id,
    title: t.title,
    status: t.status,
    assignee: t.assignee,
    dueDate: t.dueDate ? t.dueDate.toISOString() : null,
    source: t.source,
    clientName: t.client?.name ?? null,
  }));

  return (
    <div className="p-10 max-w-[1500px] mx-auto">
      <div className="mb-6">
        <h1 className="font-heading text-3xl font-bold" style={{ color: "var(--text-primary)" }}>Tasks</h1>
        <p style={{ color: "var(--text-secondary)" }}>Every task across every client and team member.</p>
      </div>
      <TaskList initialTasks={taskData} clients={clients} onCreate={createTask} onUpdateStatus={updateTaskStatus} />
    </div>
  );
}
