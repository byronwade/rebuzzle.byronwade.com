import { Shield } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import Layout from "@/components/Layout";
import { generateStaticPageMetadata } from "@/lib/seo/metadata";

export const metadata: Metadata = generateStaticPageMetadata({
  title: "Privacy Policy | Rebuzzle",
  description:
    "Privacy Policy for Rebuzzle - Learn how we collect, use, and protect your data. GDPR compliant privacy practices.",
  url: "/privacy",
  keywords: ["privacy policy", "data protection", "GDPR", "user privacy", "data security"],
});

/** Static legal copy — no request-time Date/connection (keeps the page prerenderable). */
const LAST_UPDATED = "July 1, 2026";

export default function PrivacyPolicyPage() {
  const lastUpdated = LAST_UPDATED;

  return (
    <Layout>
      <div className="mx-auto max-w-3xl px-4 py-14 md:px-6 md:py-20">
        {/* Header */}
        <header className="border-border border-b pb-8">
          <p className="eyebrow mb-4">Legal</p>
          <div className="mb-2 flex items-center gap-3">
            <Shield className="h-6 w-6 text-subtle" />
            <h1 className="font-semibold text-2xl tracking-[-0.04em] md:text-3xl">
              Privacy Policy
            </h1>
          </div>
          <p className="font-mono text-subtle text-xs">Last updated: {lastUpdated}</p>
        </header>

        {/* Content */}
        <div className="max-w-none">
          <section className="mt-10">
            <h2 className="mt-12 mb-4 font-semibold text-foreground text-xl tracking-[-0.03em]">
              1. Introduction
            </h2>
            <p className="text-muted-foreground text-sm leading-6">
              Welcome to Rebuzzle. We are committed to protecting your privacy and ensuring
              transparency about how we collect, use, and protect your personal information. This
              Privacy Policy explains our practices regarding data collection, usage, and your
              rights.
            </p>
          </section>

          <section className="mt-10">
            <h2 className="mt-12 mb-4 font-semibold text-foreground text-xl tracking-[-0.03em]">
              2. Information We Collect
            </h2>
            <div className="space-y-4">
              <div>
                <h3 className="mt-6 mb-2 font-medium text-[15px] text-foreground">
                  Account Information
                </h3>
                <p className="text-muted-foreground text-sm leading-6">
                  When you create an account, we collect:
                </p>
                <ul className="mt-2 ml-5 list-disc space-y-1.5 text-muted-foreground text-sm leading-6 marker:text-border-strong">
                  <li>Username</li>
                  <li>Email address</li>
                  <li>Hashed password (we never store your password in plain text)</li>
                </ul>
              </div>
              <div>
                <h3 className="mt-6 mb-2 font-medium text-[15px] text-foreground">
                  Game Statistics
                </h3>
                <p className="text-muted-foreground text-sm leading-6">
                  We collect and store your game performance data, including:
                </p>
                <ul className="mt-2 ml-5 list-disc space-y-1.5 text-muted-foreground text-sm leading-6 marker:text-border-strong">
                  <li>Puzzle completion rates</li>
                  <li>Win/loss records</li>
                  <li>Streak information</li>
                  <li>Leaderboard rankings</li>
                  <li>Game session data</li>
                </ul>
              </div>
              <div>
                <h3 className="mt-6 mb-2 font-medium text-[15px] text-foreground">
                  Analytics and Tracking
                </h3>
                <p className="text-muted-foreground text-sm leading-6">
                  We use analytics services to understand how you interact with our service:
                </p>
                <ul className="mt-2 ml-5 list-disc space-y-1.5 text-muted-foreground text-sm leading-6 marker:text-border-strong">
                  <li>Vercel Analytics for web performance and user behavior</li>
                  <li>MongoDB event tracking for game analytics</li>
                  <li>Session information and returning user identification</li>
                </ul>
              </div>
            </div>
          </section>

          <section className="mt-10">
            <h2 className="mt-12 mb-4 font-semibold text-foreground text-xl tracking-[-0.03em]">
              3. How We Use Your Information
            </h2>
            <p className="mb-4 text-muted-foreground text-sm leading-6">
              We use the information we collect to:
            </p>
            <ul className="ml-5 list-disc space-y-2 text-muted-foreground text-sm leading-6 marker:text-border-strong">
              <li>Provide and improve our puzzle game service</li>
              <li>Track your progress and maintain leaderboards</li>
              <li>
                Send you email notifications about new puzzles and blog posts (with your consent)
              </li>
              <li>Analyze usage patterns to improve user experience</li>
              <li>Ensure security and prevent fraud</li>
              <li>Respond to your inquiries and provide customer support</li>
            </ul>
          </section>

          <section className="mt-10">
            <h2 className="mt-12 mb-4 font-semibold text-foreground text-xl tracking-[-0.03em]">
              4. Email Notifications and Subscriptions
            </h2>
            <div className="space-y-4">
              <p className="text-muted-foreground text-sm leading-6">
                We offer email notifications for:
              </p>
              <ul className="ml-5 list-disc space-y-1.5 text-muted-foreground text-sm leading-6 marker:text-border-strong">
                <li>Daily puzzle notifications</li>
                <li>Blog post updates</li>
                <li>Account-related communications (password resets, security alerts)</li>
              </ul>
              <p className="text-muted-foreground text-sm leading-6">
                <strong>Opt-in/Opt-out:</strong> New users are automatically subscribed to email
                notifications, but you can unsubscribe at any time by:
              </p>
              <ul className="ml-5 list-disc space-y-1.5 text-muted-foreground text-sm leading-6 marker:text-border-strong">
                <li>Clicking the unsubscribe link in any email</li>
                <li>
                  Visiting the{" "}
                  <Link
                    className="text-link underline-offset-4 hover:underline"
                    href="/unsubscribe"
                  >
                    unsubscribe page
                  </Link>
                </li>
                <li>
                  Managing preferences in your{" "}
                  <Link className="text-link underline-offset-4 hover:underline" href="/settings">
                    settings
                  </Link>
                </li>
              </ul>
            </div>
          </section>

          <section className="mt-10">
            <h2 className="mt-12 mb-4 font-semibold text-foreground text-xl tracking-[-0.03em]">
              5. Third-Party Services
            </h2>
            <p className="mb-4 text-muted-foreground text-sm leading-6">
              We use the following third-party services that may process your data:
            </p>
            <div className="space-y-4">
              <div>
                <h3 className="mt-6 mb-2 font-medium text-[15px] text-foreground">Resend</h3>
                <p className="text-muted-foreground text-sm leading-6">
                  We use Resend to send transactional and notification emails. Resend processes your
                  email address to deliver emails on our behalf.
                </p>
              </div>
              <div>
                <h3 className="mt-6 mb-2 font-medium text-[15px] text-foreground">Vercel</h3>
                <p className="text-muted-foreground text-sm leading-6">
                  Our application is hosted on Vercel, which provides hosting and analytics
                  services. Vercel Analytics collects anonymized usage data.
                </p>
              </div>
              <div>
                <h3 className="mt-6 mb-2 font-medium text-[15px] text-foreground">MongoDB</h3>
                <p className="text-muted-foreground text-sm leading-6">
                  We use MongoDB to store your account information, game statistics, and analytics
                  events. Data is stored securely and encrypted in transit.
                </p>
              </div>
            </div>
          </section>

          <section className="mt-10">
            <h2 className="mt-12 mb-4 font-semibold text-foreground text-xl tracking-[-0.03em]">
              6. Cookies and Tracking Technologies
            </h2>
            <p className="text-muted-foreground text-sm leading-6">
              We use cookies and similar technologies to:
            </p>
            <ul className="mt-2 ml-5 list-disc space-y-1.5 text-muted-foreground text-sm leading-6 marker:text-border-strong">
              <li>Maintain your session and authentication state</li>
              <li>Store your preferences and settings</li>
              <li>Track analytics and improve our service</li>
            </ul>
            <p className="mt-4 text-muted-foreground text-sm leading-6">
              You can control cookies through your browser settings, though this may affect
              functionality.
            </p>
          </section>

          <section className="mt-10">
            <h2 className="mt-12 mb-4 font-semibold text-foreground text-xl tracking-[-0.03em]">
              7. Data Retention
            </h2>
            <p className="text-muted-foreground text-sm leading-6">
              We retain your information for as long as your account is active or as needed to
              provide services. Analytics events are automatically deleted after one year. You can
              request deletion of your account and associated data at any time.
            </p>
          </section>

          <section className="mt-10">
            <h2 className="mt-12 mb-4 font-semibold text-foreground text-xl tracking-[-0.03em]">
              8. Your Rights (GDPR Compliance)
            </h2>
            <p className="mb-4 text-muted-foreground text-sm leading-6">
              If you are located in the European Economic Area (EEA), you have the following rights:
            </p>
            <ul className="ml-5 list-disc space-y-2 text-muted-foreground text-sm leading-6 marker:text-border-strong">
              <li>
                <strong>Right to Access:</strong> Request a copy of your personal data
              </li>
              <li>
                <strong>Right to Rectification:</strong> Correct inaccurate or incomplete data
              </li>
              <li>
                <strong>Right to Erasure:</strong> Request deletion of your personal data
              </li>
              <li>
                <strong>Right to Restrict Processing:</strong> Limit how we use your data
              </li>
              <li>
                <strong>Right to Data Portability:</strong> Receive your data in a structured format
              </li>
              <li>
                <strong>Right to Object:</strong> Object to processing of your personal data
              </li>
            </ul>
            <p className="mt-4 text-muted-foreground text-sm leading-6">
              To exercise these rights, please contact us using the information provided below.
            </p>
          </section>

          <section className="mt-10">
            <h2 className="mt-12 mb-4 font-semibold text-foreground text-xl tracking-[-0.03em]">
              9. Data Security
            </h2>
            <p className="text-muted-foreground text-sm leading-6">
              We implement appropriate technical and organizational measures to protect your
              personal information, including encryption, secure password hashing, and regular
              security assessments. However, no method of transmission over the internet is 100%
              secure.
            </p>
          </section>

          <section className="mt-10">
            <h2 className="mt-12 mb-4 font-semibold text-foreground text-xl tracking-[-0.03em]">
              10. Children's Privacy
            </h2>
            <p className="text-muted-foreground text-sm leading-6">
              Our service is not intended for children under 13 years of age. We do not knowingly
              collect personal information from children under 13. If you believe we have collected
              information from a child under 13, please contact us immediately.
            </p>
          </section>

          <section className="mt-10">
            <h2 className="mt-12 mb-4 font-semibold text-foreground text-xl tracking-[-0.03em]">
              11. Changes to This Privacy Policy
            </h2>
            <p className="text-muted-foreground text-sm leading-6">
              We may update this Privacy Policy from time to time. We will notify you of any
              material changes by posting the new Privacy Policy on this page and updating the "Last
              updated" date. We encourage you to review this Privacy Policy periodically.
            </p>
          </section>

          <section className="mt-10">
            <h2 className="mt-12 mb-4 font-semibold text-foreground text-xl tracking-[-0.03em]">
              12. Contact Us
            </h2>
            <p className="text-muted-foreground text-sm leading-6">
              If you have questions about this Privacy Policy or wish to exercise your rights,
              please contact us at:
            </p>
            <p className="mt-2 text-muted-foreground text-sm leading-6">
              Email:{" "}
              <a
                className="text-link underline-offset-4 hover:underline"
                href="mailto:privacy@byronwade.com"
              >
                privacy@byronwade.com
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
