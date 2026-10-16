import type { CSSProperties, ReactNode } from "react";
import Link from "next/link";
import { LogoMark, Wordmark } from "@/components/Logo";
import { LEGAL_LINKS } from "@/components/Legal";
import EnquiryForm from "@/components/EnquiryForm";
import { LEGAL } from "@/lib/legal";

// Public homepage — this is the app's Site URL in the Meta app settings, so it must load
// signed out with a plain 200 (middleware.ts skips Clerk for "/"). Never call auth() here.
const description =
  "The Bakery Academy is the private client portal for our coaching programme: sessions, tasks, course material, leads and ad results in one place.";

export const metadata = {
  title: "The Bakery Academy · Client portal for coaching programmes",
  description,
  openGraph: { title: "The Bakery Academy", description, url: "https://thebakery.academy", siteName: "The Bakery Academy", type: "website" },
};

const delay = (s: number) => ({ "--d": `${s}s` }) as CSSProperties;

const FEATURES = [
  { icon: "event_available", title: "Sessions & weekly updates", text: "Your call schedule, the notes from each session and the next steps you agreed — all in one timeline." },
  { icon: "task_alt", title: "Tasks & onboarding", text: "A clear checklist from day one, so you always know what to work on next." },
  { icon: "school", title: "Course & playbooks", text: "Lessons and step-by-step playbooks you can work through at your own pace." },
  { icon: "groups", title: "Leads & sales", text: "Leads from your own Google Sheet, tracked from first enquiry through to won." },
  { icon: "insights", title: "Ad results", text: "Ad spend, clicks and cost per lead from your Meta ad account, next to the leads they brought in." },
  { icon: "emoji_events", title: "Progress & awards", text: "Milestones that celebrate the wins as your business grows." },
];

const STEPS = [
  { icon: "ads_click", title: "Click “Connect with Facebook”", text: "From the Ads tab in your portal." },
  { icon: "verified_user", title: "Approve read-only access", text: "On Facebook’s own screen. We only ask for ads_read." },
  { icon: "account_tree", title: "Choose your ad account", text: "If you manage more than one, pick the one to track." },
  { icon: "monitoring", title: "See your results", text: "Spend, clicks and cost per lead, matched to your leads." },
];

const TRUST = [
  { icon: "visibility", title: "Read-only", text: "We never post, edit, pause or spend money on your ads, and never edit your sheets." },
  { icon: "lock", title: "Encrypted", text: "Facebook and Google access is encrypted at rest, and everything travels over HTTPS." },
  { icon: "link_off", title: "You’re in control", text: "Disconnect any time from your portal or your Facebook settings." },
  { icon: "policy", title: "Privacy first", text: "Handled under Australia’s Privacy Act. We never sell your data or use it for advertising." },
];

function Icon({ name, className = "", style }: { name: string; className?: string; style?: CSSProperties }) {
  return (
    <span className={`material-symbols-outlined ${className}`} style={style} aria-hidden>
      {name}
    </span>
  );
}

function FacebookTile({ size = 56 }: { size?: number }) {
  return (
    <span className="rounded-2xl flex items-center justify-center shrink-0 shadow-lg" style={{ width: size, height: size, background: "#1877F2" }}>
      <svg viewBox="0 0 24 24" width={size * 0.55} height={size * 0.55} fill="#fff" aria-label="Facebook">
        <path d="M13.5 22v-8h2.7l.4-3.2h-3.1V8.8c0-.9.3-1.5 1.6-1.5h1.7V4.4c-.3 0-1.3-.1-2.5-.1-2.4 0-4.1 1.5-4.1 4.2v2.3H7.5V14h2.7v8h3.3z" />
      </svg>
    </span>
  );
}

function SheetsTile({ size = 56 }: { size?: number }) {
  return (
    <span className="rounded-2xl flex items-center justify-center shrink-0 shadow-lg" style={{ width: size, height: size, background: "#0F9D58" }} aria-label="Google Sheets">
      <Icon name="table_chart" style={{ color: "#fff", fontSize: size * 0.5 }} />
    </span>
  );
}

