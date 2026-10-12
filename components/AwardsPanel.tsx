type Tier = { id: string; name: string; subtitle: string | null; thresholdRevenue: number | null };

// Game-style medal tiers by rank: bronze → silver → gold → diamond.
const RANKS = [
  { rank: "Bronze", icon: "military_tech", from: "#b45309", to: "#f59e0b", glow: "#f59e0b" },
  { rank: "Silver", icon: "workspace_premium", from: "#64748b", to: "#e2e8f0", glow: "#cbd5e1" },
  { rank: "Gold", icon: "emoji_events", from: "#ca8a04", to: "#fde047", glow: "#facc15" },
  { rank: "Diamond", icon: "diamond", from: "#0891b2", to: "#a5f3fc", glow: "#22d3ee" },
];
const rankOf = (i: number) => RANKS[Math.min(i, RANKS.length - 1)];
const money = (n: number) => n.toLocaleString("en-AU", { style: "currency", currency: "AUD", maximumFractionDigits: 0 });

export default function AwardsPanel({ tiers, earnedTierIds, lifetimeRevenue }: { tiers: Tier[]; earnedTierIds: string[]; lifetimeRevenue: number }) {
  const earned = new Set(earnedTierIds);
  const nextIndex = tiers.findIndex((t) => !earned.has(t.id));
  const next = nextIndex === -1 ? null : tiers[nextIndex];
  const prevThreshold = nextIndex > 0 ? Number(tiers[nextIndex - 1].thresholdRevenue ?? 0) : 0;
  const target = Number(next?.thresholdRevenue ?? 0);
  // Progress within the current level (from the last unlocked tier to the next one).
  const levelProgress = next && target > prevThreshold ? Math.min(Math.max((lifetimeRevenue - prevThreshold) / (target - prevThreshold), 0), 1) : 1;
  const toGo = Math.max(target - lifetimeRevenue, 0);

  return (
    <div className="space-y-6">
      {/* Next reward — the thing to chase */}
      <section
        className="relative overflow-hidden rounded-3xl p-7 flex flex-wrap items-center gap-8"
        style={{ background: "radial-gradient(120% 140% at 0% 0%, var(--primary-tint) 0%, var(--surface-card) 55%)", border: "1px solid var(--border)" }}
      >
        <div className="relative shrink-0 award-float">
          <ProgressRing progress={levelProgress} size={150} color={next ? rankOf(nextIndex).glow : "var(--primary)"} />
          <div className="absolute inset-0 flex items-center justify-center">
            <Medal index={next ? nextIndex : tiers.length - 1} unlocked={!next} tease={!!next} size={96} />
          </div>
        </div>

        <div className="flex-1 min-w-[240px]">
          {next ? (
            <>
              <p className="text-[11px] font-bold tracking-[0.25em]" style={{ color: "var(--primary)" }}>
                NEXT REWARD · {rankOf(nextIndex).rank.toUpperCase()}
              </p>
              <h3 className="font-heading text-4xl font-bold mt-1" style={{ color: "var(--text-primary)" }}>
                {next.name} Club
              </h3>
              <p className="mt-2" style={{ color: "var(--text-secondary)" }}>
                <b style={{ color: "var(--text-primary)" }}>{money(toGo)}</b> to go — reach {money(target)} in lifetime revenue to unlock it.
              </p>
              <div className="mt-4 h-3 rounded-full overflow-hidden" style={{ background: "var(--surface-hover)" }}>
                <div
                  className="h-full rounded-full award-bar"
                  style={{ width: `${Math.max(levelProgress * 100, 2)}%`, background: `linear-gradient(90deg, ${rankOf(nextIndex).from}, ${rankOf(nextIndex).to})` }}
                />
              </div>
              <p className="text-xs mt-1.5 flex justify-between" style={{ color: "var(--text-muted)" }}>
                <span>{money(prevThreshold)}</span>
                <span className="font-semibold" style={{ color: "var(--text-secondary)" }}>{Math.round(levelProgress * 100)}% there</span>
                <span>{money(target)}</span>
              </p>
            </>
          ) : (
            <>
              <p className="text-[11px] font-bold tracking-[0.25em]" style={{ color: "var(--primary)" }}>LEGEND STATUS</p>
              <h3 className="font-heading text-4xl font-bold mt-1" style={{ color: "var(--text-primary)" }}>Every award unlocked</h3>
              <p className="mt-2" style={{ color: "var(--text-secondary)" }}>You&apos;ve cleared every tier. Absolute machine.</p>
            </>
          )}
        </div>

        <div className="flex gap-3">
          <Stat label="Awards" value={`${earned.size}/${tiers.length}`} icon="emoji_events" />
          <Stat label="Lifetime revenue" value={money(lifetimeRevenue)} icon="trending_up" />
        </div>
      </section>

      {/* The level path */}
      {tiers.length > 0 && (
        <section className="card rounded-3xl px-8 pt-7 pb-6">
          <p className="text-[11px] font-bold tracking-[0.25em] mb-6" style={{ color: "var(--text-muted)" }}>YOUR JOURNEY</p>
          <div className="relative flex items-center">
            {[{ id: "start", name: "Start", thresholdRevenue: 0 } as Tier, ...tiers].map((t, i, all) => {
              const isStart = i === 0;
              const unlocked = isStart || earned.has(t.id);
              const tierIndex = i - 1;
              const segmentFill =
                i === 0 ? 0 : earned.has(t.id) ? 1 : tierIndex === nextIndex ? levelProgress : 0;
              return (
                <div key={t.id} className={`flex items-center ${i === 0 ? "" : "flex-1"}`}>
                  {i > 0 && (
                    <div className="flex-1 h-2 mx-2 rounded-full overflow-hidden" style={{ background: "var(--surface-hover)" }}>
                      <div className="h-full rounded-full award-bar" style={{ width: `${segmentFill * 100}%`, background: `linear-gradient(90deg, ${rankOf(Math.max(tierIndex - 1, 0)).to}, ${rankOf(tierIndex).to})` }} />
                    </div>
                  )}
                  <div className="relative flex flex-col items-center">
                    {tierIndex === nextIndex && (
                      <span className="absolute -top-7 text-[10px] font-bold px-2 py-0.5 rounded-full whitespace-nowrap award-pulse" style={{ background: "var(--secondary)", color: "#14150f" }}>
                        NEXT
                      </span>
                    )}
                    {isStart ? (
                      <span className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: "var(--primary)", color: "#0d0d0b" }}>
                        <span className="material-symbols-outlined text-[20px]">flag</span>
                      </span>
                    ) : (
                      <Medal index={tierIndex} unlocked={unlocked} tease={tierIndex === nextIndex} size={44} />
                    )}
                    <span className="absolute top-12 text-xs font-bold whitespace-nowrap" style={{ color: unlocked ? "var(--text-primary)" : "var(--text-muted)" }}>
                      {isStart ? "Start" : t.name}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="h-8" />
        </section>
      )}

      {/* Trophy cabinet */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {tiers.map((tier, i) => {
          const isEarned = earned.has(tier.id);
          const isNext = i === nextIndex;
          const r = rankOf(i);
          return (
            <div
              key={tier.id}
              className={`relative overflow-hidden rounded-3xl p-7 flex flex-col items-center text-center ${isEarned ? "award-shine" : ""}`}
              style={{
                background: isEarned ? `radial-gradient(120% 90% at 50% 0%, ${r.glow}33 0%, var(--surface-card) 65%)` : "var(--surface-card)",
                border: `1.5px solid ${isEarned ? r.glow : isNext ? "var(--border-strong)" : "var(--border)"}`,
                boxShadow: isEarned ? `0 18px 50px -20px ${r.glow}` : "none",
              }}
            >
              <span
                className="absolute top-4 right-4 text-[10px] font-bold px-2 py-1 rounded-full flex items-center gap-1"
                style={isEarned ? { background: r.glow, color: "#14150f" } : { background: "var(--surface-hover)", color: "var(--text-muted)" }}
              >
                <span className="material-symbols-outlined text-[12px]">{isEarned ? "verified" : "lock"}</span>
                {isEarned ? "UNLOCKED" : isNext ? "IN PROGRESS" : "LOCKED"}
              </span>

              <div className={isEarned ? "award-float" : ""}>
                <Medal index={i} unlocked={isEarned} tease={isNext} size={88} />
              </div>

              <p className="text-[10px] font-bold tracking-[0.25em] mt-4" style={{ color: isEarned ? r.from : "var(--text-muted)" }}>
                {r.rank.toUpperCase()} TIER
              </p>
              <p className="font-heading text-3xl font-bold" style={{ color: isEarned ? "var(--text-primary)" : "var(--text-secondary)" }}>
                {tier.name}
              </p>
              <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
                {tier.subtitle ?? (tier.thresholdRevenue ? `${money(Number(tier.thresholdRevenue))} lifetime revenue` : "Complete the required playbook")}
              </p>

              {isEarned ? (
                <p className="text-sm font-semibold mt-4" style={{ color: "var(--text-primary)" }}>🎉 Earned — nice work.</p>
              ) : isNext ? (
                <div className="w-full mt-4">
                  <div className="h-2 rounded-full overflow-hidden" style={{ background: "var(--surface-hover)" }}>
                    <div className="h-full rounded-full award-bar" style={{ width: `${Math.max(levelProgress * 100, 2)}%`, background: `linear-gradient(90deg, ${r.from}, ${r.to})` }} />
                  </div>
                  <p className="text-xs mt-1.5" style={{ color: "var(--text-secondary)" }}>{money(toGo)} to unlock</p>
                </div>
              ) : (
                <p className="text-xs mt-4" style={{ color: "var(--text-muted)" }}>Unlock {tiers[i - 1]?.name ?? "the previous tier"} first</p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/** A round medal with ribbon tails; greyed out with a lock until it's unlocked. */
// `tease`: the next one to win — shown in its real colours (faded, still locked) so it's something to want.
function Medal({ index, unlocked, size, tease }: { index: number; unlocked: boolean; size: number; tease?: boolean }) {
  const r = rankOf(index);
  const id = `medal-${index}-${unlocked ? "on" : "off"}`;
  return (
    <div className="relative" style={{ width: size, height: size * 1.15 }}>
      <svg viewBox="0 0 100 115" width={size} height={size * 1.15} style={{ filter: unlocked ? `drop-shadow(0 6px 14px ${r.glow}88)` : tease ? "saturate(0.75) opacity(0.8)" : "grayscale(1) opacity(0.45)" }}>
        <defs>
          <linearGradient id={id} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor={r.to} />
            <stop offset="100%" stopColor={r.from} />
          </linearGradient>
        </defs>
        {/* ribbon tails */}
        <path d="M30 70 L22 112 L36 104 L44 114 L50 78 Z" fill={r.from} opacity="0.85" />
        <path d="M70 70 L78 112 L64 104 L56 114 L50 78 Z" fill={r.from} opacity="0.85" />
        {/* medal */}
        <circle cx="50" cy="45" r="40" fill={`url(#${id})`} />
        <circle cx="50" cy="45" r="31" fill="none" stroke="#ffffff" strokeOpacity="0.55" strokeWidth="2.5" strokeDasharray="3 4" />
        <circle cx="50" cy="45" r="40" fill="none" stroke="#ffffff" strokeOpacity="0.35" strokeWidth="2" />
      </svg>
      <span className="absolute left-0 right-0 flex items-center justify-center" style={{ top: size * 0.08, height: size * 0.8 }}>
        <span className="material-symbols-outlined" style={{ fontSize: size * 0.36, color: unlocked || tease ? "#ffffff" : "var(--text-muted)", textShadow: unlocked || tease ? "0 1px 3px rgba(0,0,0,0.35)" : "none" }}>
          {unlocked ? r.icon : "lock"}
        </span>
      </span>
    </div>
  );
}

function ProgressRing({ progress, size, color }: { progress: number; size: number; color: string }) {
  const stroke = 8;
  const radius = (size - stroke) / 2;
  const c = 2 * Math.PI * radius;
  return (
    <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
      <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="var(--surface-hover)" strokeWidth={stroke} />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke={color}
        strokeWidth={stroke}
        strokeLinecap="round"
        strokeDasharray={c}
        strokeDashoffset={c * (1 - Math.max(progress, 0.02))}
        className="award-ring"
      />
    </svg>
  );
}

function Stat({ label, value, icon }: { label: string; value: string; icon: string }) {
  return (
    <div className="rounded-2xl px-4 py-3 min-w-[130px]" style={{ background: "var(--surface-card)", border: "1px solid var(--border)" }}>
      <span className="material-symbols-outlined text-[18px]" style={{ color: "var(--primary)" }}>{icon}</span>
      <p className="font-heading text-xl font-bold" style={{ color: "var(--text-primary)" }}>{value}</p>
      <p className="text-[11px]" style={{ color: "var(--text-muted)" }}>{label}</p>
    </div>
  );
}
