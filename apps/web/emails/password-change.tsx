import { Button, Heading, Link, Section, Text } from "@react-email/components";
import { BaseEmail } from "./components/base-email";
import { appBaseUrl, colors, styles } from "./components/theme";

interface PasswordChangeEmailProps {
  username: string;
  timestamp: Date;
  ipAddress?: string;
}

export function PasswordChangeEmail({ username, timestamp, ipAddress }: PasswordChangeEmailProps) {
  const baseUrl = appBaseUrl();
  const formattedDate = timestamp.toLocaleString("en-US", {
    dateStyle: "long",
    timeStyle: "short",
  });
  const resetPasswordUrl = `${baseUrl}/forgot-password`;

  return (
    <BaseEmail
      kicker="Account security"
      preview="Your Rebuzzle password was changed"
      showUnsubscribe={false}
    >
      <Text style={styles.eyebrow}>Password updated</Text>
      <Heading style={styles.h1}>Your password just changed.</Heading>

      <Text style={styles.p}>Hi {username},</Text>
      <Text style={styles.p}>
        This confirms a successful password change on your Rebuzzle account. If that was you,
        you&apos;re done — you can ignore the rest.
      </Text>

      <Section style={styles.panel}>
        <Text style={styles.h3}>Details</Text>
        <Text style={styles.pSmall}>When: {formattedDate}</Text>
        {ipAddress ? (
          <Text style={{ ...styles.pSmall, marginBottom: 0 }}>Approx. IP: {ipAddress}</Text>
        ) : (
          <Text style={{ ...styles.pSmall, marginBottom: 0 }}>IP unavailable for this event.</Text>
        )}
      </Section>

      <Section style={styles.panelDanger}>
        <Text style={styles.h3}>Wasn&apos;t you?</Text>
        <Text style={dangerTextStyle}>
          Reset the password immediately and review{" "}
          <Link href={`${baseUrl}/settings`} style={{ ...styles.link, color: colors.dangerInk }}>
            account settings
          </Link>{" "}
          for anything unexpected.
        </Text>
      </Section>

      <Section style={styles.ctaWrap}>
        <Button href={resetPasswordUrl} style={styles.cta}>
          Reset password now
        </Button>
      </Section>
    </BaseEmail>
  );
}

const dangerTextStyle = {
  margin: "0",
  fontSize: "14px",
  lineHeight: "1.55",
  color: colors.dangerInk,
};
