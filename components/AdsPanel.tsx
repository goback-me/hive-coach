type Campaign = {
  id: string;
  name: string;
  status: string;
  spend: number;
  impressions: number;
  profileVisits: number;
  engagement: number;
  saves: number;
  syncedAt: string | null;
};

export default function AdsPanel({ campaigns }: { campaigns: Campaign[] }) {
  const totals = campaigns.reduce(
    (acc, c) => ({
      spend: acc.spend + c.spend,
      impressions: acc.impressions + c.impressions,
      active: acc.active + (c.status === "active" ? 1 : 0),
    }),
    { spend: 0, impressions: 0, active: 0 }
  );

  const isConnected = campaigns.some((c) => c.syncedAt);

  return (
    <div>
      {!isConnected && (
        <div
          className="rounded-xl p-3 mb-4 flex items-center gap-2 text-sm"
          style={{ background: "var(--surface-hover)", color: "var(--text-secondary)" }}
        >
          <span className="material-symbols-outlined text-[18px]">info</span>
          Not connected to Meta Ads or your server-side tracker yet — showing $0 until that's wired up in Settings.
        </div>
      )}

      <div className="grid grid-cols-4 gap-4 mb-4">
        <div className="card rounded-2xl p-4">
          <p className="text-xs" style={{ color: "var(--text-secondary)" }}>Total Spend</p>
          <p className="font-heading text-2xl font-bold mt-1" style={{ color: "var(--text-primary)" }}>${totals.spend.toLocaleString()}</p>
        </div>
        <div className="card rounded-2xl p-4">
          <p className="text-xs" style={{ color: "var(--text-secondary)" }}>Impressions</p>
          <p className="font-heading text-2xl font-bold mt-1" style={{ color: "var(--text-primary)" }}>{totals.impressions.toLocaleString()}</p>
        </div>
        <div className="card rounded-2xl p-4">
          <p className="text-xs" style={{ color: "var(--text-secondary)" }}>Link Clicks</p>
          <p className="font-heading text-2xl font-bold mt-1" style={{ color: "var(--text-primary)" }}>0</p>
        </div>
        <div className="card rounded-2xl p-4">
          <p className="text-xs" style={{ color: "var(--text-secondary)" }}>Active Campaigns</p>
          <p className="font-heading text-2xl font-bold mt-1" style={{ color: "var(--text-primary)" }}>{totals.active}</p>
        </div>
      </div>

      <div className="card rounded-2xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr style={{ borderBottom: "1px solid var(--border)" }}>
              {["Campaign", "Status", "Spend", "Impressions", "Profile Visits", "Engagement", "Saves"].map((h) => (
                <th key={h} className="text-left px-4 py-3 font-medium" style={{ color: "var(--text-muted)" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {campaigns.map((c) => (
              <tr key={c.id} style={{ borderBottom: "1px solid var(--border)" }}>
                <td className="px-4 py-3" style={{ color: "var(--text-primary)" }}>{c.name}</td>
                <td className="px-4 py-3" style={{ color: "var(--text-secondary)" }}>{c.status}</td>
                <td className="px-4 py-3" style={{ color: "var(--text-primary)" }}>${c.spend.toLocaleString()}</td>
                <td className="px-4 py-3" style={{ color: "var(--text-primary)" }}>{c.impressions.toLocaleString()}</td>
                <td className="px-4 py-3" style={{ color: "var(--text-primary)" }}>{c.profileVisits.toLocaleString()}</td>
                <td className="px-4 py-3" style={{ color: "var(--text-primary)" }}>{c.engagement.toLocaleString()}</td>
                <td className="px-4 py-3" style={{ color: "var(--text-primary)" }}>{c.saves.toLocaleString()}</td>
              </tr>
            ))}
            {campaigns.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center" style={{ color: "var(--text-muted)" }}>
                  No campaigns yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
