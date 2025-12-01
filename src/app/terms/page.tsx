import { FileText } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import Layout from "@/components/Layout";
import { generateStaticPageMetadata } from "@/lib/seo/metadata";

export const metadata: Metadata = generateStaticPageMetadata({
  title: "Terms of Service | Rebuzzle",
  description:
    "Terms of Service for Rebuzzle - Read our terms and conditions for using our puzzle game service.",
  url: "/terms",
  keywords: [
    "terms of service",
    "terms and conditions",
    "user agreement",
    "legal",
  ],
});

export default function TermsOfServicePage() {
  return (
    <Layout>
      <div className="mx-auto max-w-4xl px-4 py-3 md:px-6">
        {/* Header */}
        <div className="mb-8">
          <div className="mb-2 flex items-center gap-3">
            <FileText className="h-8 w-8 text-purple-600" />
            <h1 className="font-semibold text-base md:text-lg">
              Terms of Service
            </h1>
          </div>
          <p className="text-muted-foreground text-sm">
            Last updated:{" "}
            {new Date().toLocaleDateString("en-US", {
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </p>
        </div>

        {/* Content */}
        <div className="prose prose-sm dark:prose-invert max-w-none">
          <section className="mb-8">
            <h2 className="mb-4 font-semibold text-xl">
              1. Acceptance of Terms
            </h2>
            <p className="text-muted-foreground text-sm leading-relaxed">
              By accessing or using Rebuzzle ("the Service"), you agree to be
              bound by these Terms of Service ("Terms"). If you disagree with
              any part of these terms, you may not access the Service.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="mb-4 font-semibold text-xl">
              2. Account Creation and Responsibilities
            </h2>
            <div className="space-y-4">
              <div>
                <h3 className="mb-2 font-medium text-base">
                  Account Requirements
                </h3>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  To use certain features of the Service, you must create an
                  account. When creating an account, you agree to:
                </p>
                <ul className="mt-2 ml-6 list-disc space-y-1 text-muted-foreground text-sm">
                  <li>Provide accurate, current, and complete information</li>
                  <li>
                    Maintain and update your information to keep it accurate
                  </li>
                  <li>Maintain the security of your password</li>
                  <li>
                    Accept responsibility for all activities under your account
                  </li>
                  <li>Notify us immediately of any unauthorized use</li>
                </ul>
              </div>
              <div>
                <h3 className="mb-2 font-medium text-base">
                  Account Eligibility
                </h3>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  You must be at least 13 years old to create an account. By
                  creating an account, you represent that you meet this age
                  requirement.
                </p>
              </div>
            </div>
          </section>

          <section className="mb-8">
            <h2 className="mb-4 font-semibold text-xl">
              3. Acceptable Use Policy
            </h2>
            <p className="mb-4 text-muted-foreground text-sm leading-relaxed">
              You agree not to:
            </p>
            <ul className="ml-6 list-disc space-y-2 text-muted-foreground text-sm">
              <li>
                Use the Service for any illegal purpose or in violation of any
                laws
              </li>
              <li>
                Attempt to gain unauthorized access to the Service or related
                systems
              </li>
              <li>Interfere with or disrupt the Service or servers</li>
              <li>
                Use automated systems (bots, scrapers) to access the Service
                without permission
              </li>
              <li>
                Impersonate any person or entity or misrepresent your
                affiliation
              </li>
              <li>Harass, abuse, or harm other users</li>
              <li>Share your account credentials with others</li>
              <li>
                Attempt to reverse engineer or extract source code from the
                Service
              </li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="mb-4 font-semibold text-xl">
              4. Intellectual Property Rights
            </h2>
            <div className="space-y-4">
              <div>
                <h3 className="mb-2 font-medium text-base">Our Content</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  The Service, including all puzzles, content, design, graphics,
                  and software, is owned by Rebuzzle and protected by copyright,
                  trademark, and other intellectual property laws. You may not
                  copy, modify, distribute, or create derivative works without
                  our express written permission.
                </p>
              </div>
              <div>
                <h3 className="mb-2 font-medium text-base">User Content</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  You retain ownership of any content you submit to the Service.
                  By submitting content, you grant us a worldwide,
                  non-exclusive, royalty-free license to use, reproduce, and
                  display your content in connection with the Service.
                </p>
              </div>
            </div>
          </section>

          <section className="mb-8">
            <h2 className="mb-4 font-semibold text-xl">
              5. Service Availability and Modifications
            </h2>
            <p className="text-muted-foreground text-sm leading-relaxed">
              We reserve the right to:
            </p>
            <ul className="mt-2 ml-6 list-disc space-y-1 text-muted-foreground text-sm">
              <li>Modify, suspend, or discontinue the Service at any time</li>
              <li>Update features, content, or functionality</li>
              <li>
                Perform maintenance that may temporarily interrupt service
              </li>
              <li>Change pricing or subscription terms with notice</li>
            </ul>
            <p className="mt-4 text-muted-foreground text-sm leading-relaxed">
              We do not guarantee that the Service will be available at all
              times or free from errors.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="mb-4 font-semibold text-xl">
              6. User-Generated Content
            </h2>
            <p className="text-muted-foreground text-sm leading-relaxed">
              If you submit content (comments, solutions, etc.), you are solely
              responsible for that content. You agree that your content:
            </p>
            <ul className="mt-2 ml-6 list-disc space-y-1 text-muted-foreground text-sm">
              <li>Does not violate any laws or third-party rights</li>
              <li>Is not offensive, defamatory, or harmful</li>
              <li>Does not contain malware or malicious code</li>
              <li>Is accurate and not misleading</li>
            </ul>
            <p className="mt-4 text-muted-foreground text-sm leading-relaxed">
              We reserve the right to remove any content that violates these
              Terms.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="mb-4 font-semibold text-xl">
              7. Account Termination
            </h2>
            <div className="space-y-4">
              <div>
                <h3 className="mb-2 font-medium text-base">
                  Termination by You
                </h3>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  You may terminate your account at any time by contacting us or
                  using account deletion features in your settings.
                </p>
              </div>
              <div>
                <h3 className="mb-2 font-medium text-base">
                  Termination by Us
                </h3>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  We may suspend or terminate your account immediately if you:
                </p>
                <ul className="mt-2 ml-6 list-disc space-y-1 text-muted-foreground text-sm">
                  <li>Violate these Terms</li>
                  <li>Engage in fraudulent or illegal activity</li>
                  <li>Abuse the Service or other users</li>
                  <li>Fail to pay required fees (if applicable)</li>
                </ul>
              </div>
              <div>
                <h3 className="mb-2 font-medium text-base">
                  Effect of Termination
                </h3>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  Upon termination, your right to use the Service will
                  immediately cease. We may delete your account and associated
                  data, subject to our Privacy Policy and applicable law.
                </p>
              </div>
            </div>
          </section>

          <section className="mb-8">
            <h2 className="mb-4 font-semibold text-xl">
              8. Limitation of Liability
            </h2>
            <p className="mb-4 text-muted-foreground text-sm leading-relaxed">
              TO THE MAXIMUM EXTENT PERMITTED BY LAW:
            </p>
            <ul className="ml-6 list-disc space-y-2 text-muted-foreground text-sm">
              <li>
                The Service is provided "as is" and "as available" without
                warranties of any kind
              </li>
              <li>
                We disclaim all warranties, express or implied, including
                merchantability and fitness for a particular purpose
              </li>
              <li>
                We are not liable for any indirect, incidental, special, or
                consequential damages
              </li>
              <li>
                Our total liability shall not exceed the amount you paid us in
                the past 12 months, or $100, whichever is greater
              </li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="mb-4 font-semibold text-xl">9. Indemnification</h2>
            <p className="text-muted-foreground text-sm leading-relaxed">
              You agree to indemnify and hold harmless Rebuzzle, its officers,
              directors, employees, and agents from any claims, damages, losses,
              liabilities, and expenses (including legal fees) arising from your
              use of the Service, violation of these Terms, or infringement of
              any rights of another.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="mb-4 font-semibold text-xl">
              10. Dispute Resolution
            </h2>
            <div className="space-y-4">
              <div>
                <h3 className="mb-2 font-medium text-base">Governing Law</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  These Terms shall be governed by and construed in accordance
                  with the laws of the jurisdiction in which Rebuzzle operates,
                  without regard to conflict of law principles.
                </p>
              </div>
              <div>
                <h3 className="mb-2 font-medium text-base">Dispute Process</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  If you have a dispute with us, you agree to first contact us
                  to attempt to resolve the dispute informally. If we cannot
                  resolve the dispute within 60 days, you agree to resolve
                  disputes through binding arbitration or small claims court, as
                  applicable.
                </p>
              </div>
            </div>
          </section>

          <section className="mb-8">
            <h2 className="mb-4 font-semibold text-xl">11. Changes to Terms</h2>
            <p className="text-muted-foreground text-sm leading-relaxed">
              We reserve the right to modify these Terms at any time. We will
              notify you of material changes by posting the updated Terms on
              this page and updating the "Last updated" date. Your continued use
              of the Service after changes become effective constitutes
              acceptance of the new Terms.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="mb-4 font-semibold text-xl">12. Severability</h2>
            <p className="text-muted-foreground text-sm leading-relaxed">
              If any provision of these Terms is found to be unenforceable or
              invalid, that provision shall be limited or eliminated to the
              minimum extent necessary, and the remaining provisions shall
              remain in full force and effect.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="mb-4 font-semibold text-xl">
              13. Contact Information
            </h2>
            <p className="text-muted-foreground text-sm leading-relaxed">
              If you have questions about these Terms, please contact us at:
            </p>
            <p className="mt-2 text-muted-foreground text-sm leading-relaxed">
              Email:{" "}
              <a
                className="text-purple-600 underline hover:text-purple-700"
                href="mailto:legal@byronwade.com"
              >
                legal@byronwade.com
              </a>
            </p>
          </section>
        </div>

        {/* Back Link */}
        <div className="mt-8 text-center">
          <Link
            className="text-purple-600 text-sm hover:text-purple-700"
            href="/"
          >
            ← Back to Home
          </Link>
        </div>
      </div>
    </Layout>
  );
}
