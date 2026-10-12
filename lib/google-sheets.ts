import { prisma } from "@/lib/prisma";
import { encryptToken, decryptToken } from "@/lib/crypto";
import { cellToString } from "@/lib/sheet-parse";

// Read-only: The Bakery never writes to a client's sheet — the client keeps it up to date.
// No Drive scope: clients paste their sheet link, which keeps consent to "see your spreadsheets"
// (Drive scopes are restricted and need Google's security review for outside users).
const SCOPES = ["https://www.googleapis.com/auth/spreadsheets.readonly", "https://www.googleapis.com/auth/userinfo.email"].join(" ");

function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`${name} is not set. Add it to .env`);
  return v;
}

export const GOOGLE_OAUTH_STATE_COOKIE = "google_oauth_state";

/** Public origin of this app, taken from the registered redirect URI (not the request Host header). */
export function appOrigin() {
  return new URL(requireEnv("GOOGLE_REDIRECT_URI")).origin;
}

export function getGoogleAuthUrl(state: string) {
  const params = new URLSearchParams({
    state,
    client_id: requireEnv("GOOGLE_CLIENT_ID"),
    redirect_uri: requireEnv("GOOGLE_REDIRECT_URI"),
    response_type: "code",
    access_type: "offline", // required to get a refresh_token
    prompt: "consent", // force a refresh_token every time, not just the first connect
    scope: SCOPES,
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

export async function exchangeCodeForTokens(code: string) {
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: requireEnv("GOOGLE_CLIENT_ID"),
      client_secret: requireEnv("GOOGLE_CLIENT_SECRET"),
      redirect_uri: requireEnv("GOOGLE_REDIRECT_URI"),
      grant_type: "authorization_code",
    }),
  });
  if (!res.ok) throw new Error(`Google token exchange failed: ${await res.text()}`);
  return res.json() as Promise<{ access_token: string; refresh_token?: string; expires_in: number; scope: string }>;
}

async function refreshAccessToken(refreshToken: string) {
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      refresh_token: refreshToken,
      client_id: requireEnv("GOOGLE_CLIENT_ID"),
      client_secret: requireEnv("GOOGLE_CLIENT_SECRET"),
      grant_type: "refresh_token",
    }),
  });
  if (!res.ok) throw new Error(`Google token refresh failed: ${await res.text()}`);
  return res.json() as Promise<{ access_token: string; expires_in: number }>;
}

export async function getGoogleUserEmail(accessToken: string) {
  const res = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) return null;
  return ((await res.json()).email as string | undefined) ?? null;
}

/** A valid access token for the client's connected Google account, refreshed and persisted when close to expiry. */
export async function getValidAccessToken(clientId: string): Promise<string> {
  const conn = await prisma.googleAccountConnection.findUnique({ where: { clientId } });
  if (!conn) throw new Error("Google isn't connected for this client — connect it on the Leads tab");

  if (conn.expiresAt.getTime() - 60_000 > Date.now()) return decryptToken(conn.accessToken);

  const refreshed = await refreshAccessToken(decryptToken(conn.refreshToken));
  await prisma.googleAccountConnection.update({
    where: { id: conn.id },
    data: {
      accessToken: encryptToken(refreshed.access_token),
      expiresAt: new Date(Date.now() + refreshed.expires_in * 1000),
    },
  });
  return refreshed.access_token;
}

export async function listSheetTabs(accessToken: string, spreadsheetId: string) {
  const res = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?fields=properties.title,sheets.properties.title`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) throw new Error(`Sheets metadata fetch failed: ${await res.text()}`);
  const data = await res.json();
  return {
    title: (data.properties?.title as string) ?? "",
    tabs: ((data.sheets ?? []) as { properties: { title: string } }[]).map((s) => s.properties.title),
  };
}

// All values from a tab (first row = headers). `cells` are raw typed values
// (numbers unformatted, dates as Sheets serials); `rows` the same as strings.
export async function getSheetValues(accessToken: string, spreadsheetId: string, sheetName: string) {
  const range = encodeURIComponent(`'${sheetName.replace(/'/g, "''")}'`);
  const res = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}?valueRenderOption=UNFORMATTED_VALUE&dateTimeRenderOption=SERIAL_NUMBER`,
    { headers: { Authorization: `Bearer ${accessToken}` } },
  );
  if (!res.ok) throw new Error(`Sheet values fetch failed: ${await res.text()}`);
  const values: unknown[][] = (await res.json()).values ?? [];
  const [headerRow, ...bodyRows] = values;
  const headers = (headerRow ?? []).map(cellToString);
  const cells = bodyRows.map((r) => headers.map((_, i) => r[i] ?? ""));
  return { headers, cells, rows: cells.map((r) => r.map(cellToString)) };
}
