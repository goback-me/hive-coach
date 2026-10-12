"use client";

import { useEffect, useState } from "react";
import { submitClientReferral } from "@/lib/actions";
import { REFERRAL_REWARD } from "@/lib/client-tabs";

type ReferralRow = { id: string; name: string; stage: string };

const STAGE_LABELS: Record<string, string> = {
  INTRODUCED: "Introduced",
  REACHED_OUT: "Reached out",
  IN_CONVERSATION: "In conversation",
  CALL_BOOKED: "Call booked",
  CALL_DONE: "Call done",
  WON: "Signed up",
};

const inputStyle = { background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text-primary)" };

// The client's Referrals tab: the reward, a form to refer someone, their link, and how their referrals are going.
export default function ClientReferralPanel({ clientId, code, referrals }: { clientId: string; code: string; referrals: ReferralRow[] }) {
  const [form, setForm] = useState({ name: "", phone: "", email: "", note: "" });
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, setPending] = useState(false);
  const [origin, setOrigin] = useState("");
  const [copied, setCopied] = useState(false);
  useEffect(() => setOrigin(window.location.origin), []);

  const link = `${origin}/refer/${code}`;
  const won = referrals.filter((r) => r.stage === "WON");

  async function submit() {
    setPending(true);
    setMsg(null);
    const r = await submitClientReferral(clientId, form);
    setPending(false);
    if (r.error) return setMsg({ ok: false, text: r.error });
    setMsg({ ok: true, text: `Thanks — we'll reach out to ${form.name.trim()} and keep you posted here.` });
    setForm({ name: "", phone: "", email: "", note: "" });
  }

  return (
    <div className="space-y-5 max-w-[900px]">
      <div className="rounded-2xl p-6 flex items-center gap-4" style={{ background: "var(--primary-tint)", border: "1px solid var(--primary)" }}>
        <span className="material-symbols-outlined text-4xl" style={{ color: "var(--primary)" }}>redeem</span>
        <div>
          <p className="font-heading text-2xl font-bold" style={{ color: "var(--text-primary)" }}>Refer someone, get {REFERRAL_REWARD.headline}</p>
          <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
            {REFERRAL_REWARD.headline} {REFERRAL_REWARD.detail}.
          </p>
        </div>
      </div>

      {won.length > 0 && (
        <div className="card rounded-2xl p-5 flex items-center gap-3">
          <span className="material-symbols-outlined text-3xl" style={{ color: "var(--primary)" }}>celebration</span>
          <div>
            <p className="font-heading font-bold" style={{ color: "var(--text-primary)" }}>
              {won.length === 1 ? "Your referral signed up!" : `${won.length} of your referrals signed up!`}
            </p>
            <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
              Thank you — {won.map((r) => r.name).join(", ")}. Your {REFERRAL_REWARD.headline} is on its way.
            </p>
          </div>
        </div>
      )}

      <div className="card rounded-2xl p-5 space-y-3">
        <div>
          <h3 className="font-heading text-xl font-bold" style={{ color: "var(--text-primary)" }}>Refer someone</h3>
          <p className="text-sm" style={{ color: "var(--text-secondary)" }}>Know someone who&apos;d get a lot out of the program? Pop their details in — we&apos;ll take it from here.</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
          <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Name / business *" aria-label="Name or business" className="px-3 py-2 rounded-lg text-sm outline-none" style={inputStyle} />
          <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="Phone" type="tel" aria-label="Phone" className="px-3 py-2 rounded-lg text-sm outline-none" style={inputStyle} />
          <input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="Email" type="email" aria-label="Email" className="px-3 py-2 rounded-lg text-sm outline-none" style={inputStyle} />
        </div>
        <textarea value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} rows={2} placeholder="Anything we should know? (what they do, best time to call…)" aria-label="Note" className="w-full px-3 py-2 rounded-lg text-sm outline-none resize-none" style={inputStyle} />
        <div className="flex items-center gap-3">
          <button
            onClick={submit}
            disabled={pending || !form.name.trim() || (!form.phone.trim() && !form.email.trim())}
            className="px-4 py-2 rounded-lg text-sm font-bold disabled:opacity-50"
            style={{ background: "var(--secondary)", color: "#14150f" }}
          >
            {pending ? "Sending…" : "Send referral"}
          </button>
          {msg && <p className="text-sm" style={{ color: msg.ok ? "var(--primary)" : "var(--danger)" }}>{msg.text}</p>}
        </div>
      </div>

      <div className="card rounded-2xl p-5">
        <h3 className="font-heading text-xl font-bold mb-1" style={{ color: "var(--text-primary)" }}>Your referral link</h3>
        <p className="text-sm mb-4" style={{ color: "var(--text-secondary)" }}>Share it anywhere — anyone who fills it in is tracked as your referral.</p>
        <div className="flex items-center gap-2">
          <div className="flex-1 px-3 py-2 rounded-lg text-sm truncate" style={inputStyle}>{link || " "}</div>
          <button
            onClick={() => {
              navigator.clipboard.writeText(link);
              setCopied(true);
              setTimeout(() => setCopied(false), 1500);
            }}
            className="px-4 py-2 rounded-lg text-sm font-bold shrink-0"
            style={{ background: "var(--primary)", color: "#0d0d0b" }}
          >
            {copied ? "Copied!" : "Copy link"}
          </button>
        </div>
      </div>

      <div className="card rounded-2xl p-5">
        <h4 className="font-heading font-bold mb-3" style={{ color: "var(--text-primary)" }}>Your referrals</h4>
        {referrals.length === 0 ? (
          <p className="text-sm" style={{ color: "var(--text-secondary)" }}>No referrals yet — share your link or refer someone above.</p>
        ) : (
          <div className="space-y-2">
            {referrals.map((r) => (
              <div key={r.id} className="flex items-center justify-between rounded-lg p-3" style={{ background: "var(--surface-hover)" }}>
                <p className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>{r.name}</p>
                <span
                  className="px-2 py-1 rounded-full text-xs font-bold"
                  style={r.stage === "WON" ? { background: "var(--primary-tint)", color: "var(--primary)" } : { background: "var(--surface-card)", color: "var(--text-secondary)" }}
                >
                  {STAGE_LABELS[r.stage] ?? r.stage}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
