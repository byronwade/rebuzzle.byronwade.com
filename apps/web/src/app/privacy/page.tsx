import { Shield } from "lucide-react";
import type { Metadata } from "next";
import { headers } from "next/headers";
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

export default async function PrivacyPolicyPage() {
  // Access headers to mark component as dynamic (required before using new Date() in Next.js 16)
  const headersList = await headers();
  // Consume a header to ensure dynamic rendering
  headersList.get("x-forwarded-proto");

  const lastUpdated = new Date().toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <Layout>
      <div className="mx-auto max-w-4xl px-4 py-3 md:px-6">
        {/* Header */}
        <div className="mb-8">
          <div className="mb-2 flex items-center gap-3">
            <Shield className="h-8 w-8 text-neutral-700 dark:text-neutral-300" />
            <h1 className="font-semibold text-base md:text-lg">Privacy Policy</h1>
          </div>
          <p className="text-muted-foreground text-sm">Last updated: {lastUpdated}</p>
        </div>

        {/* Content */}
        <div className="prose prose-sm dark:prose-invert max-w-none">
          <section className="mb-8">
            <h2 className="mb-4 font-semibold text-xl">1. Introduction</h2>
            <p className="text-muted-foreground text-sm leading-relaxed">
              Welcome to Rebuzzle. We are committed to protecting your privacy and ensuring
              transparency about how we collect, use, and protect your personal information. This
              Privacy Policy explains our practices regarding data collection, usage, and your
              rights.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="mb-4 font-semibold text-xl">2. Information We Collect</h2>
            <div className="space-y-4">
              <div>
                <h3 className="mb-2 font-medium text-base">Account Information</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  When you create an account, we collect:
                </p>
                <ul className="mt-2 ml-6 list-disc space-y-1 text-muted-foreground text-sm">
                  <li>Username</li>
                  <li>Email address</li>
                  <li>Hashed password (we never store your password in plain text)</li>
                </ul>
              </div>
              <div>
                <h3 className="mb-2 font-medium text-base">Game Statistics</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  We collect and store your game performance data, including:
                </p>
                <ul className="mt-2 ml-6 list-disc space-y-1 text-muted-foreground text-sm">
                  <li>Puzzle completion rates</li>
                  <li>Win/loss records</li>
                  <li>Streak information</li>
                  <li>Leaderboard rankings</li>
                  <li>Game session data</li>
                </ul>
              </div>
              <div>
                <h3 className="mb-2 font-medium text-base">Analytics and Tracking</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  We use analytics services to understand how you interact with our service:
                </p>
                <ul className="mt-2 ml-6 list-disc space-y-1 text-muted-foreground text-sm">
                  <li>Vercel Analytics for web performance and user behavior</li>
                  <li>MongoDB event tracking for game analytics</li>
                  <li>Session information and returning user identification</li>
                </ul>
              </div>
            </div>
          </section>

          <section className="mb-8">
            <h2 className="mb-4 font-semibold text-xl">3. How We Use Your Information</h2>
            <p className="mb-4 text-muted-foreground text-sm leading-relaxed">
              We use the information we collect to:
            </p>
            <ul className="ml-6 list-disc space-y-2 text-muted-foreground text-sm">
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

          <section className="mb-8">
            <h2 className="mb-4 font-semibold text-xl">4. Email Notifications and Subscriptions</h2>
            <div className="space-y-4">
              <p className="text-muted-foreground text-sm leading-relaxed">
                We offer email notifications for:
              </p>
              <ul className="ml-6 list-disc space-y-1 text-muted-foreground text-sm">
                <li>Daily puzzle notifications</li>
                <li>Blog post updates</li>
                <li>Account-related communications (password resets, security alerts)</li>
              </ul>
              <p className="text-muted-foreground text-sm leading-relaxed">
                <strong>Opt-in/Opt-out:</strong> New users are automatically subscribed to email
                notifications, but you can unsubscribe at any time by:
              </p>
              <ul className="ml-6 list-disc space-y-1 text-muted-foreground text-sm">
                <li>Clicking the unsubscribe link in any email</li>
                <li>
                  Visiting the{" "}
                  <Link
                    className="text-neutral-700 dark:text-neutral-300 underline hover:text-neutral-800 dark:text-neutral-200"
                    href="/unsubscribe"
                  >
                    unsubscribe page
                  </Link>
                </li>
                <li>
                  Managing preferences in your{" "}
                  <Link
                    className="text-neutral-700 dark:text-neutral-300 underline hover:text-neutral-800 dark:text-neutral-200"
                    href="/settings"
                  >
                    settings
                  </Link>
                </li>
              </ul>
            </div>
          </section>

          <section className="mb-8">
            <h2 className="mb-4 font-semibold text-xl">5. Third-Party Services</h2>
            <p className="mb-4 text-muted-foreground text-sm leading-relaxed">
              We use the following third-party services that may process your data:
            </p>
            <div className="space-y-4">
              <div>
                <h3 className="mb-2 font-medium text-base">Resend</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  We use Resend to send transactional and notification emails. Resend processes your
                  email address to deliver emails on our behalf.
                </p>
              </div>
              <div>
                <h3 className="mb-2 font-medium text-base">Vercel</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  Our application is hosted on Vercel, which provides hosting and analytics
                  services. Vercel Analytics collects anonymized usage data.
                </p>
              </div>
              <div>
                <h3 className="mb-2 font-medium text-base">MongoDB</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  We use MongoDB to store your account information, game statistics, and analytics
                  events. Data is stored securely and encrypted in transit.
                </p>
              </div>
            </div>
          </section>

          <section className="mb-8">
            <h2 className="mb-4 font-semibold text-xl">6. Cookies and Tracking Technologies</h2>
            <p className="text-muted-foreground text-sm leading-relaxed">
              We use cookies and similar technologies to:
            </p>
            <ul className="mt-2 ml-6 list-disc space-y-1 text-muted-foreground text-sm">
              <li>Maintain your session and authentication state</li>
              <li>Store your preferences and settings</li>
              <li>Track analytics and improve our service</li>
            </ul>
            <p className="mt-4 text-muted-foreground text-sm leading-relaxed">
              You can control cookies through your browser settings, though this may affect
              functionality.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="mb-4 font-semibold text-xl">7. Data Retention</h2>
            <p className="text-muted-foreground text-sm leading-relaxed">
              We retain your information for as long as your account is active or as needed to
              provide services. Analytics events are automatically deleted after one year. You can
              request deletion of your account and associated data at any time.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="mb-4 font-semibold text-xl">8. Your Rights (GDPR Compliance)</h2>
            <p className="mb-4 text-muted-foreground text-sm leading-relaxed">
              If you are located in the European Economic Area (EEA), you have the following rights:
            </p>
            <ul className="ml-6 list-disc space-y-2 text-muted-foreground text-sm">
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
            <p className="mt-4 text-muted-foreground text-sm leading-relaxed">
              To exercise these rights, please contact us using the information provided below.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="mb-4 font-semibold text-xl">9. Data Security</h2>
            <p className="text-muted-foreground text-sm leading-relaxed">
              We implement appropriate technical and organizational measures to protect your
              personal information, including encryption, secure password hashing, and regular
              security assessments. However, no method of transmission over the internet is 100%
              secure.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="mb-4 font-semibold text-xl">10. Children's Privacy</h2>
            <p className="text-muted-foreground text-sm leading-relaxed">
              Our service is not intended for children under 13 years of age. We do not knowingly
              collect personal information from children under 13. If you believe we have collected
              information from a child under 13, please contact us immediately.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="mb-4 font-semibold text-xl">11. Changes to This Privacy Policy</h2>
            <p className="text-muted-foreground text-sm leading-relaxed">
              We may update this Privacy Policy from time to time. We will notify you of any
              material changes by posting the new Privacy Policy on this page and updating the "Last
              updated" date. We encourage you to review this Privacy Policy periodically.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="mb-4 font-semibold text-xl">12. Contact Us</h2>
            <p className="text-muted-foreground text-sm leading-relaxed">
              If you have questions about this Privacy Policy or wish to exercise your rights,
              please contact us at:
            </p>
            <p className="mt-2 text-muted-foreground text-sm leading-relaxed">
              Email:{" "}
              <a
                className="text-neutral-700 dark:text-neutral-300 underline hover:text-neutral-800 dark:text-neutral-200"
                href="mailto:privacy@byronwade.com"
              >
                privacy@byronwade.com
              </a>
            </p>
          </section>
        </div>

        {/* Back Link */}
        <div className="mt-8 text-center">
          <Link
            className="text-neutral-700 dark:text-neutral-300 text-sm hover:text-neutral-800 dark:text-neutral-200"
            href="/"
          >
            ← Back to Home
          </Link>
        </div>
      </div>
    </Layout>
  );
}
