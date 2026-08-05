type Tier = { id: string; name: string; subtitle: string | null; thresholdRevenue: number | null };

export default function AwardsPanel({
  tiers,
  earnedTierIds,
  lifetimeRevenue,
}: {
  tiers: Tier[];
  earnedTierIds: string[];
  lifetimeRevenue: number;
}) {
  const nextLocked = tiers.find((t) => !earnedTierIds.includes(t.id) && t.thresholdRevenue);
  const remaining = nextLocked?.thresholdRevenue ? Number(nextLocked.thresholdRevenue) - lifetimeRevenue : 0;

  return (
    <div>
      <h3 className="font-heading text-xl font-bold mb-1" style={{ color: "var(--text-primary)" }}>Awards</h3>
      {nextLocked && (
        <p className="mb-6" style={{ color: "var(--text-secondary)" }}>
          You're at ${lifetimeRevenue.toLocaleString()} lifetime — ${Math.max(remaining, 0).toLocaleString()} away from {nextLocked.name}.
        </p>
      )}
      <div className="grid grid-cols-3 gap-5">
        {tiers.map((tier) => {
          const earned = earnedTierIds.includes(tier.id);
          return (
            <div
              key={tier.id}
              className="relative rounded-3xl p-8 flex flex-col items-center text-center overflow-hidden transition-transform"
              style={{
                background: earned
                  ? "linear-gradient(160deg, var(--primary-tint) 0%, var(--surface-card) 70%)"
                  : "var(--surface-card)",
                border: `1.5px solid ${earned ? "var(--primary)" : "var(--border)"}`,
                boxShadow: earned ? "0 0 40px -10px var(--primary)" : "none",
              }}
            >
              {earned && (
                <div
                  className="absolute top-3 right-3 text-[10px] font-bold px-2 py-1 rounded-full flex items-center gap-1"
                  style={{ background: "var(--primary)", color: "#0d0d0b" }}
                >
                  <span className="material-symbols-outlined text-[12px]">check</span>
                  EARNED
                </div>
              )}

              <div
                className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4 relative"
                style={{
                  background: earned ? "var(--primary)" : "var(--surface-hover)",
                }}
              >
                <span
                  className="material-symbols-outlined"
                  style={{ fontSize: 32, color: earned ? "#0d0d0b" : "var(--text-muted)" }}
                >
                  {earned ? "workspace_premium" : "lock"}
                </span>
                {earned && (
                  <div
                    className="absolute inset-0 rounded-2xl"
                    style={{ boxShadow: "0 0 24px 4px var(--primary)", opacity: 0.5 }}
                  />
                )}
              </div>

              <p
                className="text-[10px] font-bold tracking-[0.2em] mb-1"
                style={{ color: earned ? "var(--primary)" : "var(--text-muted)" }}
              >
                COACH OS
              </p>
              <p
                className="font-heading text-3xl font-bold mb-1"
                style={{ color: earned ? "var(--text-primary)" : "var(--text-secondary)" }}
              >
                {tier.name}
              </p>
              <p className="text-xs" style={{ color: "var(--text-muted)" }}>per month</p>
              {tier.subtitle && (
                <p
                  className="text-xs font-bold tracking-widest mt-3 px-3 py-1 rounded-full"
                  style={{
                    color: earned ? "var(--primary)" : "var(--text-muted)",
                    background: earned ? "var(--primary-tint)" : "var(--surface-hover)",
                  }}
                >
                  {tier.subtitle.toUpperCase()}
                </p>
              )}
            </div>
          );
        })}
        {tiers.length === 0 && <p style={{ color: "var(--text-secondary)" }}>No award tiers set up yet.</p>}
      </div>
    </div>
  );
}