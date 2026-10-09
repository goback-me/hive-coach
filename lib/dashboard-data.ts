import { prisma } from "./prisma";

export async function getRevenueTrend(months = 12) {
  const now = new Date();
  const points: { label: string; revenue: number }[] = [];

  for (let i = months - 1; i >= 0; i--) {
    const start = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const end = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);
    const agg = await prisma.payment.aggregate({
      _sum: { amountDue: true },
      where: { status: "PAID", paidDate: { gte: start, lt: end } },
    });
    points.push({
      label: start.toLocaleDateString("en-US", { month: "short", year: "2-digit" }),
      revenue: Number(agg._sum.amountDue ?? 0),
    });
  }

  return points;
}
