import Link from "next/link";
import { money, monthly, pct, pctChange, sameDaysLastMonth, STAGE_COLOR, STAGE_LABEL, type LeadView, type MonthRow } from "@/lib/lead-stages";
import type { TaskRow } from "@/lib/tasks";

export type ClientDashboardData = {
  slug: string;
  isCoach: boolean;
  hasSheet: boolean;
  leads: LeadView[];
  tasks: TaskRow[];
  onboarding: { done: number; total: number };
  education: { done: number; total: number };
  latestUpdate: { callDate: string; summary: string; nextSteps: string[]; stepsDone: number[]; createdBy: string } | null;
  nextCall: string | null;
  awards: { earned: number; total: number; next: { name: string; threshold: number } | null; lifetimeRevenue: number };
  account: { revenueThisMonth: number; adSpend: number; sessions: number; activeCampaigns: number };
  details: { email: string | null; program: string | null; joined: string; status: string; driveUrl: string | null };
};

const SNAPSHOT: { key: keyof Omit<MonthRow, "month">; label: string; icon: string; money?: boolean }[] = [
  { key: "leads", label: "Leads", icon: "person_add" },
  { key: "booked", label: "Booked", icon: "event_available" },
  { key: "quoted", label: "Quoted", icon: "request_quote" },
  { key: "won", label: "Won", icon: "handshake" },
  { key: "revenue", label: "Revenue won", icon: "payments", money: true },
];

const todayStr = () => new Date().toISOString().slice(0, 10);
const formatDay = (day: string, opts: Intl.DateTimeFormatOptions = { day: "numeric", month: "short" }) => {
  const [y, m, d] = day.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-AU", opts);
};

