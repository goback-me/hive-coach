import { redirect } from "next/navigation";
import { auth, currentUser } from "@clerk/nextjs/server";
import { SignOutButton } from "@clerk/nextjs";
import { getCurrentUser } from "@/lib/auth";
import { Wordmark } from "@/components/Logo";

export const dynamic = "force-dynamic";

// Signed in to Clerk, but this email has no login in The Bakery yet.
export default async function NoAccessPage() {
  const { userId } = await auth();
  if (!userId) redirect("/login");
  if (await getCurrentUser()) redirect("/dashboard"); // they do have access after all

  const clerkUser = await currentUser();
  const email = clerkUser?.primaryEmailAddress?.emailAddress ?? clerkUser?.emailAddresses[0]?.emailAddress ?? "this account";

  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-6 p-4" style={{ background: "var(--surface)" }}>
      <Wordmark size={48} />
      <div className="card rounded-2xl p-7 max-w-md w-full text-center">
        <span className="material-symbols-outlined text-4xl" style={{ color: "var(--text-muted)" }}>lock_person</span>
        <h1 className="font-heading text-2xl font-bold mt-2" style={{ color: "var(--text-primary)" }}>No access yet</h1>
        <p className="text-sm mt-2" style={{ color: "var(--text-secondary)" }}>
          You&apos;re signed in as <b style={{ color: "var(--text-primary)" }}>{email}</b>, but there&apos;s no login for that email in The Bakery.
        </p>
        <p className="text-sm mt-2" style={{ color: "var(--text-secondary)" }}>
          Ask your coach to add you in <b>Settings → Users</b>, or sign out and use the email they set up for you.
        </p>
        <SignOutButton redirectUrl="/login">
          <button type="button" className="mt-5 w-full px-4 py-2.5 rounded-lg font-bold text-sm" style={{ background: "var(--secondary)", color: "#14150f" }}>
            Sign out and try another email
          </button>
        </SignOutButton>
      </div>
    </div>
  );
}
