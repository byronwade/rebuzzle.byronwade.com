import { Button, Heading, Link, Section, Text } from "@react-email/components";
import { BaseEmail } from "./components/base-email";
import { appBaseUrl, styles } from "./components/theme";

interface NotificationWelcomeEmailProps {
  email: string;
  unsubscribeUrl?: string;
}

export function NotificationWelcomeEmail({
  email: _email,
  unsubscribeUrl,
}: NotificationWelcomeEmailProps) {
  const baseUrl = appBaseUrl();

  return (
    <BaseEmail
      kicker="Notifications"
      preview="You're subscribed — we'll nudge you when a new board is worth opening."
      showUnsubscribe
      unsubscribeUrl={unsubscribeUrl}
    >
      <Text style={styles.eyebrow}>You&apos;re on the list</Text>
      <Heading style={styles.h1}>We&apos;ll ping you for the good stuff.</Heading>

      <Text style={styles.p}>
        Thanks for opting in. Expect calm, useful mail — not a firehose.
      </Text>

      <Section style={styles.panel}>
        <Text style={styles.h3}>What we send</Text>
        <Text style={styles.pSmall}>Daily puzzle-ready reminders (around 4 PM UTC)</Text>
        <Text style={styles.pSmall}>Occasional blog posts about yesterday&apos;s board</Text>
        <Text style={{ ...styles.pSmall, marginBottom: 0 }}>
          Streak nudges only when it might actually help
        </Text>
      </Section>

      <Text style={styles.p}>
        The puzzle itself unlocks at <strong>your local midnight</strong>. Reminders are a courtesy
        so you don&apos;t miss the window.
      </Text>

      <Section style={styles.ctaWrap}>
        <Button href={baseUrl} style={styles.cta}>
          Open today&apos;s puzzle
        </Button>
      </Section>

      <Text style={styles.pSmall}>
        Change your mind anytime in{" "}
        <Link href={`${baseUrl}/settings`} style={styles.link}>
          settings
        </Link>
        {unsubscribeUrl ? (
          <>
            {" "}
            or{" "}
            <Link href={unsubscribeUrl} style={styles.link}>
              unsubscribe
            </Link>
          </>
        ) : null}
        .
      </Text>
    </BaseEmail>
  );
}
