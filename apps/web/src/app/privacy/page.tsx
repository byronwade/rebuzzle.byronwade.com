import type { Metadata } from "next";
import { AppLink as Link } from "@/components/AppLink";
import { LegalLayout } from "@/components/legal/LegalLayout";
import { generateStaticPageMetadata } from "@/lib/seo/metadata";

export const metadata: Metadata = generateStaticPageMetadata({
  title: "Privacy Policy | Rebuzzle",
  description:
    "How Rebuzzle handles account details, gameplay, AI processing, and data stored in the iOS app.",
  url: "/privacy",
  keywords: ["privacy policy", "data protection", "GDPR", "user privacy", "data security"],
});

/** Static legal copy — no request-time Date/connection (keeps the page prerenderable). */
const LAST_UPDATED = "October 28, 2026";

const SECTIONS = [
  { id: "introduction", title: "Introduction" },
  { id: "information-we-collect", title: "Information we collect" },
  { id: "how-we-use-your-information", title: "How we use your information" },
  { id: "email-notifications-and-subscriptions", title: "Email notifications and subscriptions" },
  { id: "third-party-services", title: "Third-party services" },
  { id: "cookies-and-tracking-technologies", title: "Cookies and tracking technologies" },
  { id: "data-retention", title: "Data retention" },
  { id: "your-rights", title: "Your rights" },
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
          This policy explains how Rebuzzle handles information from its website and iOS app,
          including account access, gameplay, AI features, and purchases. Some information is sent
          to our servers and service providers; other information stays in local app storage.
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
              <li>Submitted guesses, puzzle identifiers, and answer-checking results</li>
              <li>Hint counts, attempt counts, play duration, and gameplay timestamps</li>
              <li>Achievement progress, game session data, and Journey XP, levels, and badges</li>
            </ul>
          </div>
          <div>
            <h3>Usage and device information</h3>
            <p>We use analytics services to understand how you interact with our service:</p>
            <ul>
              <li>Vercel Analytics for web performance and user behavior</li>
              <li>MongoDB event tracking for game analytics</li>
              <li>Account-linked login and return events, and returning guest identification</li>
              <li>
                Native daily-play events: when a daily puzzle is opened and its entry path, whether
                a daily puzzle is finished, whether the Plus offer is viewed, and whether a reminder
                is successfully scheduled, an optional rating after the daily result is revealed,
                when sharing starts or iOS reports that a share activity completed, and a verified
                session restore for the current official daily puzzle
              </li>
            </ul>
            <p>
              The iOS app stores a random device identifier in the Keychain and sends it to our
              servers to recognize returning guests. It also sends your timezone for daily puzzle
              boundaries and streaks. We associate gameplay and statistics with your account or
              guest account. Our service processes request IP addresses for security and rate
              limiting and stores IP-derived hashes on guest records.
            </p>
            <p>
              Daily engagement events are linked to your account. Their stored fields are limited to
              the event type, local puzzle day, server-recorded time, and, where relevant, the entry
              path, finish outcome, or one of four optional puzzle ratings. The server also records
              when an authenticated session restores the current official daily puzzle. We use that
              timestamp with a later correct-solve event to calculate an aggregate median elapsed
              wall-clock time by puzzle date, shown to administrators only when at least five
              qualifying solves are available. Wall-clock time includes idle and background time; it
              does not measure active play or thinking time. A failed event write may be retried on
              a later restore, so the interval begins at the first recorded restore. The `share`
              entry path identifies a daily open attributed to a Rebuzzle share link. If you change
              your rating, the latest choice replaces your earlier choice for that account and
              puzzle day. These event records do not contain puzzle IDs, answers, guesses,
              explanations, journal notes, email addresses, reminder text, share contents,
              recipients, or the destination you choose. We use them to understand daily play and
              improve the game; ratings are self-selected and are not treated as objective
              difficulty measurements. An iOS-reported share completion does not confirm delivery or
              a recipient opening the link. When the web game reports a share-attributed open, the
              server also records the first accepted daily guess and terminal outcome for that same
              account and puzzle day. These account-day overlaps do not identify a recipient or
              prove that the sender and player are different people.
            </p>
          </div>
          <div>
            <h3>Information stored locally by the iOS app</h3>
            <p>
              Journey syncs a limited completion summary to your account: puzzle dates and IDs,
              solved or failed outcomes, attempt counts, optional hint counts, completion times, and
              the timezone used for the daily reset. It does not include your answers, submitted
              guesses, explanations, or journal notes. With a registered Rebuzzle account and
              current Plus access, journal note text is sent to Rebuzzle and stored with your
              account and puzzle ID so it can sync across your devices. The iOS app also keeps a
              local copy for offline use. Guest notes remain on the device until that guest account
              is upgraded; notes are not merged when you sign in to a different Rebuzzle account.
              Unsent drafts, cached puzzle results, and reminder preferences are stored locally.
              Journal notes are not included in analytics or prompts to AI providers. If you share a
              result using the system share sheet, the image or spoiler-safe text includes the
              puzzle date, result, attempt marks, hints used, and a Rebuzzle link. The destination
              you choose handles the content you share. Device backups may also include local app
              data, depending on your device and backup settings.
            </p>
          </div>
        </div>
      </section>

      <section className="legal-section" id="how-we-use-your-information">
        <h2>3. How we use your information</h2>
        <p>We use the information we collect to:</p>
        <ul>
          <li>Provide and improve our puzzle game service</li>
          <li>Track your progress and maintain leaderboards</li>
          <li>Deliver email notifications according to your subscription settings</li>
          <li>
            Analyze usage and gameplay results to improve the service and calibrate puzzle
            difficulty
          </li>
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
            <li>Account-related communications, such as password resets</li>
            <li>Achievement notifications for registered players</li>
          </ul>
          <p>
            <strong>Subscription controls:</strong> Creating an account on the website enables email
            notifications by default. You can turn off subscription emails by:
          </p>
          <ul>
            <li>Clicking the unsubscribe link in a subscription email</li>
            <li>
              Managing preferences in your{" "}
              <Link className="text-link underline underline-offset-4" href="/settings">
                settings
              </Link>
            </li>
          </ul>
          <p>
            These subscription controls are separate from account-related and achievement emails.
            The iOS app’s daily reminder is a local device notification; you can manage it in the
            app’s reminder settings or your device’s notification settings.
          </p>
        </div>
      </section>

      <section className="legal-section" id="third-party-services">
        <h2>5. Third-party services</h2>
        <p>We use the following third-party services that may process your data:</p>
        <div>
          <div>
            <h3>Resend</h3>
            <p>
              We use Resend to send transactional and notification emails. It processes recipient
              email addresses and email content. Achievement emails can include your username,
              achievement details, and progress.
            </p>
          </div>
          <div>
            <h3>Vercel</h3>
            <p>
              Vercel provides hosting and website analytics. Hosting services process request
              metadata, which can include IP addresses, requested paths, response status, and
              timing. Website analytics are separate from the account-linked gameplay and login
              events stored by Rebuzzle.
            </p>
          </div>
          <div>
            <h3>AI Gateway and model providers</h3>
            <p>
              Some submitted guesses are sent through Vercel AI Gateway to an AI model provider for
              answer checking. Eve’s short reactions also use a guess, puzzle type, and score
              category. These prompts do not intentionally include your account ID or email address,
              but anything you type in a guess may be included. Journal notes are not sent to these
              AI providers.
            </p>
            <p>
              The providers configured for these features include Google, with OpenAI and xAI
              available as answer-checking fallbacks. A request does not necessarily use every
              provider. Provider processing is separate from data stored in your Rebuzzle account.
            </p>
          </div>
          <div>
            <h3>Apple and Rebuzzle Plus</h3>
            <p>
              Apple processes purchases of Rebuzzle Plus. The iOS app checks purchase entitlements
              through StoreKit and does not ask for or receive your payment-card details. Plus
              access is required to sync journal notes with a registered Rebuzzle account. Restoring
              a purchase restores Plus access; Rebuzzle stores the synced note text, not Apple.
              Apple handles purchase records under its own policies.
            </p>
          </div>
          <div>
            <h3>MongoDB</h3>
            <p>
              We use MongoDB to store your account information, game statistics, account-linked
              journal notes for eligible Plus players, and analytics events. Journal note records
              contain the Rebuzzle account ID, puzzle ID, note text, revision number, and update
              time. We do not include note text in analytics or application logs.
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
          You can control website cookies through your browser settings, though this may affect
          functionality. The iOS app uses a sign-in token and persistent guest device identifier,
          and sends a timezone cookie with API requests. Browser cookie controls do not clear these
          app credentials or identifiers.
        </p>
      </section>

      <section className="legal-section" id="data-retention">
        <h2>7. Data retention</h2>
        <p>
          Account details, gameplay records, and statistics are stored to provide account access,
          progress, and service analytics. You can delete your account in the iOS app’s Settings or
          contact us about deleting your account and associated data.
        </p>
        <p>
          Daily engagement events are configured in our application code to expire from the
          application database after 90 days. We have not yet verified the live production
          expiration index, so this code-level schedule is not a guarantee that every deployed
          record expires on that timeline. Database backups and service logs may have separate
          retention schedules.
        </p>
        <p>
          Account deletion removes your account and associated records from the application
          collections covered by that process, including synced journal notes and native daily-
          funnel events. Public puzzle content may remain after creator attribution is removed.
          Export any journal you wish to keep before deleting your account. The app removes that
          account’s local files, but its installation identifier remains in the Keychain. If Plus
          access ends or is revoked, journal syncing stops; account-stored notes remain until
          account deletion and can be accessed again if Plus access is restored.
        </p>
        <p>
          This process does not delete Apple’s purchase records or independently erase records in
          external service logs or backups. We do not promise a fixed deletion period for those
          separate records. Contact us for questions about retention or a specific deletion request.
        </p>
      </section>

      <section className="legal-section" id="your-rights">
        <h2>8. Your rights</h2>
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
          We use HTTPS for app connections, password hashing for account credentials, and the iOS
          Keychain for the app’s sign-in token and device identifier. No security measure can
          guarantee that data will never be accessed without authorization.
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
