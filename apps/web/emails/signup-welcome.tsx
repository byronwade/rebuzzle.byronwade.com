import { Button, Heading, Link, Section, Text } from "@react-email/components";
import { BaseEmail } from "./components/base-email";
import { appBaseUrl, styles } from "./components/theme";

interface SignupWelcomeEmailProps {
  username: string;
  email: string;
}

export function SignupWelcomeEmail({ username, email }: SignupWelcomeEmailProps) {
  const baseUrl = appBaseUrl();
  const unsubscribeUrl = `${baseUrl}/unsubscribe?email=${encodeURIComponent(email)}`;

  return (
    <BaseEmail
      kicker="Welcome"
      preview={`Welcome to Rebuzzle, ${username} — your first board is ready.`}
      showUnsubscribe={false}
      unsubscribeUrl={unsubscribeUrl}
    >
      <Text style={styles.eyebrow}>You&apos;re in</Text>
      <Heading style={styles.h1}>Welcome to the daily aha.</Heading>

      <Text style={styles.p}>Hi {username},</Text>
      <Text style={styles.p}>
        Rebuzzle is one visual word puzzle a day — pictures, placement, and sound that hide a
        familiar phrase. No subscriptions. No clutter. Just the click when it clicks.
      </Text>

      <Section style={styles.panelAccent}>
        <Text style={styles.h3}>How to settle in</Text>
        <Text style={styles.pSmall}>1. Play today&apos;s board — start a streak if you like.</Text>
        <Text style={styles.pSmall}>2. Use progressive hints when you&apos;re stuck (they cost points).</Text>
        <Text style={styles.pSmall}>
          3. Come back after local midnight for a new one — same calendar day as you.
        </Text>
        <Text style={{ ...styles.pSmall, marginBottom: 0 }}>
          4. Optional: turn on email reminders in settings when you want a nudge.
        </Text>
      </Section>

      <Section style={styles.ctaWrap}>
        <Button href={baseUrl} style={styles.cta}>
          Play your first puzzle
        </Button>
      </Section>

      <Text style={styles.p}>
        Curious how the AI builds boards? Peek at{" "}
        <Link href={`${baseUrl}/how-it-works#under-the-hood`} style={styles.link}>
          How it works
        </Link>
        .
      </Text>

      <Text style={styles.signature}>
        Happy puzzling,
        <br />
        Rebuzzle
      </Text>
    </BaseEmail>
  );
}
