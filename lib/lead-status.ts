// The fixed 6-stage lead funnel — shared between the client-dashboard's
// small Leads card and the full Leads tab (components/LeadsPanel.tsx), so
// labels/colors can't drift between the two places that show a lead status.
export const LEAD_STATUSES = ["NEW_LEAD", "CHASE_UP", "CLIENT_CONTACTED", "WON", "LOST", "DISQUALIFIED"] as const;
export type LeadStatusValue = (typeof LEAD_STATUSES)[number];

export const LEAD_STATUS_LABELS: Record<LeadStatusValue, string> = {
  NEW_LEAD: "New Lead",
  CHASE_UP: "Chase Up",
  CLIENT_CONTACTED: "Client Contacted",
  WON: "Won",
  LOST: "Lost",
  DISQUALIFIED: "Disqualified",
};

export const LEAD_STATUS_STYLE: Record<LeadStatusValue, { color: string; bg: string }> = {
  NEW_LEAD: { color: "var(--text-secondary)", bg: "var(--surface-hover)" },
  CHASE_UP: { color: "var(--text-primary)", bg: "var(--surface-hover)" },
  CLIENT_CONTACTED: { color: "var(--primary-hover)", bg: "var(--primary-tint)" },
  WON: { color: "var(--primary)", bg: "var(--primary-tint)" },
  LOST: { color: "var(--danger)", bg: "var(--danger-tint)" },
  DISQUALIFIED: { color: "var(--text-muted)", bg: "var(--surface-hover)" },
};

type StageTimestamps = { chaseUpAt: Date | null; contactedAt: Date | null; closedAt: Date | null };

// A stage timestamp is set the FIRST time a lead ever reaches that stage,
// and never touched again — even if the status later moves elsewhere (e.g.
// a Won lead manually reverted to Chase Up keeps its original closedAt).
// Shared by lib/lead-sync.ts (sync-driven status) and lib/actions.ts
// (manual status change) so both paths record history identically.
export function stageTimestampPatch(existing: StageTimestamps, newStatus: LeadStatusValue, now = new Date()) {
  const patch: Partial<Record<"chaseUpAt" | "contactedAt" | "closedAt", Date>> = {};
  if (newStatus === "CHASE_UP" && !existing.chaseUpAt) patch.chaseUpAt = now;
  if (newStatus === "CLIENT_CONTACTED" && !existing.contactedAt) patch.contactedAt = now;
  if ((newStatus === "WON" || newStatus === "LOST" || newStatus === "DISQUALIFIED") && !existing.closedAt) patch.closedAt = now;
  return patch;
}