function SectionHead({ eyebrow, title, text }: { eyebrow: string; title: ReactNode; text?: string }) {
  return (
    <div className="text-center max-w-2xl mx-auto mb-12 landing-reveal">
      <p className="text-xs font-bold uppercase tracking-[0.25em] mb-3" style={{ color: "var(--primary)" }}>
        {eyebrow}
      </p>
      <h2 className="font-heading text-3xl sm:text-4xl font-bold leading-tight" style={{ color: "var(--text-primary)" }}>
        {title}
      </h2>
      {text && (
        <p className="mt-4 text-base" style={{ color: "var(--text-secondary)" }}>
          {text}
        </p>
      )}
    </div>
  );
}

/** Illustrative mock of the Ads tab for the hero. */
function HeroPreview() {
  const bars = [32, 48, 40, 62, 55, 74, 68, 86, 78, 92, 84, 100];
  return (
    <div className="relative landing-fade" style={delay(0.35)}>
      <div className="card rounded-3xl p-5 sm:p-6 shadow-2xl">
        <div className="flex items-center gap-3 mb-5">
          <span className="icon-chip w-10 h-10" style={{ background: "var(--primary-tint)" }}>
            <Icon name="campaign" className="text-[20px]" style={{ color: "var(--primary)" }} />
          </span>
          <div className="min-w-0">
            <p className="font-semibold text-sm" style={{ color: "var(--text-primary)" }}>Your ad account</p>
            <p className="text-xs flex items-center gap-1.5" style={{ color: "var(--text-muted)" }}>
              <span className="landing-pulse w-1.5 h-1.5 rounded-full" style={{ background: "var(--primary)" }} />
              Meta Ads · connected
            </p>
          </div>
          <span className="ml-auto text-[10px] font-semibold uppercase tracking-wider px-2 py-1 rounded-md" style={{ color: "var(--text-muted)", border: "1px solid var(--border)" }}>
            Example
          </span>
        </div>
        <div className="grid grid-cols-3 gap-3 mb-5">
          {[
            ["Ad spend", "$4,280"],
            ["Leads", "126"],
            ["Per lead", "$33.97"],
          ].map(([k, v], i) => (
            <div key={k} className="rounded-xl p-3 landing-fade" style={{ background: "var(--surface)", ...delay(0.6 + i * 0.1) }}>
              <p className="text-[11px]" style={{ color: "var(--text-muted)" }}>{k}</p>
              <p className="font-heading text-lg sm:text-xl font-bold" style={{ color: "var(--text-primary)" }}>{v}</p>
            </div>
          ))}
        </div>
        <div className="flex items-end gap-1.5 h-28" aria-hidden>
          {bars.map((h, i) => (
            <div key={i} className="flex-1 rounded-t-md landing-bar" style={{ height: `${h}%`, background: i === bars.length - 1 ? "var(--secondary)" : "var(--primary)", opacity: 0.35 + (i / bars.length) * 0.65, ...delay(0.8 + i * 0.05) }} />
          ))}
        </div>
      </div>

      <div className="hidden sm:flex absolute -left-8 -top-8 card rounded-2xl px-4 py-3 items-center gap-3 shadow-xl landing-float" style={delay(0)}>
        <FacebookTile size={34} />
        <div>
          <p className="text-xs font-semibold" style={{ color: "var(--text-primary)" }}>Facebook connected</p>
          <p className="text-[11px]" style={{ color: "var(--text-muted)" }}>Read-only · ads_read</p>
        </div>
      </div>
      <div className="hidden sm:flex absolute -right-6 -bottom-6 card rounded-2xl px-4 py-3 items-center gap-3 shadow-xl landing-float" style={delay(1.2)}>
        <SheetsTile size={34} />
        <div>
          <p className="text-xs font-semibold" style={{ color: "var(--text-primary)" }}>Lead sheet synced</p>
          <p className="text-[11px]" style={{ color: "var(--text-muted)" }}>126 leads · just now</p>
        </div>
      </div>
    </div>
  );
}

