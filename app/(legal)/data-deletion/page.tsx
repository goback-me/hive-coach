import Link from "next/link";
import { LegalTitle } from "@/components/Legal";
import { LEGAL } from "@/lib/legal";

export const metadata = { title: `Data deletion · ${LEGAL.product}` };

// This is the "Data Deletion Instructions URL" in the Meta app settings.
export default function DataDeletionPage() {
  const mail = <a href={`mailto:${LEGAL.email}?subject=${encodeURIComponent("Data deletion request")}`}>{LEGAL.email}</a>;
  return (
    <>
      <LegalTitle
        title="Delete your data"
        intro={<>You can remove the Facebook (Meta) data {LEGAL.product} holds about you at any time, or ask us to delete your whole account. Here&apos;s how.</>}
      />

      <div className="legal">
        <h2>What we hold from Facebook</h2>
        <p>
          If you connected Facebook, we store an encrypted access token and the ID and name of the ad account you chose. Ad performance figures (spend, impressions, clicks, leads) are fetched live from Meta and cached for about five minutes; we do not keep a permanent copy. Full details are in our <Link href="/privacy">Privacy Policy</Link>.
        </p>

        <h2>Option 1: Disconnect in {LEGAL.product}</h2>
        <ol>
          <li>Sign in at {LEGAL.site}.</li>
          <li>Open the <strong>Ads</strong> tab.</li>
          <li>Click <strong>Disconnect</strong> and confirm.</li>
        </ol>
        <p>This deletes the stored access token and ad account link straight away. Any cached figures expire within minutes.</p>

        <h2>Option 2: Remove the app from Facebook</h2>
        <ol>
          <li>On Facebook, go to <strong>Settings &amp; privacy → Settings</strong>.</li>
          <li>Open <strong>Apps and websites</strong> (or <strong>Business integrations</strong>, if you connected through a business account).</li>
          <li>Find <strong>{LEGAL.product}</strong> and click <strong>Remove</strong>.</li>
        </ol>
        <p>This stops our access immediately: the token we hold no longer works and we can no longer read your ad data. To have the stored token and account link erased as well, use Option 1 or 3.</p>

        <h2>Option 3: Ask us to delete everything</h2>
        <p>Email {mail} with the subject &quot;Data deletion request&quot;, from the email address you sign in with (so we can confirm it&apos;s you), and tell us your business name. We will:</p>
        <ul>
          <li>confirm we received your request within 5 business days;</li>
          <li>delete your Facebook and Google connections, imported leads, coaching records and your login within 30 days; and</li>
          <li>email you when it&apos;s done.</li>
        </ul>
        <p>We only keep information the law requires us to keep (for example, financial records), and only for as long as required.</p>

        <h2>Questions</h2>
        <p>
          Email {mail} or call <a href={LEGAL.phoneHref}>{LEGAL.phone}</a>—we&apos;re happy to help.
        </p>
      </div>
    </>
  );
}
