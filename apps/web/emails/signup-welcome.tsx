import { Button, Heading, Link, Section, Text } from "@react-email/components";
import { BaseEmail } from "./components/base-email";

interface SignupWelcomeEmailProps {
  username: string;
  email: string;
}

export function SignupWelcomeEmail({
  username,
  email,
}: SignupWelcomeEmailProps) {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://byronwade.com";
  const unsubscribeUrl = `${baseUrl}/unsubscribe?email=${encodeURIComponent(email)}`;

  return (
    <BaseEmail
      preview={`Welcome to Rebuzzle, ${username}! Start solving puzzles today.`}
      showUnsubscribe={false}
      unsubscribeUrl={unsubscribeUrl}
    >
      <Heading style={headingStyle}>Welcome to Rebuzzle! 🎉</Heading>

      <Text style={textStyle}>Hi {username},</Text>

      <Text style={textStyle}>
        We're thrilled to have you join the Rebuzzle community! You're now part
        of a growing group of puzzle enthusiasts who love daily brain teasers.
      </Text>

      <Section style={infoBoxStyle}>
        <Heading as="h3" style={infoHeadingStyle}>
          What's Next?
        </Heading>
        <Text style={infoTextStyle}>
          • Solve today's puzzle and start earning points
        </Text>
        <Text style={infoTextStyle}>
          • Compete on the leaderboard with other players
        </Text>
        <Text style={infoTextStyle}>
          • Build your streak by solving puzzles daily
        </Text>
        <Text style={infoTextStyle}>• Unlock achievements as you progress</Text>
      </Section>

      <Section style={buttonSectionStyle}>
        <Button href={baseUrl} style={buttonStyle}>
          🧩 Play Your First Puzzle
        </Button>
      </Section>

      <Section style={tipsBoxStyle}>
        <Heading as="h3" style={tipsHeadingStyle}>
          Quick Tips
        </Heading>
        <Text style={tipsTextStyle}>
          <strong>Look for visual clues:</strong> Puzzles use visual wordplay
          and patterns.
        </Text>
        <Text style={tipsTextStyle}>
          <strong>Use hints wisely:</strong> Each hint reduces your final score,
          but can help when you're stuck.
        </Text>
        <Text style={tipsTextStyle}>
          <strong>Build your streak:</strong> Solve puzzles daily to maintain
          your streak and climb the leaderboard!
        </Text>
      </Section>

      <Text style={textStyle}>
        You'll receive daily puzzle notifications to keep you engaged. You can
        manage your email preferences in your{" "}
        <Link href={`${baseUrl}/settings`} style={linkStyle}>
          account settings
        </Link>
        .
      </Text>

      <Text style={textStyle}>
        Ready to start? Head over to{" "}
        <Link href={baseUrl} style={linkStyle}>
          Rebuzzle
        </Link>{" "}
        and solve your first puzzle!
      </Text>

      <Text style={signatureStyle}>
        Happy puzzling!
        <br />
        The Rebuzzle Team
      </Text>
    </BaseEmail>
  );
}

const headingStyle = {
  fontSize: "28px",
  fontWeight: "600",
  color: "#1f2937",
  margin: "0 0 20px",
  textAlign: "center" as const,
};

const textStyle = {
  fontSize: "16px",
  lineHeight: "1.6",
  color: "#374151",
  margin: "0 0 16px",
};

const infoBoxStyle = {
  backgroundColor: "#f3f4f6",
  borderRadius: "8px",
  padding: "20px",
  margin: "24px 0",
};

const infoHeadingStyle = {
  fontSize: "20px",
  fontWeight: "600",
  color: "#1f2937",
  margin: "0 0 12px",
};

const infoTextStyle = {
  fontSize: "15px",
  lineHeight: "1.6",
  color: "#4b5563",
  margin: "4px 0",
};

const buttonSectionStyle = {
  textAlign: "center" as const,
  margin: "32px 0",
};

const buttonStyle = {
  backgroundColor: "#8b5cf6",
  color: "#ffffff",
  padding: "14px 28px",
  borderRadius: "6px",
  textDecoration: "none",
  fontWeight: "600",
  fontSize: "16px",
  display: "inline-block",
};

const tipsBoxStyle = {
  backgroundColor: "#fef3c7",
  borderLeft: "4px solid #f59e0b",
  borderRadius: "4px",
  padding: "16px 20px",
  margin: "24px 0",
};

const tipsHeadingStyle = {
  fontSize: "18px",
  fontWeight: "600",
  color: "#92400e",
  margin: "0 0 12px",
};

const tipsTextStyle = {
  fontSize: "14px",
  lineHeight: "1.6",
  color: "#78350f",
  margin: "8px 0",
};

const linkStyle = {
  color: "#8b5cf6",
  textDecoration: "underline",
};

const signatureStyle = {
  fontSize: "16px",
  lineHeight: "1.6",
  color: "#6b7280",
  margin: "32px 0 0",
  fontStyle: "italic",
};

