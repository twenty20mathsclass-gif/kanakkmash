import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Terms & Conditions | kanakkmash',
  description:
    'Terms and Conditions for using kanakkmash — our online mathematics education platform. Read about your rights, obligations, and the rules governing use of Google API integrations.',
};

export const dynamic = 'force-static';

const EFFECTIVE_DATE = 'June 23, 2025';
const CONTACT_EMAIL = 'support@kanakkmash.com';
const SITE_URL = 'https://www.kanakkmash.com';

export default function TermsAndConditionsPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Hero */}
      <div className="bg-gradient-to-br from-accent/10 via-primary/5 to-background border-b border-border">
        <div className="container mx-auto px-4 py-16 md:py-20 max-w-4xl">
          <p className="text-sm font-medium text-primary uppercase tracking-widest mb-3">
            Legal
          </p>
          <h1 className="text-4xl md:text-5xl font-headline font-bold text-foreground mb-4">
            Terms &amp; Conditions
          </h1>
          <p className="text-muted-foreground text-lg">
            Effective Date:{' '}
            <span className="font-medium text-foreground">{EFFECTIVE_DATE}</span>
          </p>
          <p className="mt-4 text-muted-foreground max-w-2xl">
            Please read these Terms and Conditions carefully before using{' '}
            <a
              href={SITE_URL}
              className="text-primary underline underline-offset-4 hover:text-primary/80 transition-colors"
            >
              {SITE_URL}
            </a>{' '}
            (the &quot;Platform&quot;) operated by <strong>kanakkmash</strong> (&quot;we&quot;,
            &quot;us&quot;, or &quot;our&quot;). By accessing or using our Platform, you agree to
            be bound by these terms.
          </p>
        </div>
      </div>

      {/* TOC */}
      <div className="container mx-auto px-4 py-10 max-w-4xl">
        <div className="bg-card border border-border rounded-2xl p-6 mb-10 shadow-sm">
          <h2 className="text-lg font-headline font-semibold text-foreground mb-4">
            Table of Contents
          </h2>
          <ol className="space-y-2 text-sm text-primary">
            {[
              ['#acceptance', 'Acceptance of Terms'],
              ['#eligibility', 'Eligibility'],
              ['#accounts', 'User Accounts'],
              ['#services', 'Our Services'],
              ['#google-apis', 'Google API Integrations'],
              ['#user-conduct', 'User Conduct'],
              ['#intellectual-property', 'Intellectual Property'],
              ['#payments', 'Payments & Refunds'],
              ['#disclaimer', 'Disclaimer of Warranties'],
              ['#liability', 'Limitation of Liability'],
              ['#termination', 'Termination'],
              ['#governing-law', 'Governing Law'],
              ['#changes', 'Changes to These Terms'],
              ['#contact', 'Contact Us'],
            ].map(([href, label]) => (
              <li key={href}>
                <a
                  href={href}
                  className="hover:underline underline-offset-4 hover:text-primary/80 transition-colors"
                >
                  {label}
                </a>
              </li>
            ))}
          </ol>
        </div>

        <div className="space-y-12">
          {/* 1 */}
          <Section id="acceptance" title="1. Acceptance of Terms">
            <p>
              By accessing or using the kanakkmash Platform, you confirm that you have read,
              understood, and agree to be bound by these Terms and Conditions and our{' '}
              <Link
                href="/privacy-policy"
                className="text-primary underline underline-offset-4 hover:text-primary/80"
              >
                Privacy Policy
              </Link>
              , which is incorporated herein by reference. If you do not agree to these terms, you
              must not use our Platform.
            </p>
          </Section>

          {/* 2 */}
          <Section id="eligibility" title="2. Eligibility">
            <p>
              You may use the Platform if you are at least 13 years of age. Users under 18 years
              of age must have the consent of a parent or legal guardian. By using the Platform, you
              represent and warrant that you meet these eligibility requirements and that all
              information you provide is accurate and complete.
            </p>
            <p>
              Parents and guardians who register on behalf of a minor are fully responsible for the
              minor&apos;s use of the Platform and agree to these Terms on the minor&apos;s behalf.
            </p>
          </Section>

          {/* 3 */}
          <Section id="accounts" title="3. User Accounts">
            <Subheading>3.1 Registration</Subheading>
            <p>
              To access most features of the Platform, you must create an account. You agree to
              provide accurate, current, and complete information and to update it as necessary.
            </p>
            <Subheading>3.2 Account Security</Subheading>
            <p>
              You are responsible for maintaining the confidentiality of your account credentials.
              You must notify us immediately at{' '}
              <a
                href={`mailto:${CONTACT_EMAIL}`}
                className="text-primary underline underline-offset-4"
              >
                {CONTACT_EMAIL}
              </a>{' '}
              if you suspect any unauthorised access to your account. We are not liable for losses
              arising from unauthorised use of your account.
            </p>
            <Subheading>3.3 One Account per User</Subheading>
            <p>
              Each person may maintain only one active account. Creating duplicate or fraudulent
              accounts is prohibited and may result in termination of all associated accounts.
            </p>
          </Section>

          {/* 4 */}
          <Section id="services" title="4. Our Services">
            <p>
              kanakkmash provides an online mathematics education platform that includes:
            </p>
            <ul>
              <li>Scheduled live classes via Google Meet for students from Class 1 to degree level.</li>
              <li>Course materials, assignments, and assessments.</li>
              <li>Study notes and reminders via Google Keep integration.</li>
              <li>Progress tracking and performance analytics.</li>
              <li>Competitive exam preparation modules (LSS, USS, NMMS, NTSE, PSC, KTET, etc.).</li>
            </ul>
            <p>
              We reserve the right to modify, suspend, or discontinue any part of our services at
              any time with reasonable prior notice where feasible.
            </p>
          </Section>

          {/* 5 — GOOGLE API TERMS */}
          <Section id="google-apis" title="5. Google API Integrations">
            {/* Mandatory Limited Use Box */}
            <div className="rounded-xl border-2 border-primary/30 bg-primary/5 p-6 not-prose mb-6">
              <p className="text-sm font-semibold text-primary uppercase tracking-wide mb-2">
                Google API Limited Use Compliance
              </p>
              <p className="text-foreground/90 text-base leading-relaxed">
                kanakkmash&apos;s use and transfer to any other app of information received from
                Google APIs will adhere to the{' '}
                <a
                  href="https://developers.google.com/terms/api-services-user-data-policy"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary underline underline-offset-4 hover:text-primary/80 font-medium"
                >
                  Google API Services User Data Policy
                </a>
                , including the Limited Use requirements.
              </p>
            </div>

            <Subheading>5.1 Google Meet Integration</Subheading>
            <p>
              We use the Google Meet API to schedule, create, and manage virtual classroom sessions.
              By connecting your Google account, you authorise kanakkmash to:
            </p>
            <ul>
              <li>Create Google Meet links for your scheduled classes.</li>
              <li>Read and update relevant calendar events created by kanakkmash.</li>
            </ul>
            <p>
              We use this access solely to deliver class scheduling functionality. We do not record,
              store, monitor, or share the content of your Meet sessions.
            </p>

            <Subheading>5.2 Google Keep Integration</Subheading>
            <p>
              We use the Google Keep API to create and manage study notes associated with your
              classes. By connecting your Google account, you authorise kanakkmash to:
            </p>
            <ul>
              <li>Create notes on your behalf within Google Keep.</li>
              <li>Read and update notes that were created via kanakkmash.</li>
            </ul>
            <p>
              We do not access Google Keep notes that were not created through our Platform, and we
              do not use note content for advertising or share it with third parties.
            </p>

            <Subheading>5.3 OAuth Consent & Revocation</Subheading>
            <p>
              Connecting your Google account requires you to grant explicit OAuth consent through
              Google&apos;s secure authorization flow. You may revoke this access at any time from
              your kanakkmash account settings or directly from{' '}
              <a
                href="https://myaccount.google.com/permissions"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary underline underline-offset-4 hover:text-primary/80"
              >
                myaccount.google.com/permissions
              </a>
              . Revoking access will disable features that depend on Google API integration.
            </p>

            <Subheading>5.4 Compliance with Google Terms</Subheading>
            <p>
              Your use of features powered by Google APIs is also subject to:
            </p>
            <ul>
              <li>
                <a
                  href="https://developers.google.com/terms"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary underline underline-offset-4"
                >
                  Google APIs Terms of Service
                </a>
              </li>
              <li>
                <a
                  href="https://developers.google.com/terms/api-services-user-data-policy"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary underline underline-offset-4"
                >
                  Google API Services User Data Policy
                </a>
              </li>
              <li>
                <a
                  href="https://policies.google.com/privacy"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary underline underline-offset-4"
                >
                  Google Privacy Policy
                </a>
              </li>
            </ul>
          </Section>

          {/* 6 */}
          <Section id="user-conduct" title="6. User Conduct">
            <p>You agree not to:</p>
            <ul>
              <li>Use the Platform for any unlawful purpose or in violation of any applicable laws.</li>
              <li>
                Harass, abuse, threaten, or intimidate other users, teachers, or staff.
              </li>
              <li>
                Share, upload, or transmit content that is obscene, defamatory, hateful, or
                infringes third-party rights.
              </li>
              <li>
                Attempt to gain unauthorised access to any part of the Platform, server, or network.
              </li>
              <li>
                Reverse engineer, decompile, or disassemble any software used in connection with the
                Platform.
              </li>
              <li>
                Use automated bots, scrapers, or scripts to access the Platform without our written
                consent.
              </li>
              <li>
                Impersonate any person or entity or misrepresent your affiliation with any person
                or entity.
              </li>
              <li>Share your account credentials with others or allow others to use your account.</li>
            </ul>
            <p>
              We reserve the right to investigate violations and take appropriate action, including
              removal of content, suspension, or termination of your account.
            </p>
          </Section>

          {/* 7 */}
          <Section id="intellectual-property" title="7. Intellectual Property">
            <Subheading>7.1 Our Content</Subheading>
            <p>
              All content on the Platform — including text, graphics, logos, video recordings of
              classes, course materials, and software — is owned by kanakkmash or its licensors and
              is protected by applicable intellectual property laws. You may not reproduce,
              distribute, modify, or create derivative works without our prior written permission.
            </p>
            <Subheading>7.2 Your Content</Subheading>
            <p>
              You retain ownership of content you upload or create (e.g., assignments, notes). By
              submitting content to the Platform, you grant kanakkmash a non-exclusive,
              royalty-free, worldwide licence to use, store, and display your content solely for the
              purpose of operating and improving the Platform.
            </p>
            <Subheading>7.3 Feedback</Subheading>
            <p>
              If you provide us with feedback or suggestions, you grant us the right to use such
              feedback without compensation or attribution to you.
            </p>
          </Section>

          {/* 8 */}
          <Section id="payments" title="8. Payments &amp; Refunds">
            <Subheading>8.1 Fees</Subheading>
            <p>
              Certain features and courses on the Platform require payment. All fees are displayed
              in Indian Rupees (INR) unless otherwise stated and are inclusive of applicable taxes.
              Payments are processed securely through Razorpay.
            </p>
            <Subheading>8.2 Refund Policy</Subheading>
            <p>
              Refund requests must be submitted within 7 days of purchase. Refunds are considered on
              a case-by-case basis. Classes that have already been attended or course materials that
              have been accessed may not be eligible for a refund. Contact us at{' '}
              <a
                href={`mailto:${CONTACT_EMAIL}`}
                className="text-primary underline underline-offset-4"
              >
                {CONTACT_EMAIL}
              </a>{' '}
              to request a refund.
            </p>
            <Subheading>8.3 Subscription Cancellation</Subheading>
            <p>
              You may cancel a subscription at any time. Cancellation takes effect at the end of
              the current billing period; no pro-rated refunds are provided for unused time unless
              required by applicable law.
            </p>
          </Section>

          {/* 9 */}
          <Section id="disclaimer" title="9. Disclaimer of Warranties">
            <p>
              The Platform is provided on an &quot;as is&quot; and &quot;as available&quot; basis
              without warranties of any kind, either express or implied, including but not limited
              to warranties of merchantability, fitness for a particular purpose, or
              non-infringement.
            </p>
            <p>
              We do not warrant that the Platform will be uninterrupted, error-free, or free of
              viruses. We do not guarantee specific educational outcomes or results from using the
              Platform.
            </p>
            <p>
              The availability of Google Meet and Google Keep integrations is subject to Google's
              own service availability and policies, and we are not responsible for any downtime or
              changes in Google's services.
            </p>
          </Section>

          {/* 10 */}
          <Section id="liability" title="10. Limitation of Liability">
            <p>
              To the maximum extent permitted by applicable law, kanakkmash and its officers,
              directors, employees, and agents shall not be liable for any:
            </p>
            <ul>
              <li>Indirect, incidental, special, consequential, or punitive damages.</li>
              <li>Loss of profits, data, goodwill, or business opportunities.</li>
              <li>Damages arising from unauthorised access to or alteration of your data.</li>
              <li>
                Damages arising from the interruption or cessation of Google API services.
              </li>
            </ul>
            <p>
              Our total liability for any claim arising out of or relating to these Terms shall not
              exceed the amount you paid to kanakkmash in the 3 months preceding the claim.
            </p>
            <p>
              Nothing in these Terms excludes or limits our liability for death or personal injury
              caused by negligence, fraud or fraudulent misrepresentation, or any liability that
              cannot be excluded under applicable law.
            </p>
          </Section>

          {/* 11 */}
          <Section id="termination" title="11. Termination">
            <p>
              We may suspend or terminate your access to the Platform at any time, with or without
              notice, for conduct that we believe violates these Terms, is harmful to other users,
              or is otherwise objectionable. You may terminate your account at any time by contacting
              us at{' '}
              <a
                href={`mailto:${CONTACT_EMAIL}`}
                className="text-primary underline underline-offset-4"
              >
                {CONTACT_EMAIL}
              </a>
              .
            </p>
            <p>
              Upon termination, your right to use the Platform immediately ceases. Provisions that
              by their nature should survive termination (including intellectual property, disclaimer
              of warranties, and limitation of liability) will do so.
            </p>
          </Section>

          {/* 12 */}
          <Section id="governing-law" title="12. Governing Law">
            <p>
              These Terms shall be governed by and construed in accordance with the laws of India,
              without regard to its conflict of law provisions. Any disputes arising under these
              Terms shall be subject to the exclusive jurisdiction of the courts located in Kerala,
              India. If you are accessing the Platform from outside India, you are responsible for
              compliance with local laws.
            </p>
          </Section>

          {/* 13 */}
          <Section id="changes" title="13. Changes to These Terms">
            <p>
              We reserve the right to modify these Terms at any time. We will notify you of
              significant changes by updating the &quot;Effective Date&quot; above and, where
              appropriate, by sending an email or in-app notification at least 14 days before the
              changes take effect. Your continued use of the Platform after the effective date of
              the revised Terms constitutes your acceptance of those changes.
            </p>
          </Section>

          {/* 14 */}
          <Section id="contact" title="14. Contact Us">
            <p>
              If you have any questions about these Terms and Conditions, please contact us:
            </p>
            <div className="bg-card border border-border rounded-xl p-6 mt-4 not-prose">
              <p className="font-headline font-semibold text-foreground text-lg mb-2">kanakkmash</p>
              <p className="text-muted-foreground">
                Email:{' '}
                <a
                  href={`mailto:${CONTACT_EMAIL}`}
                  className="text-primary underline underline-offset-4 hover:text-primary/80"
                >
                  {CONTACT_EMAIL}
                </a>
              </p>
              <p className="text-muted-foreground mt-1">
                Website:{' '}
                <a
                  href={SITE_URL}
                  className="text-primary underline underline-offset-4 hover:text-primary/80"
                >
                  {SITE_URL}
                </a>
              </p>
            </div>
          </Section>
        </div>

        {/* Footer nav */}
        <div className="mt-16 pt-8 border-t border-border flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
          <p className="text-sm text-muted-foreground">
            © {new Date().getFullYear()} kanakkmash. All rights reserved.
          </p>
          <div className="flex gap-6 text-sm">
            <Link
              href="/privacy-policy"
              className="text-primary hover:text-primary/80 underline underline-offset-4 transition-colors"
            >
              Privacy Policy
            </Link>
            <Link
              href="/"
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              Home
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Reusable layout components ───────────────────────────────────────────────

function Section({
  id,
  title,
  children,
}: {
  id: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-24">
      <h2 className="text-2xl font-headline font-bold text-foreground mb-4 pb-2 border-b border-border">
        {title}
      </h2>
      <div className="space-y-4 text-foreground/85 leading-relaxed">{children}</div>
    </section>
  );
}

function Subheading({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="text-lg font-headline font-semibold text-foreground mt-6 mb-2">{children}</h3>
  );
}
