import { Button, Heading, Section, Text } from "@react-email/components";
import { BaseEmail } from "./components/base-email";
import { colors, fonts, styles } from "./components/theme";

interface PasswordResetEmailProps {
  username: string;
  resetUrl: string;
  expiryHours?: number;
}

export function PasswordResetEmail({
  username,
  resetUrl,
  expiryHours = 1,
}: PasswordResetEmailProps) {
  return (
    <BaseEmail kicker="Account security" preview="Reset your Rebuzzle password" showUnsubscribe={false}>
      <Text style={styles.eyebrow}>Password reset</Text>
      <Heading style={styles.h1}>Choose a new password.</Heading>

      <Text style={styles.p}>Hi {username},</Text>
      <Text style={styles.p}>
        Someone asked to reset the password on this account. If that was you, use the button below.
        If it wasn&apos;t, you can ignore this — nothing changes until the link is used.
      </Text>

      <Section style={styles.ctaWrap}>
        <Button href={resetUrl} style={styles.cta}>
          Reset password
        </Button>
      </Section>

      <Text style={styles.pSmall}>Or paste this link into your browser:</Text>
      <Text style={linkBoxStyle}>{resetUrl}</Text>

      <Section style={styles.panelDanger}>
        <Text style={styles.h3}>Security notes</Text>
        <Text style={dangerTextStyle}>
          This link expires in {expiryHours} hour{expiryHours === 1 ? "" : "s"}.
        </Text>
        <Text style={dangerTextStyle}>Never share it. We will never ask for your password.</Text>
        <Text style={{ ...dangerTextStyle, marginBottom: 0 }}>
          If you didn&apos;t request this, no action is needed.
        </Text>
      </Section>
    </BaseEmail>
  );
}

const linkBoxStyle = {
  margin: "0 0 20px",
  padding: "12px 14px",
  backgroundColor: colors.inset,
  border: `1px solid ${colors.line}`,
  borderRadius: "8px",
  fontFamily: fonts.mono,
  fontSize: "12px",
  lineHeight: "1.5",
  color: colors.muted,
  wordBreak: "break-all" as const,
};

const dangerTextStyle = {
  margin: "0 0 6px",
  fontSize: "14px",
  lineHeight: "1.55",
  color: colors.dangerInk,
};
