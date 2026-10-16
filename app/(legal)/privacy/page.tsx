import Link from "next/link";
import { LegalTitle } from "@/components/Legal";
import { LEGAL } from "@/lib/legal";

export const metadata = { title: `Privacy Policy · ${LEGAL.product}` };

// Every statement here must stay true of the code: what we read from Meta/Google
// (lib/meta-ads.ts, lib/google-sheets.ts), what we store (prisma/schema.prisma) and
// how disconnecting works (lib/actions.ts). Change the code → update this page.
export default function PrivacyPage() {
  const mail = <a href={`mailto:${LEGAL.email}`}>{LEGAL.email}</a>;
  return (
    <>
      <LegalTitle
        title="Privacy Policy"
        intro={
          <>
            {LEGAL.product} ({LEGAL.site}) (&quot;we&quot;, &quot;us&quot;) is a client portal for coaching programmes. This policy explains what information we collect, how we use it, and the choices you have. We handle personal information in line with the <em>Privacy Act 1988</em> (Cth) and the Australian Privacy Principles.
          </>
        }
      />

      <div className="legal">
        <h2>1. Information we collect</h2>
        <h3>Account information</h3>
        <p>Your name, email address and role (coach or client). Sign-in is handled by our authentication provider, Clerk; we never see or store your password.</p>

        <h3>Coaching information</h3>
        <p>Information your coach or you add to the portal, such as session dates and notes, tasks and comments, weekly call summaries and next steps, onboarding and course progress, awards, and payment schedules (amounts and due dates only — we do not collect or store card or bank details).</p>

        <h3>Lead information from Google Sheets (only if you connect it)</h3>
        <p>If you connect a Google account and choose a spreadsheet, we read that sheet to show your leads and sales progress. This can include the names, email addresses and phone numbers of your leads, their status, and the values in the sheet&apos;s columns. Access is read-only: we never edit your sheet. We also receive the email address of the Google account you connect.</p>

        <h3>Advertising information from Meta (only if you connect it)</h3>
        <p>
          If you choose <strong>Connect with Facebook</strong>, Meta asks you to grant us the <strong>ads_read</strong> permission. With it we read, for the ad accounts you select:
        </p>
        <ul>
          <li>the list of ad accounts your Facebook login can access (account ID, name, currency and status), so you can choose which one to show;</li>
          <li>campaign names and statuses; and</li>
          <li>performance figures: amount spent, impressions, clicks and lead results.</li>
        </ul>
        <p>
          We store only an encrypted access token and the ID and name of the ad account you selected. Performance figures are requested from Meta when you view them and kept in a short-lived server cache (about five minutes) so the page loads quickly; we do not keep a permanent copy. The permission is read-only: we cannot create, edit, pause or pay for ads. We do not read your Facebook profile content, posts, friends, messages or Pages.
        </p>

        <h3>Enquiries</h3>
        <p>If you send an enquiry from our website, we receive your name, email address, and any phone number, business name and message you include. We use them only to reply to you, and the enquiry is delivered to our team by email through our email provider, Resend.</p>

        <h3>Referrals</h3>
        <p>When someone is referred to the programme — through a client&apos;s referral link or by a client adding them — we collect the name, phone number or email address, and any note provided, so the coach can get in touch. Please only refer people who are happy to be contacted.</p>

        <h3>Website analytics (only if your coach turns it on)</h3>
        <p>If website tracking is enabled for your business, we show visit and enquiry statistics for your website, collected by our analytics tool from a script you add to your site. You are responsible for telling your own website visitors about this in your website&apos;s privacy policy.</p>

        <h3>Technical information</h3>
        <p>We use cookies that are strictly necessary for sign-in, security, and to protect the Facebook and Google connection steps. Your light/dark theme choice is saved in your browser. Our servers record standard logs (such as IP address, browser type and error details) for security and troubleshooting. We do not use advertising or cross-site tracking cookies.</p>

        <h2>2. How we use information</h2>
        <ul>
          <li>To provide the portal to you and your coach — for example, showing your ad spend next to the leads and sales from your sheet so you can see your cost per lead.</li>
          <li>To keep the service secure, prevent misuse, and fix problems.</li>
          <li>To contact you about your account or important changes to the service.</li>
          <li>To meet our legal obligations.</li>
        </ul>
        <p>We do not sell personal information, and we do not use it for advertising.</p>

        <h2>3. Meta (Facebook) data</h2>
        <p>Data we receive from Meta is used only to show you and your coach the advertising performance of the ad account you connected, inside {LEGAL.product}. We do not sell, license or share it with anyone else; we do not use it for advertising, profiling or to build data about individuals; and we do not transfer it to data brokers or other third parties. We handle it in line with the Meta Platform Terms.</p>

        <h2>4. Google user data</h2>
        <p>
          We request read-only access to your spreadsheets and your Google account&apos;s email address, and use it only to show your leads in {LEGAL.product}. {LEGAL.product}&apos;s use and transfer of information received from Google APIs adheres to the{" "}
          <a href="https://developers.google.com/terms/api-services-user-data-policy" target="_blank" rel="noreferrer">
            Google API Services User Data Policy
          </a>
          , including the Limited Use requirements. We do not use Google user data for advertising, we do not sell it, and people do not read it unless you ask us to (for support), it is needed for security, or the law requires it.
        </p>

        <h2>5. Who can see your information</h2>
        <p>Inside the portal, a client can see only their own information. Coaches in the programme can see the information of the clients they coach.</p>
        <p>Outside the portal, we share information only with service providers that help us run it, and only as needed for that purpose: our authentication provider (Clerk), our email provider (Resend), our hosting and database providers, and Meta and Google when we fetch the data you authorised. We may also disclose information if the law requires it, or to protect the rights and safety of our users or others.</p>

        <h2>6. Storage outside Australia</h2>
        <p>Some of our service providers store or process information outside Australia, including in the United States. We take reasonable steps to make sure they protect it in a way consistent with the Australian Privacy Principles.</p>

        <h2>7. Security</h2>
        <p>Facebook and Google access tokens are encrypted at rest (AES-256-GCM), all traffic uses HTTPS, and access inside the portal is limited by role. No system is completely secure, but we work to protect your information and will notify you and the regulator if a data breach is likely to cause you serious harm, as the law requires.</p>

        <h2>8. How long we keep information</h2>
        <ul>
          <li><strong>Meta:</strong> the access token and ad account link are deleted as soon as you disconnect. Cached figures expire within minutes.</li>
          <li><strong>Google:</strong> the connection is deleted as soon as you disconnect it. Leads already imported stay until the sheet is disconnected or you ask us to delete them.</li>
          <li><strong>Everything else:</strong> kept while your account is active, then deleted within 30 days of a deletion request or the end of your programme — except records we must keep by law (for example, financial records), which we keep only as long as required.</li>
        </ul>

        <h2>9. Your choices and rights</h2>
        <ul>
          <li>You can disconnect Facebook or Google at any time from your portal.</li>
          <li>You can remove our access from your Facebook settings (<strong>Settings &amp; privacy → Settings → Apps and websites</strong>, or <strong>Business integrations</strong>) or your Google account (<strong>Security → Your connections to third-party apps &amp; services</strong>).</li>
          <li>You can ask to access, correct or delete your personal information by emailing {mail}. We will respond within 30 days.</li>
        </ul>
        <p>
          See <Link href="/data-deletion">Data deletion</Link> for step-by-step instructions.
        </p>

        <h2>10. Children</h2>
        <p>{LEGAL.product} is for business owners and their coaches. It is not intended for anyone under 18.</p>

        <h2>11. Complaints</h2>
        <p>
          If you have a concern about how we handle your information, email {mail} and we will respond within 30 days. If you are not satisfied with our response, you can contact the Office of the Australian Information Commissioner at{" "}
          <a href="https://www.oaic.gov.au" target="_blank" rel="noreferrer">
            oaic.gov.au
          </a>
          .
        </p>

        <h2>12. Changes to this policy</h2>
        <p>We may update this policy as the service changes. The date at the top shows the latest version. If a change materially affects how we use your information, we will tell you before it takes effect.</p>

        <h2>13. Contact us</h2>
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
