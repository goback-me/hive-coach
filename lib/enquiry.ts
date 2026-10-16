"use server";

import { headers } from "next/headers";
import { LEGAL } from "@/lib/legal";

// Public enquiry form on the homepage → an email to Hive (Resend: RESEND_API_KEY + EMAIL_FROM,
// the same setup as Hive OS). The visitor's address is set as reply-to so Hive can just hit Reply.

export type EnquiryState = { ok?: boolean; error?: string; fields?: Partial<Record<"name" | "email" | "phone" | "business" | "message", string>> };

// ponytail: in-memory per-IP limit — resets on restart and is per container; move to the DB if spam gets past it.
const recent = new Map<string, number[]>();
function rateLimited(ip: string) {
  const now = Date.now();
  const hits = (recent.get(ip) ?? []).filter((t) => now - t < 60 * 60 * 1000);
  if (hits.length >= 5) return true;
  recent.set(ip, [...hits, now]);
  return false;
}

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
const FAIL = `Sorry, your enquiry couldn't be sent just now. Please try again, or email us at ${LEGAL.email}.`;

export async function sendEnquiry(_prev: EnquiryState, form: FormData): Promise<EnquiryState> {
  const get = (k: string, max: number) => String(form.get(k) ?? "").trim().slice(0, max);
  const line = (k: string, max: number) => get(k, max).replace(/\s+/g, " "); // single-line fields end up in the subject
  const fields = { name: line("name", 120), email: line("email", 200), phone: line("phone", 40), business: line("business", 160), message: get("message", 4000) };

  // Bots fill every field, including this one hidden from people.
  if (get("website", 200)) return { ok: true };

  if (!fields.name) return { error: "Please add your name.", fields };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(fields.email)) return { error: "Please check your email address.", fields };
  if (fields.phone && !/^[+\d][\d\s()-]{5,}$/.test(fields.phone)) return { error: "Please check your phone number.", fields };
  if (fields.message.length < 10) return { error: "Please tell us a little about what you need.", fields };

  const ip = headers().get("x-forwarded-for")?.split(",")[0].trim() || "unknown";
  if (rateLimited(ip)) return { error: `You've sent a few enquiries already — we'll be in touch soon. You can also email ${LEGAL.email}.`, fields };

  const key = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;
  if (!key || !from) {
    console.error("Enquiry not sent: RESEND_API_KEY / EMAIL_FROM aren't set");
    return { error: FAIL, fields };
  }

  const rows: [string, string][] = [
    ["Name", fields.name],
    ["Email", fields.email],
    ["Phone", fields.phone || "—"],
    ["Business", fields.business || "—"],
  ];
  const html = `<div style="font-family:-apple-system,Segoe UI,Helvetica,Arial,sans-serif;color:#14150f;max-width:560px">
<h2 style="margin:0 0 4px">New enquiry from ${LEGAL.site}</h2>
<p style="margin:0 0 16px;color:#6b6b60">Reply to this email to answer ${esc(fields.name)} directly.</p>
<table style="border-collapse:collapse;width:100%;margin-bottom:16px">${rows
    .map(([k, v]) => `<tr><td style="padding:6px 12px 6px 0;color:#6b6b60;width:90px">${k}</td><td style="padding:6px 0;font-weight:600">${esc(v)}</td></tr>`)
    .join("")}</table>
<div style="white-space:pre-wrap;background:#f4f4ef;border-radius:10px;padding:14px 16px;line-height:1.5">${esc(fields.message)}</div>
</div>`;
  const text = `${rows.map(([k, v]) => `${k}: ${v}`).join("\n")}\n\n${fields.message}`;

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from,
        to: [LEGAL.email],
        reply_to: fields.email,
        subject: `Website enquiry: ${fields.name}${fields.business ? ` (${fields.business})` : ""}`,
        html,
        text,
      }),
      cache: "no-store",
    });
    if (!res.ok) {
      console.error("Enquiry email failed:", res.status, await res.text().catch(() => ""));
      return { error: FAIL, fields };
    }
  } catch (e) {
    console.error("Enquiry email failed:", e);
    return { error: FAIL, fields };
  }
  return { ok: true };
}
