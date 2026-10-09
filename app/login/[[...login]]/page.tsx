import { SignIn, SignOutButton } from "@clerk/nextjs";

// Set by middleware.ts when a signed-in Clerk account has no role/client in publicMetadata.
const ERRORS: Record<string, string> = {
  "no-access": "Your account doesn't have access yet. Ask your coach to check your login, then sign in again.",
  "no-client": "Your login isn't linked to a client yet. Ask your coach to fix it, then sign in again.",
};

export default function LoginPage({ searchParams }: { searchParams: { error?: string } }) {
  const error = searchParams.error && ERRORS[searchParams.error];

  return (
    <div className="min-h-screen flex" style={{ background: "var(--surface)" }}>
      {/* Brand panel — hidden on narrow screens, the Apple-Store-style bold
          statement half. Just the app's own --primary token + the existing
          .glow-tile radial gradient, no new colors. */}
      <div
        className="hidden lg:flex lg:w-1/2 flex-col justify-between p-16 relative overflow-hidden"
        style={{ background: "var(--primary)" }}
      >
        <div
          className="absolute inset-0"
          style={{ background: "radial-gradient(circle at 70% 20%, rgba(255,255,255,0.16), transparent 55%)" }}
        />
        <div className="relative">
          <div className="w-11 h-11 rounded-2xl flex items-center justify-center text-white font-bold text-lg" style={{ background: "rgba(255,255,255,0.15)" }}>
            C
          </div>
        </div>
        <div className="relative">
          <h1 className="font-heading font-bold text-white mb-4" style={{ fontSize: "3.25rem", lineHeight: 1.05, letterSpacing: "-0.02em" }}>
            Coach OS
          </h1>
          <p className="text-lg max-w-md" style={{ color: "rgba(255,255,255,0.85)" }}>
            The client command center for coaching businesses — clients, revenue,
            playbooks, and referrals, all in one place.
          </p>
        </div>
        <div className="relative text-sm" style={{ color: "rgba(255,255,255,0.6)" }}>
          © {new Date().getFullYear()} Coach OS
        </div>
      </div>

      {/* Form panel */}
      <div className="flex-1 flex items-center justify-center p-6">
        {/* Signed-in-but-no-role users get bounced here; <SignIn> renders nothing for them, so give them a way out. */}
        {error ? (
          <div className="max-w-sm text-center space-y-4">
            <p className="text-sm" style={{ color: "var(--text-primary)" }}>{error}</p>
            <SignOutButton redirectUrl="/login">
              <button className="px-4 py-2 rounded-lg text-sm font-bold" style={{ background: "var(--primary)", color: "#fff" }}>
                Sign out
              </button>
            </SignOutButton>
          </div>
        ) : (
        <SignIn
          path="/login"
          routing="path"
          fallbackRedirectUrl="/dashboard"
          // No self-serve accounts in this app — a coach creates every login
          // from Settings. This just hides the "Sign up" link/footer; the real
          // lock is disabling sign-up in the Clerk dashboard (see README/setup notes).
          appearance={{
            variables: {
              colorPrimary: "#0071E3",
              colorText: "#1D1D1F",
              colorTextSecondary: "#86868B",
              colorBackground: "#ffffff",
              colorInputBackground: "#ffffff",
              colorInputText: "#1D1D1F",
              borderRadius: "0.75rem",
              fontFamily: "\"Inter\", \"SF Pro Text\", \"SF Pro Icons\", \"Helvetica Neue\", Helvetica, Arial, sans-serif",
            },
            elements: {
              footerAction: "hidden",
              footer: "hidden",
              card: "shadow-none border border-[#D2D2D7]",
            },
          }}
        />
        )}
      </div>
    </div>
  );
}
