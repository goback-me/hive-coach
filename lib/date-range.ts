export const DATE_RANGE_PRESETS = [
  "today",
  "yesterday",
  "today_yesterday",
  "last_7",
  "last_14",
  "last_28",
  "last_30",
  "this_week",
  "last_week",
  "this_month",
  "last_month",
  "maximum",
] as const;
export type DateRangePreset = (typeof DATE_RANGE_PRESETS)[number];

export const DATE_RANGE_LABELS: Record<DateRangePreset, string> = {
  today: "Today",
  yesterday: "Yesterday",
  today_yesterday: "Today & yesterday",
  last_7: "Last 7 days",
  last_14: "Last 14 days",
  last_28: "Last 28 days",
  last_30: "Last 30 days",
  this_week: "This week",
  last_week: "Last week",
  this_month: "This month",
  last_month: "Last month",
  maximum: "Maximum",
};

function startOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}
function addDays(d: Date, n: number) {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}
// Monday-start week.
function startOfWeek(d: Date) {
  const day = d.getDay();
  return addDays(startOfDay(d), -((day + 6) % 7));
}

// `to` is always exclusive (a hard upper bound) — every range here reaches
// "now", not "end of yesterday", so a lead added an hour ago always shows
// under something.
export function resolveDateRange(preset: DateRangePreset, now = new Date()): { from?: Date; to?: Date } {
  const today = startOfDay(now);
  switch (preset) {
    case "today":
      return { from: today, to: now };
    case "yesterday":
      return { from: addDays(today, -1), to: today };
    case "today_yesterday":
      return { from: addDays(today, -1), to: now };
    case "last_7":
      return { from: addDays(today, -7), to: now };
    case "last_14":
      return { from: addDays(today, -14), to: now };
    case "last_28":
      return { from: addDays(today, -28), to: now };
    case "last_30":
      return { from: addDays(today, -30), to: now };
    case "this_week":
      return { from: startOfWeek(today), to: now };
    case "last_week": {
      const start = addDays(startOfWeek(today), -7);
      return { from: start, to: addDays(start, 7) };
    }
    case "this_month":
      return { from: new Date(today.getFullYear(), today.getMonth(), 1), to: now };
    case "last_month": {
      const start = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      return { from: start, to: new Date(today.getFullYear(), today.getMonth(), 1) };
    }
    case "maximum":
    default:
      return {};
  }
}
