import Link from "next/link";
import { LegalTitle } from "@/components/Legal";
import { LEGAL } from "@/lib/legal";

export const metadata = { title: `Terms of Service · ${LEGAL.product}` };

// Kept balanced on purpose: one-sided terms in a standard-form contract can be void
// (and penalised) under Australia's unfair contract terms laws.
export default function TermsPage() {
  const mail = <a href={`mailto:${LEGAL.email}`}>{LEGAL.email}</a>;
  return (
    <>
      <LegalTitle
        title="Terms of Service"
        intro={
          <>
            These terms apply to your use of {LEGAL.product} ({LEGAL.site}) (&quot;we&quot;, &quot;us&quot;). By signing in, you agree to them. If you use {LEGAL.product} for a business, you confirm you are authorised to accept these terms for it.
          </>
        }
      />

      <div className="legal">
        <h2>1. The service</h2>
        <p>{LEGAL.product} is a client portal for people taking part in our coaching programmes. It shows your coaching sessions, tasks, course material and progress and, if you choose to connect them, information from your Google Sheets and your Meta ad account. Access is by invitation only.</p>

        <h2>2. Your account</h2>
        <ul>
          <li>Keep your sign-in details secure and don&apos;t share your account.</li>
          <li>You are responsible for activity under your account that you authorise or that results from you not keeping it secure.</li>
          <li>Tell us promptly at {mail} if you think someone has used your account without permission.</li>
        </ul>

        <h2>3. Connecting Facebook and Google</h2>
        <ul>
          <li>Connecting is optional. You can disconnect at any time from your portal.</li>
          <li>You may only connect accounts you own or are authorised to use, and you are responsible for having permission to share the data in them (for example, the contact details of your leads).</li>
          <li>Access is read-only. We never post, change, pause or spend money on your ads, and we never edit your spreadsheets.</li>
          <li>Meta and Google provide their own services under their own terms. We are not responsible for their availability, or for changes they make to the data they provide.</li>
        </ul>
        <p>
          How we handle this data is explained in our <Link href="/privacy">Privacy Policy</Link>.
        </p>

        <h2>4. Acceptable use</h2>
        <p>You must not:</p>
        <ul>
          <li>use the service for anything unlawful, or to upload anything you don&apos;t have the right to share;</li>
          <li>try to access other users&apos; accounts or data, or get around security or access controls;</li>
          <li>interfere with or overload the service, or upload malicious code; or</li>
          <li>copy, resell or reverse-engineer the service.</li>
        </ul>

        <h2>5. Your information</h2>
        <p>You keep ownership of the information you add or connect. You allow us to store and process it only as needed to provide the service to you and your coach, as described in our <Link href="/privacy">Privacy Policy</Link>.</p>

        <h2>6. Our content</h2>
        <p>Course lessons, templates and other material we provide remain ours (or our licensors&apos;). You may use them for your own business while you have access. Please don&apos;t republish or resell them.</p>

        <h2>7. Figures and advice</h2>
        <p>Ad spend, lead and sales figures come from Meta, Google and the information you provide. They may be delayed, or differ slightly from what Meta Ads Manager shows (for example, because of time zones or Meta updating its numbers). Use them as a guide. The portal does not give financial, legal or tax advice, and we can&apos;t guarantee any particular business result.</p>

        <h2>8. Fees</h2>
        <p>Access to the portal is part of your coaching programme. Fees, inclusions and refunds are set out in your coaching agreement with us. If anything in these terms conflicts with that agreement, the agreement applies.</p>

        <h2>9. Changes and availability</h2>
        <p>We work to keep the service available but may need to pause it for maintenance or updates. We may improve or change features over time. If we make a change that materially affects you, we will give you reasonable notice, and you can stop using the service if you don&apos;t agree.</p>

        <h2>10. Suspension and ending access</h2>
        <p>You can stop using the service at any time and ask us to delete your information (see <Link href="/data-deletion">Data deletion</Link>). We may suspend or end your access if you seriously or repeatedly breach these terms, if your coaching programme ends, or if we must do so by law. Where reasonable, we will tell you first and give you a chance to fix the issue.</p>

        <h2>11. Your consumer rights</h2>
        <p>Nothing in these terms excludes, restricts or changes any right or remedy you have under the Australian Consumer Law or any other law that cannot be excluded. Where the law allows us to limit our liability for failing to meet a consumer guarantee, our liability is limited to supplying the services again or paying the cost of having them supplied again.</p>

        <h2>12. Limitation of liability</h2>
        <p>To the extent the law allows, and subject to section 11, we are not liable for indirect or consequential loss, or for loss of profits or revenue, arising from your use of the service. Our total liability to you in connection with the service is limited to the fees you paid us in the three months before the event giving rise to the claim. This limit does not apply to liability that cannot lawfully be limited, or to loss caused by our fraud or wilful misconduct.</p>

        <h2>13. Changes to these terms</h2>
        <p>We may update these terms. The date at the top shows the latest version. We will tell you about material changes before they take effect.</p>

        <h2>14. Governing law</h2>
        <p>These terms are governed by the laws in force in Australia. You and we can bring proceedings in any Australian court that has jurisdiction.</p>

        <h2>15. Contact us</h2>
        <p>
          {LEGAL.product}
          <br />
          Email: {mail}
          <br />
          Phone: <a href={LEGAL.phoneHref}>{LEGAL.phone}</a>
        </p>
      </div>
    </>
  );
}