// The client's home tab: this month at a glance, program progress, what the coach said last, and what's next.
export default function ClientDashboard({ data }: { data: ClientDashboardData }) {
  const tab = (key: string) => `/clients/${data.slug}?tab=${key}`;
  const months = monthly(data.leads, 6);
  const current = months[months.length - 1];
  const compare = sameDaysLastMonth(data.leads);
  const monthName = formatDay(`${current.month}-01`, { month: "long" });

  const openTasks = data.tasks.filter((t) => t.status !== "DONE");
  const overdue = openTasks.filter((t) => t.dueDate && t.dueDate < todayStr()).length;
  const doneTasks = data.tasks.length - openTasks.length;
  const upNext = [...openTasks].sort((a, b) => (a.dueDate ?? "9999").localeCompare(b.dueDate ?? "9999")).slice(0, 4);
  const recentLeads = data.leads.slice(0, 5);
  const u = data.latestUpdate;

  return (
    <div className="space-y-5">
      {/* This month */}
      <section
        className="rounded-2xl p-6"
        style={{ background: "linear-gradient(135deg, var(--primary-tint) 0%, var(--surface-card) 70%)", border: "1px solid var(--border)" }}
      >
        <div className="flex flex-wrap items-end justify-between gap-2 mb-5">
          <div>
            <p className="text-[11px] font-bold tracking-widest" style={{ color: "var(--primary)" }}>THIS MONTH</p>
            <h3 className="font-heading text-2xl font-bold" style={{ color: "var(--text-primary)" }}>{monthName} so far</h3>
          </div>
          {data.hasSheet && (
            <Link href={tab("growth")} className="text-xs font-semibold" style={{ color: "var(--primary)" }}>
              Month-by-month growth →
            </Link>
          )}
        </div>

        {data.hasSheet ? (
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-3">
            {SNAPSHOT.map((m) => {
              const value = current[m.key];
              const c = pctChange(value, compare[m.key]);
              const max = Math.max(...months.map((r) => r[m.key]), 1);
              return (
                <div key={m.key} className="card rounded-2xl p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs" style={{ color: "var(--text-secondary)" }}>{m.label}</span>
                    <span className="icon-chip w-7 h-7" style={{ background: "var(--primary-tint)" }}>
                      <span className="material-symbols-outlined text-[15px]" style={{ color: "var(--primary)" }}>{m.icon}</span>
                    </span>
                  </div>
                  <p className="font-heading text-3xl font-bold" style={{ color: "var(--text-primary)" }}>{m.money ? money(value) : value}</p>
                  <p className="text-[11px] mt-0.5" style={{ color: c === null || c === 0 ? "var(--text-muted)" : c > 0 ? "var(--primary)" : "var(--danger)" }}>
                    {c === null ? "—" : c === 0 ? "Same" : `${c > 0 ? "▲" : "▼"} ${pct(Math.abs(c))}`}
                    <span style={{ color: "var(--text-muted)" }}> vs same days last month</span>
                  </p>
                  {/* 6-month trend */}
                  <div className="flex items-end gap-1 h-8 mt-3">
                    {months.map((r, i) => (
                      <div
                        key={r.month}
                        title={`${formatDay(`${r.month}-01`, { month: "short" })}: ${m.money ? money(r[m.key]) : r[m.key]}`}
                        className="flex-1 rounded-sm"
                        style={{
                          height: `${Math.max((r[m.key] / max) * 100, r[m.key] ? 12 : 4)}%`,
                          background: i === months.length - 1 ? "var(--secondary)" : "var(--primary)",
                          opacity: i === months.length - 1 ? 1 : 0.35,
                        }}
                      />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="card rounded-2xl p-6 flex flex-wrap items-center gap-4">
            <span className="icon-chip w-11 h-11" style={{ background: "var(--primary-tint)" }}>
              <span className="material-symbols-outlined" style={{ color: "var(--primary)" }}>table_view</span>
            </span>
            <div className="flex-1 min-w-[200px]">
              <p className="font-semibold" style={{ color: "var(--text-primary)" }}>Connect the lead sheet to see this month&apos;s numbers</p>
              <p className="text-sm" style={{ color: "var(--text-secondary)" }}>Leads, bookings, quotes and wins show up here once the Google Sheet is linked.</p>
            </div>
            <Link href={tab("leads")} className="px-4 py-2 rounded-lg font-bold text-sm" style={{ background: "var(--secondary)", color: "#14150f" }}>
              Connect sheet
            </Link>
          </div>
        )}
      </section>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
        {/* Main column */}
        <div className="xl:col-span-2 space-y-5">
          <section className="card rounded-2xl p-6">
            <CardTitle icon="flag" title="Program progress" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-5">
              <Progress label="Onboarding" icon="rocket_launch" done={data.onboarding.done} total={data.onboarding.total} href={tab("onboarding")} />
              <Progress label="Playbooks" icon="school" done={data.education.done} total={data.education.total} href={tab("playbooks")} unit="lessons" />
              <Progress label="Tasks done" icon="task_alt" done={doneTasks} total={data.tasks.length} href={tab("tasks")} note={overdue ? `${overdue} overdue` : undefined} />
              <Progress label="This week's next steps" icon="checklist" done={u?.stepsDone.length ?? 0} total={u?.nextSteps.length ?? 0} href={tab("weekly")} />
            </div>
          </section>

          <section className="card rounded-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <CardTitle icon="forum" title="Latest from your coach" flush />
              {u && (
                <Link href={tab("weekly")} className="text-xs font-semibold" style={{ color: "var(--primary)" }}>
                  All updates →
                </Link>
              )}
            </div>
            {u ? (
              <div className="space-y-3">
                <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                  {formatDay(u.callDate, { weekday: "long", day: "numeric", month: "long" })} · {u.createdBy}
                </p>
                {u.summary && <p className="text-sm whitespace-pre-wrap line-clamp-4" style={{ color: "var(--text-secondary)" }}>{u.summary}</p>}
                {u.nextSteps.length > 0 && (
                  <ul className="space-y-1.5">
                    {u.nextSteps.map((s, i) => {
                      const done = u.stepsDone.includes(i);
                      return (
                        <li key={i} className="flex items-start gap-2 text-sm" style={{ color: done ? "var(--text-muted)" : "var(--text-primary)" }}>
                          <span className="material-symbols-outlined text-[18px]" style={{ color: done ? "var(--primary)" : "var(--text-muted)" }}>
                            {done ? "check_circle" : "radio_button_unchecked"}
                          </span>
                          <span style={{ textDecoration: done ? "line-through" : undefined }}>{s}</span>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            ) : (
              <p className="text-sm" style={{ color: "var(--text-muted)" }}>The weekly call write-up will show here after the first call.</p>
            )}
          </section>

          <section className="card rounded-2xl p-6">
            <div className="flex items-center justify-between mb-3">
              <CardTitle icon="group" title="Recent leads" flush />
              <Link href={tab("leads")} className="text-xs font-semibold" style={{ color: "var(--primary)" }}>
                All leads →
              </Link>
            </div>
            {recentLeads.length === 0 ? (
              <p className="text-sm" style={{ color: "var(--text-muted)" }}>{data.hasSheet ? "No leads in the sheet yet." : "No lead sheet connected yet."}</p>
            ) : (
              <div>
                {recentLeads.map((l) => (
                  <div key={l.id} className="flex items-center justify-between gap-3 py-2.5" style={{ borderBottom: "1px solid var(--border)" }}>
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="w-8 h-8 shrink-0 rounded-full flex items-center justify-center text-xs font-bold" style={{ background: "var(--surface-hover)", color: "var(--text-secondary)" }}>
                        {(l.name ?? "?").slice(0, 1).toUpperCase()}
                      </span>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold truncate" style={{ color: "var(--text-primary)" }}>{l.name || l.phone || l.email || "Unnamed lead"}</p>
                        <p className="text-xs truncate" style={{ color: "var(--text-muted)" }}>
                          {[formatDay(l.date.slice(0, 10)), l.source, l.value ? money(l.value) : null].filter(Boolean).join(" · ")}
                        </p>
                      </div>
                    </div>
                    <span className="flex items-center gap-1.5 text-xs font-semibold shrink-0" style={{ color: STAGE_COLOR[l.stage] }}>
                      <span className="w-1.5 h-1.5 rounded-full" style={{ background: STAGE_COLOR[l.stage] }} />
                      {STAGE_LABEL[l.stage]}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>

        {/* Side column */}
        <div className="space-y-5">
          <section className="card rounded-2xl p-5 flex items-center gap-4">
            <span className="icon-chip w-12 h-12" style={{ background: "var(--primary-tint)" }}>
              <span className="material-symbols-outlined" style={{ color: "var(--primary)" }}>event</span>
            </span>
            <div>
              <p className="text-xs" style={{ color: "var(--text-muted)" }}>Next call</p>
              <p className="font-semibold" style={{ color: "var(--text-primary)" }}>{data.nextCall ?? "Not scheduled yet"}</p>
            </div>
          </section>

          <section className="card rounded-2xl p-5">
            <div className="flex items-center justify-between mb-3">
              <CardTitle icon="pending_actions" title="Up next" flush />
              <Link href={tab("tasks")} className="text-xs font-semibold" style={{ color: "var(--primary)" }}>
                Tasks →
              </Link>
            </div>
            {upNext.length === 0 ? (
              <p className="text-sm" style={{ color: "var(--text-muted)" }}>No open tasks — nice.</p>
            ) : (
              <div className="space-y-2">
                {upNext.map((t) => {
                  const late = !!t.dueDate && t.dueDate < todayStr();
                  return (
                    <div key={t.id} className="rounded-xl px-3 py-2.5" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
                      <p className="text-sm font-semibold truncate" style={{ color: "var(--text-primary)" }}>{t.title}</p>
                      <p className="text-xs" style={{ color: late ? "var(--danger)" : "var(--text-muted)" }}>
                        {t.dueDate ? `${late ? "Overdue · was due" : "Due"} ${formatDay(t.dueDate)}` : "No due date"}
                      </p>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          <section className="card rounded-2xl p-5">
            <CardTitle icon="workspace_premium" title="Awards" />
            <p className="font-heading text-2xl font-bold" style={{ color: "var(--text-primary)" }}>
              {data.awards.earned} <span className="text-sm font-normal" style={{ color: "var(--text-secondary)" }}>of {data.awards.total} earned</span>
            </p>
            {data.awards.next ? (
              <>
                <div className="h-2 rounded-full mt-3 mb-2 overflow-hidden" style={{ background: "var(--surface-hover)" }}>
                  <div className="h-full rounded-full" style={{ width: `${Math.min((data.awards.lifetimeRevenue / data.awards.next.threshold) * 100, 100)}%`, background: "var(--primary)" }} />
                </div>
                <p className="text-xs" style={{ color: "var(--text-secondary)" }}>
                  {money(Math.max(data.awards.next.threshold - data.awards.lifetimeRevenue, 0))} to <b style={{ color: "var(--text-primary)" }}>{data.awards.next.name}</b>
                </p>
              </>
            ) : (
              <p className="text-xs mt-2" style={{ color: "var(--text-secondary)" }}>Every revenue tier earned.</p>
            )}
          </section>

          <section className="card rounded-2xl p-5">
            <CardTitle icon="account_balance_wallet" title="Account" />
            <div className="grid grid-cols-2 gap-3">
              <Mini label="Revenue this month" value={money(data.account.revenueThisMonth)} />
              <Mini label="Ad spend" value={money(data.account.adSpend)} />
              <Mini label="Sessions done" value={String(data.account.sessions)} />
              <Mini label="Active campaigns" value={String(data.account.activeCampaigns)} />
            </div>
          </section>

          <section className="card rounded-2xl p-5">
            <CardTitle icon="badge" title="Details" />
            <dl className="space-y-3 text-sm">
              <Detail icon="mail" label="Email" value={data.details.email ?? "—"} />
              <Detail icon="school" label="Program" value={data.details.program ?? "—"} />
              <Detail icon="calendar_today" label="Joined" value={data.details.joined} />
              <Detail icon="flag" label="Status" value={data.details.status.charAt(0) + data.details.status.slice(1).toLowerCase()} />
            </dl>
            {data.details.driveUrl && (
              <a href={data.details.driveUrl} target="_blank" rel="noreferrer" className="mt-4 flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold" style={{ color: "var(--text-primary)", border: "1px solid var(--border-strong)" }}>
                <span className="material-symbols-outlined text-[18px]">folder_open</span>
                Open Google Drive
              </a>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}

function CardTitle({ icon, title, flush }: { icon: string; title: string; flush?: boolean }) {
  return (
    <div className={`flex items-center gap-2 ${flush ? "" : "mb-4"}`}>
      <span className="icon-chip w-8 h-8" style={{ background: "var(--primary-tint)" }}>
        <span className="material-symbols-outlined text-[16px]" style={{ color: "var(--primary)" }}>{icon}</span>
      </span>
      <h3 className="font-heading font-bold text-lg" style={{ color: "var(--text-primary)" }}>{title}</h3>
    </div>
  );
}

function Progress({ label, icon, done, total, href, unit = "", note }: { label: string; icon: string; done: number; total: number; href: string; unit?: string; note?: string }) {
  const ratio = total ? done / total : 0;
  return (
    <Link href={href} className="block group">
      <div className="flex items-center justify-between mb-1.5 text-sm">
        <span className="flex items-center gap-1.5" style={{ color: "var(--text-secondary)" }}>
          <span className="material-symbols-outlined text-[16px]">{icon}</span>
          {label}
        </span>
        <span className="font-semibold" style={{ color: "var(--text-primary)" }}>
          {total ? `${done}/${total}${unit ? ` ${unit}` : ""}` : "—"}
          {note && <span className="ml-1.5 text-xs font-normal" style={{ color: "var(--danger)" }}>{note}</span>}
        </span>
      </div>
      <div className="h-2 rounded-full overflow-hidden" style={{ background: "var(--surface-hover)" }}>
        <div className="h-full rounded-full transition-all" style={{ width: `${ratio * 100}%`, background: ratio === 1 ? "var(--primary)" : "var(--secondary)" }} />
      </div>
    </Link>
  );
}

function Mini({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl p-3" style={{ background: "var(--surface)" }}>
      <p className="text-[11px]" style={{ color: "var(--text-muted)" }}>{label}</p>
      <p className="font-heading text-lg font-bold" style={{ color: "var(--text-primary)" }}>{value}</p>
    </div>
  );
}

function Detail({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <div className="flex items-start gap-2.5">
      <span className="material-symbols-outlined text-[16px] mt-0.5" style={{ color: "var(--text-muted)" }}>{icon}</span>
      <div className="min-w-0">
        <dt className="text-xs" style={{ color: "var(--text-muted)" }}>{label}</dt>
        <dd className="font-medium truncate" style={{ color: "var(--text-primary)" }}>{value}</dd>
      </div>
    </div>
  );
}
