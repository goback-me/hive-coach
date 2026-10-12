"use client";

import { useFormState } from "react-dom";
import { useState } from "react";
import { createMagicLoginToken, createUser, deleteUser, updateUser } from "@/lib/actions";

type UserRow = {
  id: string;
  name: string;
  email: string;
  role: "COACH" | "CLIENT";
  clientName: string | null;
};

type ClientOption = { id: string; name: string };

type CreateUserState = { email: string; tempPassword: string } | { error: string } | null;

async function createUserAction(_prev: CreateUserState, formData: FormData): Promise<CreateUserState> {
  try {
    const result = await createUser(formData);
    return result;
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Something went wrong" };
  }
}

export default function UsersPanel({ users, clients }: { users: UserRow[]; clients: ClientOption[] }) {
  const [state, formAction] = useFormState(createUserAction, null);
  const [role, setRole] = useState<"CLIENT" | "COACH">("CLIENT");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);

  async function copyMagicLink(userId: string) {
    try {
      const ticket = await createMagicLoginToken(userId);
      await navigator.clipboard.writeText(`${window.location.origin}/login/magic?ticket=${encodeURIComponent(ticket)}`);
      setCopiedId(userId);
    } catch (e) {
      alert(e instanceof Error ? e.message : "Couldn't create magic link");
    }
  }

  return (
    <section className="card rounded-2xl p-6">
      <h3 className="font-heading font-bold text-lg mb-1" style={{ color: "var(--text-primary)" }}>
        Users & logins
      </h3>
      <p className="text-sm mb-4" style={{ color: "var(--text-secondary)" }}>
        Coaches see every client. Client logins only ever see their own data.
      </p>

      <div className="space-y-2 mb-5">
        {users.map((u) =>
          editingId === u.id ? (
            <EditUserRow key={u.id} user={u} onDone={() => setEditingId(null)} />
          ) : (
          <div key={u.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg p-3" style={{ background: "var(--surface)" }}>
            <div>
              <p className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>
                {u.name} <span style={{ color: "var(--text-muted)" }}>· {u.email}</span>
              </p>
              <p className="text-xs" style={{ color: "var(--text-secondary)" }}>
                {u.role === "COACH" ? "Coach (full access)" : `Client · ${u.clientName ?? "—"}`}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setEditingId(u.id)}
                className="text-xs font-semibold px-3 py-1.5 rounded-lg"
                style={{ color: "var(--text-primary)", border: "1px solid var(--border-strong)" }}
              >
                Edit
              </button>
              <button
                type="button"
                onClick={() => copyMagicLink(u.id)}
                title="Single-use login link, valid 7 days"
                className="text-xs font-semibold px-3 py-1.5 rounded-lg"
                style={{ color: "var(--text-primary)", border: "1px solid var(--border-strong)" }}
              >
                {copiedId === u.id ? "Link copied!" : "Copy magic link"}
              </button>
              <form action={deleteUser.bind(null, u.id)}>
                <button
                  type="submit"
                  className="text-xs font-semibold px-3 py-1.5 rounded-lg"
                  style={{ color: "var(--danger)", border: "1px solid var(--border-strong)" }}
                >
                  Remove
                </button>
              </form>
            </div>
          </div>
        ))}
        {users.length === 0 && <p className="text-sm" style={{ color: "var(--text-secondary)" }}>No users yet.</p>}
      </div>

      {state && "tempPassword" in state && (
        <div
          className="mb-4 px-4 py-3 rounded-lg text-sm space-y-1"
          style={{ background: "rgba(163,230,53,0.15)", color: "var(--text-primary)" }}
        >
          <p className="font-semibold">Login created for {state.email}</p>
          <p>
            Temporary password: <code className="font-mono font-bold">{state.tempPassword}</code>
          </p>
          <p className="text-xs" style={{ color: "var(--text-secondary)" }}>
            Copy this now — it won't be shown again. Send it to them securely and have them sign in at /login.
          </p>
        </div>
      )}
      {state && "error" in state && (
        <div className="mb-4 px-4 py-3 rounded-lg text-sm" style={{ background: "rgba(248,113,113,0.15)", color: "var(--danger)" }}>
          {state.error}
        </div>
      )}

      <form action={formAction} className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <input
          name="name" required placeholder="Full name"
          style={{ background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text-primary)" }}
          className="px-3 py-2 rounded-lg outline-none text-sm"
        />
        <input
          name="email" type="email" required placeholder="Email"
          style={{ background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text-primary)" }}
          className="px-3 py-2 rounded-lg outline-none text-sm"
        />
        <select
          name="role" value={role} onChange={(e) => setRole(e.target.value as "CLIENT" | "COACH")}
          style={{ background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text-primary)" }}
          className="px-3 py-2 rounded-lg outline-none text-sm"
        >
          <option value="CLIENT">Client (their data only)</option>
          <option value="COACH">Coach (full access)</option>
        </select>
        {role === "CLIENT" ? (
          <select
            name="clientId" required
            style={{ background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text-primary)" }}
            className="px-3 py-2 rounded-lg outline-none text-sm"
          >
            <option value="">Choose a client...</option>
            {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        ) : (
          <div />
        )}
        <button
          type="submit"
          className="sm:col-span-2 px-4 py-2 rounded-lg text-sm font-bold"
          style={{ background: "var(--primary)", color: "#0d0d0b" }}
        >
          Create login
        </button>
      </form>
    </section>
  );
}
// Inline edit of a login's name and email (Clerk is updated too).
function EditUserRow({ user, onDone }: { user: UserRow; onDone: () => void }) {
  const [name, setName] = useState(user.name);
  const [email, setEmail] = useState(user.email);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const input = { background: "var(--surface-card)", border: "1px solid var(--border)", color: "var(--text-primary)" };

  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        setSaving(true);
        setError(null);
        const r = await updateUser(user.id, name, email);
        setSaving(false);
        if (r.error) setError(r.error);
        else onDone();
      }}
      className="rounded-lg p-3 space-y-2"
      style={{ background: "var(--surface)", border: "1px solid var(--border-strong)" }}
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <input value={name} onChange={(e) => setName(e.target.value)} required placeholder="Full name" style={input} className="px-3 py-2 rounded-lg outline-none text-sm" />
        <input value={email} onChange={(e) => setEmail(e.target.value)} required type="email" placeholder="Email" style={input} className="px-3 py-2 rounded-lg outline-none text-sm" />
      </div>
      <p className="text-xs" style={{ color: "var(--text-muted)" }}>
        {user.role === "COACH" ? "Coach" : `Client · ${user.clientName ?? "—"}`} — changing the email changes the address they sign in with.
      </p>
      {error && <p className="text-xs" style={{ color: "var(--danger)" }}>{error}</p>}
      <div className="flex justify-end gap-2">
        <button type="button" onClick={onDone} className="px-3 py-1.5 rounded-lg text-xs font-semibold" style={{ color: "var(--text-secondary)", border: "1px solid var(--border-strong)" }}>
          Cancel
        </button>
        <button type="submit" disabled={saving} className="px-3 py-1.5 rounded-lg text-xs font-bold disabled:opacity-60" style={{ background: "var(--secondary)", color: "#14150f" }}>
          {saving ? "Saving…" : "Save"}
        </button>
      </div>
    </form>
  );
}
