// Client-portal tabs, in display order. Keys are stored in Client.hiddenTabs.
export const CLIENT_TABS = [
  { key: "onboarding", label: "Onboarding" },
  { key: "dashboard", label: "Dashboard" },
  { key: "weekly", label: "Weekly status" },
  { key: "tasks", label: "Tasks" },
  { key: "leads", label: "Leads" },
  { key: "growth", label: "Growth" },
  { key: "playbooks", label: "Playbooks" },
  { key: "ads", label: "Ads" },
  { key: "referrals", label: "Referrals" },
  { key: "awards", label: "Awards" },
  { key: "gameplan", label: "Gameplan" },
  { key: "tracking", label: "Tracking" },
] as const;

export type ClientTabKey = (typeof CLIENT_TABS)[number]["key"];

// What a client gets when someone they refer signs up. One place to change it.
export const REFERRAL_REWARD = { headline: "$1,000 off", detail: "your program — one-off, when someone you refer signs up" };

// Set while a coach is previewing client pages as the client sees them.
export const CLIENT_PREVIEW_COOKIE = "preview_as_client";
