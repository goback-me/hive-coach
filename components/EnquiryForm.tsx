"use client";

import { useFormState, useFormStatus } from "react-dom";
import { sendEnquiry, type EnquiryState } from "@/lib/enquiry";

const field = "w-full px-4 py-3 rounded-xl text-sm outline-none transition-shadow focus:ring-2 focus:ring-[var(--primary)]";
const fieldStyle = { background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text-primary)" } as const;

function Submit() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full sm:w-auto shrink-0 whitespace-nowrap inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-bold text-sm transition-transform hover:scale-[1.02] disabled:opacity-60 disabled:hover:scale-100"
      style={{ background: "var(--secondary)", color: "#14150f" }}
    >
      <span className="material-symbols-outlined text-[18px]">{pending ? "progress_activity" : "send"}</span>
      {pending ? "Sending…" : "Send enquiry"}
    </button>
  );
}

export default function EnquiryForm() {
  const [state, action] = useFormState<EnquiryState, FormData>(sendEnquiry, {});

  if (state.ok) {
    return (
      <div className="flex flex-col items-center text-center gap-3 py-10" role="status">
        <span className="icon-chip w-14 h-14 landing-pop" style={{ background: "var(--primary-tint)" }}>
          <span className="material-symbols-outlined text-[30px]" style={{ color: "var(--primary)" }}>mark_email_read</span>
        </span>
        <h3 className="font-heading text-2xl font-bold" style={{ color: "var(--text-primary)" }}>Thanks — we&apos;ve got it</h3>
        <p className="text-sm max-w-sm" style={{ color: "var(--text-secondary)" }}>
          Your enquiry is with the Hive team. We&apos;ll reply to the email address you gave us as soon as we can.
        </p>
      </div>
    );
  }

  const f = state.fields ?? {};
  return (
    <form action={action} className="space-y-4" noValidate>
      <div className="grid sm:grid-cols-2 gap-4">
        <label className="block">
          <span className="text-xs font-semibold block mb-1.5" style={{ color: "var(--text-secondary)" }}>Name *</span>
          <input name="name" required autoComplete="name" defaultValue={f.name} className={field} style={fieldStyle} />
        </label>
        <label className="block">
          <span className="text-xs font-semibold block mb-1.5" style={{ color: "var(--text-secondary)" }}>Email *</span>
          <input name="email" type="email" required autoComplete="email" defaultValue={f.email} className={field} style={fieldStyle} />
        </label>
        <label className="block">
          <span className="text-xs font-semibold block mb-1.5" style={{ color: "var(--text-secondary)" }}>Phone</span>
          <input name="phone" type="tel" autoComplete="tel" defaultValue={f.phone} className={field} style={fieldStyle} />
        </label>
        <label className="block">
          <span className="text-xs font-semibold block mb-1.5" style={{ color: "var(--text-secondary)" }}>Business name</span>
          <input name="business" autoComplete="organization" defaultValue={f.business} className={field} style={fieldStyle} />
        </label>
      </div>
      <label className="block">
        <span className="text-xs font-semibold block mb-1.5" style={{ color: "var(--text-secondary)" }}>How can we help? *</span>
        <textarea name="message" required rows={5} defaultValue={f.message} className={`${field} resize-y`} style={fieldStyle} placeholder="Tell us about your business and what you're looking for." />
      </label>
      {/* Honeypot: hidden from people, bots fill it in. */}
      <input name="website" tabIndex={-1} autoComplete="off" aria-hidden className="absolute -left-[9999px] w-px h-px opacity-0" />

      {state.error && (
        <p className="text-sm flex items-start gap-2" role="alert" style={{ color: "var(--danger)" }}>
          <span className="material-symbols-outlined text-[18px] mt-px">error</span>
          {state.error}
        </p>
      )}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:justify-between pt-1">
        <p className="text-xs" style={{ color: "var(--text-muted)" }}>
          We only use these details to reply to you. See our{" "}
          <a href="/privacy" className="underline">
            Privacy Policy
          </a>
          .
        </p>
        <Submit />
      </div>
    </form>
  );
}
