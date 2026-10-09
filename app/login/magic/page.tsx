"use client";

import { useEffect, useRef, useState } from "react";
import { useAuth, useSignIn } from "@clerk/nextjs";

// Redeems a magic link (/login/magic?ticket=...) created from Settings → Users.
export default function MagicLoginPage({ searchParams }: { searchParams: { ticket?: string } }) {
  const { signIn, setActive, isLoaded } = useSignIn();
  const { isSignedIn } = useAuth();
  const [error, setError] = useState("");
  const started = useRef(false); // tickets are single-use; StrictMode would run the effect twice

  useEffect(() => {
    if (!isLoaded || started.current) return;
    started.current = true;

    if (!searchParams.ticket) return setError("This link is missing its login code.");
    if (isSignedIn) return setError("You're already signed in. Open this link in a private/incognito window.");

    signIn
      .create({ strategy: "ticket", ticket: searchParams.ticket })
      .then((res) => setActive({ session: res.createdSessionId }))
      .then(() => window.location.assign("/dashboard"))
      .catch(() => setError("This link has expired or was already used. Ask your coach for a new one."));
  }, [isLoaded, isSignedIn, signIn, setActive, searchParams.ticket]);

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: "var(--surface)" }}>
      <p className="text-sm" style={{ color: error ? "var(--danger)" : "var(--text-secondary)" }}>
        {error || "Signing you in..."}
      </p>
    </div>
  );
}
