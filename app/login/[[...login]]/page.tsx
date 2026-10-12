import { SignIn } from "@clerk/nextjs";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { Wordmark } from "@/components/Logo";

export default async function LoginPage() {
  // Already signed in: Clerk's sign-in box renders nothing, so don't show a blank page.
  const { userId } = await auth();
  if (userId) redirect((await getCurrentUser()) ? "/dashboard" : "/no-access");

  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-6 p-4" style={{ background: "var(--surface)" }}>
      <Wordmark size={48} />
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