import { prisma } from "@/lib/prisma";

export type TaskComment = {
  id: string;
  authorName: string;
  authorRole: "COACH" | "CLIENT";
  body: string;
  createdAt: string;
};

export type TaskRow = {
  id: string;
  title: string;
  description: string | null;
  status: string;
  assignee: string | null;
  dueDate: string | null; // "YYYY-MM-DD"
  source: string;
  clientId: string | null;
  clientName: string | null;
  updatedAt: string;
  comments: TaskComment[];
};

/** Tasks plus their comment thread, serialized for the TaskList client component. */
export async function getTasks(clientId?: string): Promise<TaskRow[]> {
  const tasks = await prisma.task.findMany({
    where: clientId ? { clientId } : {},
    orderBy: [{ dueDate: { sort: "asc", nulls: "last" } }, { createdAt: "desc" }],
    include: {
      client: { select: { name: true } },
      comments: { orderBy: { createdAt: "asc" } },
    },
  });

  return tasks.map((t) => ({
    id: t.id,
    title: t.title,
    description: t.description,
    status: t.status,
    assignee: t.assignee,
    dueDate: t.dueDate ? t.dueDate.toISOString().slice(0, 10) : null,
    source: t.source,
    clientId: t.clientId,
    clientName: t.client?.name ?? null,
    updatedAt: t.updatedAt.toISOString(),
    comments: t.comments.map((c) => ({
      id: c.id,
      authorName: c.authorName,
      authorRole: c.authorRole,
      body: c.body,
      createdAt: c.createdAt.toISOString(),
    })),
  }));
}