export default function HomePage() {
  return (
    <div className="min-h-screen overflow-x-hidden" style={{ background: "var(--surface)" }}>
      {/* Nav */}
      <header className="sticky top-0 z-30 backdrop-blur-md" style={{ background: "color-mix(in srgb, var(--surface) 80%, transparent)", borderBottom: "1px solid var(--border)" }}>
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center gap-6">
          <Link href="/" aria-label="The Bakery Academy home">
            <Wordmark size={34} />
          </Link>
          <nav className="hidden md:flex items-center gap-6 ml-auto text-sm font-medium" style={{ color: "var(--text-secondary)" }}>
            <a href="#features" className="hover:opacity-70">What it does</a>
            <a href="#connect" className="hover:opacity-70">How connecting works</a>
            <a href="#enquire" className="hover:opacity-70">Enquire</a>
          </nav>
          <Link href="/login" className="ml-auto md:ml-0 inline-flex items-center gap-1.5 text-sm font-bold px-4 py-2 rounded-xl" style={{ background: "var(--secondary)", color: "#14150f" }}>
            <Icon name="login" className="text-[18px]" />
            Sign in
          </Link>
        </div>
      </header>

      <main>
        {/* Hero */}
        <section className="relative">
          <div className="absolute inset-0 landing-glow" aria-hidden />
          <div className="absolute inset-0 landing-grid" aria-hidden />
          <div className="relative max-w-6xl mx-auto px-4 sm:px-6 pt-16 pb-20 sm:pt-24 sm:pb-28 grid lg:grid-cols-2 gap-14 items-center">
            <div>
              <p className="landing-fade inline-flex items-center gap-2 text-xs font-semibold px-3 py-1.5 rounded-full mb-6" style={{ color: "var(--primary)", background: "var(--primary-tint)" }}>
                <Icon name="lock" className="text-[14px]" />
                Private client portal · invite only
              </p>
              <h1 className="landing-fade font-heading text-4xl sm:text-5xl lg:text-6xl font-bold leading-[1.05] tracking-tight" style={{ color: "var(--text-primary)", ...delay(0.1) }}>
                Your coaching programme, <span style={{ color: "var(--primary)" }}>all in one place.</span>
              </h1>
              <p className="landing-fade mt-6 text-lg max-w-xl" style={{ color: "var(--text-secondary)", ...delay(0.2) }}>
                The Bakery Academy brings your sessions, tasks, course material, leads and ad results together — so you and your coach always know what&apos;s working.
              </p>
              <div className="landing-fade mt-8 flex flex-wrap gap-3" style={delay(0.3)}>
                <Link href="/login" className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-sm shadow-lg transition-transform hover:scale-[1.03]" style={{ background: "var(--secondary)", color: "#14150f" }}>
                  <Icon name="login" className="text-[18px]" />
                  Sign in to your portal
                </Link>
                <a href="#enquire" className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-sm transition-colors hover:bg-[var(--surface-hover)]" style={{ color: "var(--text-primary)", border: "1px solid var(--border-strong)" }}>
                  <Icon name="mail" className="text-[18px]" />
                  Make an enquiry
                </a>
              </div>
            </div>
            <HeroPreview />
          </div>
        </section>

        {/* Invite only */}
        <section className="max-w-6xl mx-auto px-4 sm:px-6 -mt-6 sm:-mt-10 relative">
          <div className="card rounded-3xl p-6 sm:p-8 grid md:grid-cols-[auto_1fr_auto] gap-6 items-center landing-reveal">
            <span className="icon-chip w-14 h-14" style={{ background: "var(--primary-tint)" }}>
              <Icon name="key" className="text-[28px]" style={{ color: "var(--primary)" }} />
            </span>
            <div>
              <h2 className="font-heading text-xl font-bold" style={{ color: "var(--text-primary)" }}>No public sign-up — sign in only</h2>
              <p className="text-sm mt-1" style={{ color: "var(--text-secondary)" }}>
                Accounts are created by your coach when you join the programme. Already a member? Sign in with the email your coach set up for you. Not a member yet? Send us an enquiry and we&apos;ll be in touch.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link href="/login" className="px-4 py-2.5 rounded-xl text-sm font-bold" style={{ background: "var(--secondary)", color: "#14150f" }}>
                Sign in
              </Link>
              <a href="#enquire" className="px-4 py-2.5 rounded-xl text-sm font-semibold" style={{ color: "var(--text-primary)", border: "1px solid var(--border-strong)" }}>
                Enquire
              </a>
            </div>
          </div>
        </section>

        {/* Features */}
        <section id="features" className="max-w-6xl mx-auto px-4 sm:px-6 py-24 scroll-mt-16">
          <SectionHead eyebrow="What it does" title="Everything between sessions, sorted" text="One portal for you and your coach — no more digging through emails, spreadsheets and Ads Manager." />
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {FEATURES.map((f) => (
              <div key={f.title} className="card landing-card landing-reveal rounded-2xl p-6">
                <span className="icon-chip w-12 h-12 mb-4" style={{ background: "var(--primary-tint)" }}>
                  <Icon name={f.icon} className="text-[24px]" style={{ color: "var(--primary)" }} />
                </span>
                <h3 className="font-heading text-lg font-bold" style={{ color: "var(--text-primary)" }}>{f.title}</h3>
                <p className="text-sm mt-2 leading-relaxed" style={{ color: "var(--text-secondary)" }}>{f.text}</p>
              </div>
            ))}
          </div>
        </section>

        {/* How connecting works */}
        <section id="connect" className="scroll-mt-16" style={{ background: "var(--surface-card)", borderTop: "1px solid var(--border)", borderBottom: "1px solid var(--border)" }}>
          <div className="max-w-6xl mx-auto px-4 sm:px-6 py-24">
            <SectionHead
              eyebrow="How connecting works"
              title="Your ads and leads, side by side"
              text="Connect your Facebook ad account and your Google lead sheet once. The portal reads them so you can see what each lead really cost."
            />

            {/* Flow diagram */}
            <div className="landing-reveal flex items-center justify-center gap-3 sm:gap-6 max-w-3xl mx-auto mb-16">
              <div className="flex flex-col items-center gap-2 text-center">
                <FacebookTile size={64} />
                <p className="text-xs font-semibold" style={{ color: "var(--text-primary)" }}>Meta ad account</p>
                <p className="text-[11px]" style={{ color: "var(--text-muted)" }}>spend · clicks</p>
              </div>
              <div className="landing-flow flex-1 min-w-[40px] -mt-12" aria-hidden />
              <div className="flex flex-col items-center gap-2 text-center">
                <span className="rounded-3xl p-2 shadow-xl" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
                  <LogoMark size={72} />
                </span>
                <p className="text-xs font-semibold" style={{ color: "var(--text-primary)" }}>Your portal</p>
                <p className="text-[11px]" style={{ color: "var(--text-muted)" }}>cost per lead</p>
              </div>
              <div className="landing-flow reverse flex-1 min-w-[40px] -mt-12" aria-hidden />
              <div className="flex flex-col items-center gap-2 text-center">
                <SheetsTile size={64} />
                <p className="text-xs font-semibold" style={{ color: "var(--text-primary)" }}>Google Sheet</p>
                <p className="text-[11px]" style={{ color: "var(--text-muted)" }}>leads · sales</p>
              </div>
            </div>

            {/* Steps */}
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
              {STEPS.map((s, i) => (
                <div key={s.title} className="card landing-card landing-reveal rounded-2xl p-6 relative" style={{ background: "var(--surface)" }}>
                  <span className="absolute top-5 right-5 font-heading text-3xl font-bold" style={{ color: "var(--border-strong)" }}>{i + 1}</span>
                  <span className="icon-chip w-11 h-11 mb-4" style={{ background: "var(--primary-tint)" }}>
                    <Icon name={s.icon} className="text-[22px]" style={{ color: "var(--primary)" }} />
                  </span>
                  <h3 className="font-semibold" style={{ color: "var(--text-primary)" }}>{s.title}</h3>
                  <p className="text-sm mt-1.5" style={{ color: "var(--text-secondary)" }}>{s.text}</p>
                </div>
              ))}
            </div>

            {/* Trust */}
            <div className="mt-16 grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {TRUST.map((t) => (
                <div key={t.title} className="flex gap-3 landing-reveal">
                  <Icon name={t.icon} className="text-[22px] mt-0.5 shrink-0" style={{ color: "var(--primary)" }} />
                  <div>
                    <h3 className="font-semibold text-sm" style={{ color: "var(--text-primary)" }}>{t.title}</h3>
                    <p className="text-sm mt-1" style={{ color: "var(--text-secondary)" }}>{t.text}</p>
                  </div>
                </div>
              ))}
            </div>
            <p className="mt-10 text-center text-sm" style={{ color: "var(--text-muted)" }}>
              Read more in our <Link href="/privacy" className="underline" style={{ color: "var(--text-secondary)" }}>Privacy Policy</Link> or see how to{" "}
              <Link href="/data-deletion" className="underline" style={{ color: "var(--text-secondary)" }}>delete your data</Link>.
            </p>
          </div>
        </section>

        {/* Enquiry */}
        <section id="enquire" className="max-w-6xl mx-auto px-4 sm:px-6 py-24 scroll-mt-16">
          <div className="grid lg:grid-cols-[1fr_1.3fr] gap-10 items-start">
            <div className="landing-reveal">
              <p className="text-xs font-bold uppercase tracking-[0.25em] mb-3" style={{ color: "var(--primary)" }}>Enquire</p>
              <h2 className="font-heading text-3xl sm:text-4xl font-bold leading-tight" style={{ color: "var(--text-primary)" }}>
                Interested in joining?
              </h2>
              <p className="mt-4" style={{ color: "var(--text-secondary)" }}>
                Tell us a bit about your business and the Hive team will get back to you. Accounts are set up for you once you join the programme.
              </p>
              <div className="mt-8 space-y-4">
                <a href={`mailto:${LEGAL.email}`} className="flex items-center gap-3 group">
                  <span className="icon-chip w-11 h-11" style={{ background: "var(--primary-tint)" }}>
                    <Icon name="mail" className="text-[20px]" style={{ color: "var(--primary)" }} />
                  </span>
                  <span className="text-sm font-semibold group-hover:underline" style={{ color: "var(--text-primary)" }}>{LEGAL.email}</span>
                </a>
                <a href={LEGAL.phoneHref} className="flex items-center gap-3 group">
                  <span className="icon-chip w-11 h-11" style={{ background: "var(--primary-tint)" }}>
                    <Icon name="call" className="text-[20px]" style={{ color: "var(--primary)" }} />
                  </span>
                  <span className="text-sm font-semibold group-hover:underline" style={{ color: "var(--text-primary)" }}>{LEGAL.phone}</span>
                </a>
              </div>
            </div>
            <div className="card rounded-3xl p-6 sm:p-8 shadow-xl landing-reveal">
              <EnquiryForm />
            </div>
          </div>
        </section>
      </main>

      <footer style={{ borderTop: "1px solid var(--border)" }}>
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10 flex flex-col md:flex-row gap-6 md:items-center md:justify-between">
          <div className="flex items-center gap-4">
            <Wordmark size={30} />
          </div>
          <nav className="flex flex-wrap gap-x-6 gap-y-2 text-sm" style={{ color: "var(--text-secondary)" }}>
            {LEGAL_LINKS.map((l) => (
              <Link key={l.href} href={l.href} className="hover:underline">
                {l.label}
              </Link>
            ))}
            <Link href="/login" className="hover:underline">Sign in</Link>
          </nav>
          <p className="text-xs" style={{ color: "var(--text-muted)" }}>
            © {new Date().getFullYear()} {LEGAL.product}
          </p>
        </div>
      </footer>
    </div>
  );
}
