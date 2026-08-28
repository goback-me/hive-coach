// Swarm config/helpers shared between Server Components and Server Actions.
// Deliberately NOT a "use server" file — swarmEmbedSnippet() is a plain
// string builder with no side effects, and Next.js requires every exported
// function in a "use server" file to be async. Forcing it async just to
// satisfy that rule would be misleading (nothing here actually awaits
// anything), so this lives in its own plain module instead.

export const SWARM_URL = (process.env.SWARM_URL || "https://data.hivesocial.agency").replace(/\/$/, "");

export function swarmAuthHeader(): Record<string, string> {
  const user = process.env.SWARM_DASHBOARD_USER || "";
  const pass = process.env.SWARM_DASHBOARD_PASS || "";
  if (!user || !pass) return {};
  return { Authorization: `Basic ${Buffer.from(`${user}:${pass}`).toString("base64")}` };
}

export function normalizeDomain(websiteUrl: string): string {
  try {
    return new URL(websiteUrl).hostname.replace(/^www\./, "");
  } catch {
    return websiteUrl.replace(/^https?:\/\//, "").replace(/^www\./, "").replace(/\/.*$/, "");
  }
}

/** The one universal embed snippet every client pastes — identical for everyone, no per-client id. */
export function swarmEmbedSnippet() {
  return `<script src="${SWARM_URL}/pixel.js" data-endpoint="${SWARM_URL}"></script>`;
}