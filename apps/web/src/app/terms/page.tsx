import { FileText } from "lucide-react";
import type { Metadata } from "next";
import { AppLink as Link } from "@/components/AppLink";
import Layout from "@/components/Layout";
import { generateStaticPageMetadata } from "@/lib/seo/metadata";

export const metadata: Metadata = generateStaticPageMetadata({
  title: "Terms of Service | Rebuzzle",
  description:
    "Terms of Service for Rebuzzle - Read our terms and conditions for using our puzzle game service.",
  url: "/terms",
  keywords: ["terms of service", "terms and conditions", "user agreement", "legal"],
});

/** Static legal copy — no request-time Date/connection (keeps the page prerenderable). */
const LAST_UPDATED = "July 1, 2026";

export default function TermsOfServicePage() {
  const lastUpdated = LAST_UPDATED;

  return (
    <Layout>
      <div className="mx-auto max-w-3xl px-4 py-14 md:px-6 md:py-20">
        {/* Header */}
        <header className="border-border border-b pb-8">
          <p className="eyebrow mb-4">Legal</p>
          <div className="mb-2 flex items-center gap-3">
            <FileText className="h-6 w-6 text-subtle" />
            <h1 className="font-semibold text-2xl tracking-[-0.04em] md:text-3xl">
              Terms of Service
            </h1>
          </div>
          <p className="font-mono text-subtle text-xs">Last updated: {lastUpdated}</p>
        </header>

        {/* Content */}
        <div className="max-w-none">
          <section className="mt-10">
            <h2 className="mt-12 mb-4 font-semibold text-foreground text-xl tracking-[-0.03em]">
              1. Acceptance of Terms
            </h2>
            <p className="text-muted-foreground text-sm leading-6">
              By accessing or using Rebuzzle ("the Service"), you agree to be bound by these Terms
              of Service ("Terms"). If you disagree with any part of these terms, you may not access
              the Service.
            </p>
          </section>

          <section className="mt-10">
            <h2 className="mt-12 mb-4 font-semibold text-foreground text-xl tracking-[-0.03em]">
              2. Account Creation and Responsibilities
            </h2>
            <div className="space-y-4">
              <div>
                <h3 className="mt-6 mb-2 font-medium text-[15px] text-foreground">
                  Account Requirements
                </h3>
                <p className="text-muted-foreground text-sm leading-6">
                  To use certain features of the Service, you must create an account. When creating
                  an account, you agree to:
                </p>
                <ul className="mt-2 ml-5 list-disc space-y-1.5 text-muted-foreground text-sm leading-6 marker:text-border-strong">
                  <li>Provide accurate, current, and complete information</li>
                  <li>Maintain and update your information to keep it accurate</li>
                  <li>Maintain the security of your password</li>
                  <li>Accept responsibility for all activities under your account</li>
                  <li>Notify us immediately of any unauthorized use</li>
                </ul>
              </div>
              <div>
                <h3 className="mt-6 mb-2 font-medium text-[15px] text-foreground">
                  Account Eligibility
                </h3>
                <p className="text-muted-foreground text-sm leading-6">
                  You must be at least 13 years old to create an account. By creating an account,
                  you represent that you meet this age requirement.
                </p>
              </div>
            </div>
          </section>

          <section className="mt-10">
            <h2 className="mt-12 mb-4 font-semibold text-foreground text-xl tracking-[-0.03em]">
              3. Acceptable Use Policy
            </h2>
            <p className="mb-4 text-muted-foreground text-sm leading-6">You agree not to:</p>
            <ul className="ml-5 list-disc space-y-2 text-muted-foreground text-sm leading-6 marker:text-border-strong">
              <li>Use the Service for any illegal purpose or in violation of any laws</li>
              <li>Attempt to gain unauthorized access to the Service or related systems</li>
              <li>Interfere with or disrupt the Service or servers</li>
              <li>
                Use automated systems (bots, scrapers) to access the Service without permission
              </li>
              <li>Impersonate any person or entity or misrepresent your affiliation</li>
              <li>Harass, abuse, or harm other users</li>
              <li>Share your account credentials with others</li>
              <li>Attempt to reverse engineer or extract source code from the Service</li>
            </ul>
          </section>

          <section className="mt-10">
            <h2 className="mt-12 mb-4 font-semibold text-foreground text-xl tracking-[-0.03em]">
              4. Intellectual Property Rights
            </h2>
            <div className="space-y-4">
              <div>
                <h3 className="mt-6 mb-2 font-medium text-[15px] text-foreground">Our Content</h3>
                <p className="text-muted-foreground text-sm leading-6">
                  The Service, including all puzzles, content, design, graphics, and software, is
                  owned by Rebuzzle and protected by copyright, trademark, and other intellectual
                  property laws. You may not copy, modify, distribute, or create derivative works
                  without our express written permission.
                </p>
              </div>
              <div>
                <h3 className="mt-6 mb-2 font-medium text-[15px] text-foreground">User Content</h3>
                <p className="text-muted-foreground text-sm leading-6">
                  You retain ownership of any content you submit to the Service. By submitting
                  content, you grant us a worldwide, non-exclusive, royalty-free license to use,
                  reproduce, and display your content in connection with the Service.
                </p>
              </div>
            </div>
          </section>

          <section className="mt-10">
            <h2 className="mt-12 mb-4 font-semibold text-foreground text-xl tracking-[-0.03em]">
              5. Service Availability and Modifications
            </h2>
            <p className="text-muted-foreground text-sm leading-6">We reserve the right to:</p>
            <ul className="mt-2 ml-5 list-disc space-y-1.5 text-muted-foreground text-sm leading-6 marker:text-border-strong">
              <li>Modify, suspend, or discontinue the Service at any time</li>
              <li>Update features, content, or functionality</li>
              <li>Perform maintenance that may temporarily interrupt service</li>
              <li>Change pricing or subscription terms with notice</li>
            </ul>
            <p className="mt-4 text-muted-foreground text-sm leading-6">
              We do not guarantee that the Service will be available at all times or free from
              errors.
            </p>
          </section>

          <section className="mt-10">
            <h2 className="mt-12 mb-4 font-semibold text-foreground text-xl tracking-[-0.03em]">
              6. User-Generated Content
            </h2>
            <p className="text-muted-foreground text-sm leading-6">
              If you submit content (comments, solutions, etc.), you are solely responsible for that
              content. You agree that your content:
            </p>
            <ul className="mt-2 ml-5 list-disc space-y-1.5 text-muted-foreground text-sm leading-6 marker:text-border-strong">
              <li>Does not violate any laws or third-party rights</li>
              <li>Is not offensive, defamatory, or harmful</li>
              <li>Does not contain malware or malicious code</li>
              <li>Is accurate and not misleading</li>
            </ul>
            <p className="mt-4 text-muted-foreground text-sm leading-6">
              We reserve the right to remove any content that violates these Terms.
            </p>
          </section>

          <section className="mt-10">
            <h2 className="mt-12 mb-4 font-semibold text-foreground text-xl tracking-[-0.03em]">
              7. Account Termination
            </h2>
            <div className="space-y-4">
              <div>
                <h3 className="mt-6 mb-2 font-medium text-[15px] text-foreground">
                  Termination by You
                </h3>
                <p className="text-muted-foreground text-sm leading-6">
                  You may terminate your account at any time by contacting us or using account
                  deletion features in your settings.
                </p>
              </div>
              <div>
                <h3 className="mt-6 mb-2 font-medium text-[15px] text-foreground">
                  Termination by Us
                </h3>
                <p className="text-muted-foreground text-sm leading-6">
                  We may suspend or terminate your account immediately if you:
                </p>
                <ul className="mt-2 ml-5 list-disc space-y-1.5 text-muted-foreground text-sm leading-6 marker:text-border-strong">
                  <li>Violate these Terms</li>
                  <li>Engage in fraudulent or illegal activity</li>
                  <li>Abuse the Service or other users</li>
                  <li>Fail to pay required fees (if applicable)</li>
                </ul>
              </div>
              <div>
                <h3 className="mt-6 mb-2 font-medium text-[15px] text-foreground">
                  Effect of Termination
                </h3>
                <p className="text-muted-foreground text-sm leading-6">
                  Upon termination, your right to use the Service will immediately cease. We may
                  delete your account and associated data, subject to our Privacy Policy and
                  applicable law.
                </p>
              </div>
            </div>
          </section>

          <section className="mt-10">
            <h2 className="mt-12 mb-4 font-semibold text-foreground text-xl tracking-[-0.03em]">
              8. Limitation of Liability
            </h2>
            <p className="mb-4 text-muted-foreground text-sm leading-6">
              TO THE MAXIMUM EXTENT PERMITTED BY LAW:
            </p>
            <ul className="ml-5 list-disc space-y-2 text-muted-foreground text-sm leading-6 marker:text-border-strong">
              <li>
                The Service is provided "as is" and "as available" without warranties of any kind
              </li>
              <li>
                We disclaim all warranties, express or implied, including merchantability and
                fitness for a particular purpose
              </li>
              <li>
                We are not liable for any indirect, incidental, special, or consequential damages
              </li>
              <li>
                Our total liability shall not exceed the amount you paid us in the past 12 months,
                or $100, whichever is greater
              </li>
            </ul>
          </section>

          <section className="mt-10">
            <h2 className="mt-12 mb-4 font-semibold text-foreground text-xl tracking-[-0.03em]">
              9. Indemnification
            </h2>
            <p className="text-muted-foreground text-sm leading-6">
              You agree to indemnify and hold harmless Rebuzzle, its officers, directors, employees,
              and agents from any claims, damages, losses, liabilities, and expenses (including
              legal fees) arising from your use of the Service, violation of these Terms, or
              infringement of any rights of another.
            </p>
          </section>

          <section className="mt-10">
            <h2 className="mt-12 mb-4 font-semibold text-foreground text-xl tracking-[-0.03em]">
              10. Dispute Resolution
            </h2>
            <div className="space-y-4">
              <div>
                <h3 className="mt-6 mb-2 font-medium text-[15px] text-foreground">Governing Law</h3>
                <p className="text-muted-foreground text-sm leading-6">
                  These Terms shall be governed by and construed in accordance with the laws of the
                  jurisdiction in which Rebuzzle operates, without regard to conflict of law
                  principles.
                </p>
              </div>
              <div>
                <h3 className="mt-6 mb-2 font-medium text-[15px] text-foreground">
                  Dispute Process
                </h3>
                <p className="text-muted-foreground text-sm leading-6">
                  If you have a dispute with us, you agree to first contact us to attempt to resolve
                  the dispute informally. If we cannot resolve the dispute within 60 days, you agree
                  to resolve disputes through binding arbitration or small claims court, as
                  applicable.
                </p>
              </div>
            </div>
          </section>

          <section className="mt-10">
            <h2 className="mt-12 mb-4 font-semibold text-foreground text-xl tracking-[-0.03em]">
              11. Changes to Terms
            </h2>
            <p className="text-muted-foreground text-sm leading-6">
              We reserve the right to modify these Terms at any time. We will notify you of material
              changes by posting the updated Terms on this page and updating the "Last updated"
              date. Your continued use of the Service after changes become effective constitutes
              acceptance of the new Terms.
            </p>
          </section>

          <section className="mt-10">
            <h2 className="mt-12 mb-4 font-semibold text-foreground text-xl tracking-[-0.03em]">
              12. Severability
            </h2>
            <p className="text-muted-foreground text-sm leading-6">
              If any provision of these Terms is found to be unenforceable or invalid, that
              provision shall be limited or eliminated to the minimum extent necessary, and the
              remaining provisions shall remain in full force and effect.
            </p>
          </section>

          <section className="mt-10">
            <h2 className="mt-12 mb-4 font-semibold text-foreground text-xl tracking-[-0.03em]">
              13. Contact Information
            </h2>
            <p className="text-muted-foreground text-sm leading-6">
              If you have questions about these Terms, please contact us at:
            </p>
            <p className="mt-2 text-muted-foreground text-sm leading-6">
              Email:{" "}
              <a
                className="text-link underline-offset-4 hover:underline"
                href="mailto:legal@byronwade.com"
              >
                legal@byronwade.com
              </a>
            </p>
          </section>
        </div>

        {/* Back Link */}
        <div className="mt-8 text-center">
          <Link className="text-link text-sm underline-offset-4 hover:underline" href="/">
            ← Back to Home
          </Link>
        </div>
      </div>
    </Layout>
  );
}
