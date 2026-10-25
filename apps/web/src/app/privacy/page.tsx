import type { Metadata } from "next";
import { AppLink as Link } from "@/components/AppLink";
import { LegalLayout } from "@/components/legal/LegalLayout";
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

const SECTIONS = [
  { id: "introduction", title: "Introduction" },
  { id: "information-we-collect", title: "Information we collect" },
  { id: "how-we-use-your-information", title: "How we use your information" },
  { id: "email-notifications-and-subscriptions", title: "Email notifications and subscriptions" },
  { id: "third-party-services", title: "Third-party services" },
  { id: "cookies-and-tracking-technologies", title: "Cookies and tracking technologies" },
  { id: "data-retention", title: "Data retention" },
  { id: "your-rights", title: "Your rights (GDPR compliance)" },
  { id: "data-security", title: "Data security" },
  { id: "children-s-privacy", title: "Children’s privacy" },
  { id: "changes-to-this-privacy-policy", title: "Changes to this privacy policy" },
  { id: "contact-us", title: "Contact us" },
] as const;

export default function PrivacyPolicyPage() {
  return (
    <LegalLayout
      description="What we collect, why, and how to get it removed."
      lastUpdated={LAST_UPDATED}
      sections={SECTIONS}
      title="Privacy policy."
    >
      <section className="legal-section" id="introduction">
        <h2>1. Introduction</h2>
        <p>
          Welcome to Rebuzzle. We are committed to protecting your privacy and ensuring transparency
          about how we collect, use, and protect your personal information. This Privacy Policy
          explains our practices regarding data collection, usage, and your rights.
        </p>
      </section>

      <section className="legal-section" id="information-we-collect">
        <h2>2. Information we collect</h2>
        <div>
          <div>
            <h3>Account information</h3>
            <p>When you create an account, we collect:</p>
            <ul>
              <li>Username</li>
              <li>Email address</li>
              <li>Hashed password (we never store your password in plain text)</li>
            </ul>
          </div>
          <div>
            <h3>Game statistics</h3>
            <p>We collect and store your game performance data, including:</p>
            <ul>
              <li>Puzzle completion rates</li>
              <li>Win/loss records</li>
              <li>Streak information</li>
              <li>Leaderboard rankings</li>
              <li>Game session data</li>
            </ul>
          </div>
          <div>
            <h3>Analytics and tracking</h3>
            <p>We use analytics services to understand how you interact with our service:</p>
            <ul>
              <li>Vercel Analytics for web performance and user behavior</li>
              <li>MongoDB event tracking for game analytics</li>
              <li>Session information and returning user identification</li>
            </ul>
          </div>
        </div>
      </section>

      <section className="legal-section" id="how-we-use-your-information">
        <h2>3. How we use your information</h2>
        <p>We use the information we collect to:</p>
        <ul>
          <li>Provide and improve our puzzle game service</li>
          <li>Track your progress and maintain leaderboards</li>
          <li>Send you email notifications about new puzzles and blog posts (with your consent)</li>
          <li>Analyze usage patterns to improve user experience</li>
          <li>Ensure security and prevent fraud</li>
          <li>Respond to your inquiries and provide customer support</li>
        </ul>
      </section>

      <section className="legal-section" id="email-notifications-and-subscriptions">
        <h2>4. Email notifications and subscriptions</h2>
        <div>
          <p>We offer email notifications for:</p>
          <ul>
            <li>Daily puzzle notifications</li>
            <li>Blog post updates</li>
            <li>Account-related communications (password resets, security alerts)</li>
          </ul>
          <p>
            <strong>Opt-in/Opt-out:</strong> New users are automatically subscribed to email
            notifications, but you can unsubscribe at any time by:
          </p>
          <ul>
            <li>Clicking the unsubscribe link in any email</li>
            <li>
              Visiting the{" "}
              <Link className="text-link underline underline-offset-4" href="/unsubscribe">
                unsubscribe page
              </Link>
            </li>
            <li>
              Managing preferences in your{" "}
              <Link className="text-link underline underline-offset-4" href="/settings">
                settings
              </Link>
            </li>
          </ul>
        </div>
      </section>

      <section className="legal-section" id="third-party-services">
        <h2>5. Third-party services</h2>
        <p>We use the following third-party services that may process your data:</p>
        <div>
          <div>
            <h3>Resend</h3>
            <p>
              We use Resend to send transactional and notification emails. Resend processes your
              email address to deliver emails on our behalf.
            </p>
          </div>
          <div>
            <h3>Vercel</h3>
            <p>
              Our application is hosted on Vercel, which provides hosting and analytics services.
              Vercel Analytics collects anonymized usage data.
            </p>
          </div>
          <div>
            <h3>MongoDB</h3>
            <p>
              We use MongoDB to store your account information, game statistics, and analytics
              events. Data is stored securely and encrypted in transit.
            </p>
          </div>
        </div>
      </section>

      <section className="legal-section" id="cookies-and-tracking-technologies">
        <h2>6. Cookies and tracking technologies</h2>
        <p>We use cookies and similar technologies to:</p>
        <ul>
          <li>Maintain your session and authentication state</li>
          <li>Store your preferences and settings</li>
          <li>Track analytics and improve our service</li>
        </ul>
        <p>
          You can control cookies through your browser settings, though this may affect
          functionality.
        </p>
      </section>

      <section className="legal-section" id="data-retention">
        <h2>7. Data retention</h2>
        <p>
          We retain your information for as long as your account is active or as needed to provide
          services. Analytics events are automatically deleted after one year. You can request
          deletion of your account and associated data at any time.
        </p>
      </section>

      <section className="legal-section" id="your-rights">
        <h2>8. Your rights (GDPR compliance)</h2>
        <p>
          If you are located in the European Economic Area (EEA), you have the following rights:
        </p>
        <ul>
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
        <p>To exercise these rights, please contact us using the information provided below.</p>
      </section>

      <section className="legal-section" id="data-security">
        <h2>9. Data security</h2>
        <p>
          We implement appropriate technical and organizational measures to protect your personal
          information, including encryption, secure password hashing, and regular security
          assessments. However, no method of transmission over the internet is 100% secure.
        </p>
      </section>

      <section className="legal-section" id="children-s-privacy">
        <h2>10. Children’s privacy</h2>
        <p>
          Our service is not intended for children under 13 years of age. We do not knowingly
          collect personal information from children under 13. If you believe we have collected
          information from a child under 13, please contact us immediately.
        </p>
      </section>

      <section className="legal-section" id="changes-to-this-privacy-policy">
        <h2>11. Changes to this privacy policy</h2>
        <p>
          We may update this Privacy Policy from time to time. We will notify you of any material
          changes by posting the new Privacy Policy on this page and updating the "Last updated"
          date. We encourage you to review this Privacy Policy periodically.
        </p>
      </section>

      <section className="legal-section" id="contact-us">
        <h2>12. Contact us</h2>
        <p>
          If you have questions about this Privacy Policy or wish to exercise your rights, please
          contact us at:
        </p>
        <p>
          Email:{" "}
          <a className="text-link underline underline-offset-4" href="mailto:privacy@byronwade.com">
            privacy@byronwade.com
          </a>
        </p>
      </section>
    </LegalLayout>
  );
}
