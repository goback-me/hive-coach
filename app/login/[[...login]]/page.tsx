import { SignIn } from "@clerk/nextjs";

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: "var(--surface)" }}>
      <SignIn
        path="/login"
        routing="path"
        fallbackRedirectUrl="/dashboard"
        // No self-serve accounts in this app — a coach creates every login
        // from Settings. This just hides the "Sign up" link/footer; the real
        // lock is disabling sign-up in the Clerk dashboard (see README/setup notes).
        appearance={{ elements: { footerAction: "hidden", footer: "hidden" } }}
      />
    </div>
  );
}