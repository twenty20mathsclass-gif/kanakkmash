import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Privacy Policy | kanakkmash',
  description:
    'Privacy Policy for kanakkmash — learn how we collect, use, and protect your personal information, including data accessed via Google APIs.',
};

export const dynamic = 'force-static';

const EFFECTIVE_DATE = 'June 23, 2025';
const CONTACT_EMAIL = 'support@kanakkmash.com';
const SITE_URL = 'https://www.kanakkmash.com';

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Hero */}
      <div className="bg-gradient-to-br from-primary/10 via-accent/5 to-background border-b border-border">
        <div className="container mx-auto px-4 py-16 md:py-20 max-w-4xl">
          <p className="text-sm font-medium text-primary uppercase tracking-widest mb-3">
            Legal
          </p>
          <h1 className="text-4xl md:text-5xl font-headline font-bold text-foreground mb-4">
            Privacy Policy
          </h1>
          <p className="text-muted-foreground text-lg">
            Effective Date: <span className="font-medium text-foreground">{EFFECTIVE_DATE}</span>
          </p>
          <p className="mt-4 text-muted-foreground max-w-2xl">
            This Privacy Policy describes how <strong>kanakkmash</strong> (&quot;we&quot;,
            &quot;us&quot;, or &quot;our&quot;) collects, uses, and shares information about you
            when you use our services at{' '}
            <a
              href={SITE_URL}
              className="text-primary underline underline-offset-4 hover:text-primary/80 transition-colors"
            >
              {SITE_URL}
            </a>
            .
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
              ['#information-we-collect', 'Information We Collect'],
              ['#how-we-use-your-information', 'How We Use Your Information'],
              ['#google-api-data', 'Google API Services & User Data'],
              ['#data-sharing', 'How We Share Your Information'],
              ['#data-retention', 'Data Retention'],
              ['#your-rights', 'Your Rights & Choices'],
              ['#children-privacy', "Children's Privacy"],
              ['#security', 'Security'],
              ['#cookies', 'Cookies & Tracking Technologies'],
              ['#international-transfers', 'International Data Transfers'],
              ['#policy-changes', 'Changes to This Policy'],
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

        <div className="prose lg:prose-lg mx-auto space-y-12">
          {/* 1 */}
          <Section id="information-we-collect" title="1. Information We Collect">
            <p>We collect information you provide directly, automatically, and via third-party services.</p>
            <Subheading>1.1 Information You Provide</Subheading>
            <ul>
              <li>
                <strong>Account Information:</strong> Name, email address, phone number, and password
                when you register.
              </li>
              <li>
                <strong>Profile Information:</strong> Grade level, syllabus preference, and other
                academic details you add to your profile.
              </li>
              <li>
                <strong>Payment Information:</strong> Billing details processed via our payment
                processor (Razorpay). We do not store full card numbers on our servers.
              </li>
              <li>
                <strong>Communications:</strong> Messages you send to us via email or support
                channels.
              </li>
            </ul>
            <Subheading>1.2 Information We Collect Automatically</Subheading>
            <ul>
              <li>
                <strong>Usage Data:</strong> Pages visited, features used, time spent, and
                interaction logs.
              </li>
              <li>
                <strong>Device Information:</strong> Browser type, operating system, IP address, and
                device identifiers.
              </li>
              <li>
                <strong>Cookies & Similar Technologies:</strong> See the{' '}
                <a href="#cookies">Cookies section</a> below.
              </li>
            </ul>
            <Subheading>1.3 Information from Third-Party Services</Subheading>
            <p>
              If you sign in using Google OAuth, we receive basic profile information (name, email,
              profile picture) from Google. We also integrate with Google APIs to provide scheduling
              and note-taking features (see{' '}
              <a href="#google-api-data">Section 3</a> for full details).
            </p>
          </Section>

          {/* 2 */}
          <Section id="how-we-use-your-information" title="2. How We Use Your Information">
            <p>We use the information we collect to:</p>
            <ul>
              <li>Create and manage your account.</li>
              <li>Provide, personalise, and improve our educational services.</li>
              <li>Schedule and facilitate online classes using Google Meet.</li>
              <li>
                Sync and manage study notes and reminders using Google Keep (where you have granted
                access).
              </li>
              <li>Process payments and send receipts.</li>
              <li>Send transactional emails and, with your consent, marketing communications.</li>
              <li>
                Detect, investigate, and prevent fraudulent transactions and other illegal activities.
              </li>
              <li>Comply with legal obligations.</li>
            </ul>
            <p>
              We will only use your information for the purposes described at the time of collection
              or for compatible purposes. If we need to use your data for a materially different
              purpose, we will notify you and, where required, obtain your consent.
            </p>
          </Section>

          {/* 3 — GOOGLE API — CRITICAL SECTION */}
          <Section id="google-api-data" title="3. Google API Services &amp; User Data">
            {/* Mandatory Limited Use disclosure */}
            <div className="rounded-xl border-2 border-primary/30 bg-primary/5 p-6 not-prose mb-6">
              <p className="text-sm font-semibold text-primary uppercase tracking-wide mb-2">
                Google API Limited Use Disclosure
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

            <Subheading>3.1 Google Meet API</Subheading>
            <p>
              We use the <strong>Google Meet API</strong> to schedule, create, and manage virtual
              classroom sessions between teachers and students. When you authorise this integration,
              we access:
            </p>
            <ul>
              <li>Your Google calendar to create and update Meet links for scheduled classes.</li>
              <li>
                Meeting metadata (start time, end time, meeting code) to display class information
                inside kanakkmash.
              </li>
            </ul>
            <p>
              <strong>We do not:</strong> record, store, or share the content of your Google Meet
              sessions. We do not retain Google Meet data beyond what is necessary to show you your
              upcoming or past class schedule.
            </p>

            <Subheading>3.2 Google Keep API</Subheading>
            <p>
              We use the <strong>Google Keep API</strong> to help students and teachers create,
              view, and organise study notes linked to their classes. When you authorise this
              integration, we access:
            </p>
            <ul>
              <li>Notes you create through the kanakkmash interface.</li>
              <li>Labels you assign to notes for organisation within the app.</li>
            </ul>
            <p>
              <strong>We do not:</strong> read pre-existing notes in your Google Keep account that
              were not created via kanakkmash. We do not use note content for advertising or share
              it with third parties.
            </p>

            <Subheading>3.3 Scope of Access & Least Privilege</Subheading>
            <p>
              We request only the minimum OAuth scopes required for the features described above. We
              do not request access to your Gmail, Google Drive, Google Contacts, or any other Google
              service beyond what is explicitly listed. You can review and revoke our access at any
              time from your{' '}
              <a
                href="https://myaccount.google.com/permissions"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary underline underline-offset-4 hover:text-primary/80"
              >
                Google Account permissions page
              </a>
              .
            </p>

            <Subheading>3.4 No Transfer or Sale of Google User Data</Subheading>
            <p>
              We <strong>do not</strong> sell, rent, or transfer any data obtained from Google APIs
              to third parties. We do not use data obtained from Google APIs to serve advertising.
              We do not allow humans to read your Google user data unless you explicitly request
              support assistance and grant us temporary access, or it is required for security
              investigation.
            </p>
          </Section>

          {/* 4 */}
          <Section id="data-sharing" title="4. How We Share Your Information">
            <p>
              We do not sell or rent your personal information. We share information only in these
              limited circumstances:
            </p>
            <ul>
              <li>
                <strong>Service Providers:</strong> We share data with trusted vendors (e.g.,
                Firebase / Google Cloud for hosting, Razorpay for payments, Cloudinary for image
                storage) who process data on our behalf under strict confidentiality obligations.
              </li>
              <li>
                <strong>Teachers & Students:</strong> Scheduling information (class time, Meet link)
                is shared between the relevant teacher and enrolled students.
              </li>
              <li>
                <strong>Legal Requirements:</strong> We may disclose information if required by law,
                court order, or to protect the rights, property, or safety of kanakkmash, our users,
                or the public.
              </li>
              <li>
                <strong>Business Transfers:</strong> In the event of a merger, acquisition, or sale
                of assets, your information may be transferred. We will notify you before your
                information is subject to a different privacy policy.
              </li>
            </ul>
          </Section>

          {/* 5 */}
          <Section id="data-retention" title="5. Data Retention">
            <p>
              We retain your personal information for as long as your account is active or as needed
              to provide you services. You may request deletion of your account and associated data
              at any time by contacting us at{' '}
              <a
                href={`mailto:${CONTACT_EMAIL}`}
                className="text-primary underline underline-offset-4"
              >
                {CONTACT_EMAIL}
              </a>
              . We may retain certain information as required by law or for legitimate business
              purposes (e.g., financial records) for a period not exceeding 7 years.
            </p>
            <p>
              Google API data (Meet and Keep) is retained only as long as needed to deliver the
              requested feature. When you disconnect the Google integration or delete your account,
              we delete all associated Google user data within 30 days.
            </p>
          </Section>

          {/* 6 */}
          <Section id="your-rights" title="6. Your Rights &amp; Choices">
            <p>Depending on your jurisdiction, you may have the right to:</p>
            <ul>
              <li>
                <strong>Access:</strong> Request a copy of the personal data we hold about you.
              </li>
              <li>
                <strong>Correction:</strong> Update or correct inaccurate data.
              </li>
              <li>
                <strong>Deletion:</strong> Request deletion of your personal data (&quot;right to be
                forgotten&quot;).
              </li>
              <li>
                <strong>Portability:</strong> Receive your data in a structured, machine-readable
                format.
              </li>
              <li>
                <strong>Objection:</strong> Object to processing based on legitimate interests.
              </li>
              <li>
                <strong>Withdraw Consent:</strong> Revoke any consent you have given at any time.
              </li>
              <li>
                <strong>Revoke Google Access:</strong> Disconnect Google integrations at any time
                from your account settings or from{' '}
                <a
                  href="https://myaccount.google.com/permissions"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary underline underline-offset-4"
                >
                  myaccount.google.com/permissions
                </a>
                .
              </li>
            </ul>
            <p>
              To exercise any of these rights, please contact us at{' '}
              <a
                href={`mailto:${CONTACT_EMAIL}`}
                className="text-primary underline underline-offset-4"
              >
                {CONTACT_EMAIL}
              </a>
              . We will respond within 30 days.
            </p>
          </Section>

          {/* 7 */}
          <Section id="children-privacy" title="7. Children's Privacy">
            <p>
              Our platform is intended for students of all ages including minors. For users under the
              age of 13 (or the applicable digital age of consent in your jurisdiction), we require
              verifiable parental or guardian consent before collecting personal information. Parents
              or guardians may contact us to review, update, or delete their child&apos;s data.
            </p>
            <p>
              We do not knowingly collect personal information from children without parental consent.
              If you believe we have inadvertently collected information from a child, please contact
              us immediately.
            </p>
          </Section>

          {/* 8 */}
          <Section id="security" title="8. Security">
            <p>
              We implement industry-standard technical and organisational measures to protect your
              information, including:
            </p>
            <ul>
              <li>HTTPS/TLS encryption for all data in transit.</li>
              <li>Firebase Security Rules to control database access.</li>
              <li>OAuth 2.0 for all Google API authentication (no passwords stored).</li>
              <li>Regular security reviews and access controls.</li>
            </ul>
            <p>
              No method of transmission over the internet is 100% secure. If you suspect any
              unauthorised access to your account, please contact us immediately at{' '}
              <a
                href={`mailto:${CONTACT_EMAIL}`}
                className="text-primary underline underline-offset-4"
              >
                {CONTACT_EMAIL}
              </a>
              .
            </p>
          </Section>

          {/* 9 */}
          <Section id="cookies" title="9. Cookies &amp; Tracking Technologies">
            <p>We use cookies and similar technologies for:</p>
            <ul>
              <li>
                <strong>Essential Cookies:</strong> Required for authentication and core
                functionality.
              </li>
              <li>
                <strong>Preference Cookies:</strong> Remember your theme (light/dark) and language
                preferences.
              </li>
              <li>
                <strong>Analytics Cookies:</strong> Aggregate, anonymised data to understand how
                users interact with our platform (we use Google Analytics, which may set its own
                cookies).
              </li>
            </ul>
            <p>
              You can control cookies through your browser settings. Disabling essential cookies may
              affect the functionality of the platform.
            </p>
          </Section>

          {/* 10 */}
          <Section id="international-transfers" title="10. International Data Transfers">
            <p>
              kanakkmash is operated from India. Your information may be transferred to and processed
              in countries outside your country of residence, including the United States (via Google
              Cloud / Firebase infrastructure). These countries may have different data protection
              laws. We ensure appropriate safeguards are in place (such as Google&apos;s standard
              contractual clauses) for such transfers.
            </p>
          </Section>

          {/* 11 */}
          <Section id="policy-changes" title="11. Changes to This Policy">
            <p>
              We may update this Privacy Policy from time to time. When we make material changes, we
              will notify you by updating the &quot;Effective Date&quot; at the top of this page and,
              where appropriate, by sending an email or in-app notification. We encourage you to
              review this policy periodically.
            </p>
          </Section>

          {/* 12 */}
          <Section id="contact" title="12. Contact Us">
            <p>
              If you have any questions, concerns, or complaints about this Privacy Policy or our
              data practices, please contact us:
            </p>
            <div className="not-prose bg-card border border-border rounded-xl p-6 mt-4">
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
              href="/terms-and-conditions"
              className="text-primary hover:text-primary/80 underline underline-offset-4 transition-colors"
            >
              Terms &amp; Conditions
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
