import { Button, Heading, Link, Section, Text } from "@react-email/components";
import { BaseEmail } from "./components/base-email";

interface DailyPuzzleEmailProps {
  username?: string;
  puzzleUrl: string;
  puzzleType?: string;
  difficulty?: string;
  unsubscribeUrl?: string;
}

export function DailyPuzzleEmail({
  username,
  puzzleUrl,
  puzzleType,
  difficulty,
  unsubscribeUrl,
}: DailyPuzzleEmailProps) {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://byronwade.com";
  const greeting = username ? `Hi ${username},` : "Hi there,";

  return (
    <BaseEmail
      preview="🎯 Today's Rebuzzle is ready! Start solving now."
      showUnsubscribe={true}
      unsubscribeUrl={unsubscribeUrl}
    >
      <Heading style={headingStyle}>🎯 Today's Rebuzzle is Ready!</Heading>

      <Text style={textStyle}>{greeting}</Text>

      <Text style={textStyle}>
        A fresh puzzle is waiting for you! Start your day with a brain-teasing
        challenge.
      </Text>

      <Section style={infoBoxStyle}>
        <Heading as="h3" style={infoHeadingStyle}>
          Today's Challenge:
        </Heading>
        {puzzleType && (
          <Text style={infoTextStyle}>
            <strong>Type:</strong> {puzzleType}
          </Text>
        )}
        {difficulty && (
          <Text style={infoTextStyle}>
            <strong>Difficulty:</strong> {difficulty}
          </Text>
        )}
        <Text style={infoTextStyle}>• New puzzle every day</Text>
        <Text style={infoTextStyle}>• Unlimited attempts</Text>
        <Text style={infoTextStyle}>• Compare your time with others</Text>
      </Section>

      <Section style={buttonSectionStyle}>
        <Button href={puzzleUrl} style={buttonStyle}>
          🎮 Play Now
        </Button>
      </Section>

      <Section style={linksSectionStyle}>
        <Link href={`${baseUrl}/leaderboard`} style={linkStyle}>
          View Leaderboard
        </Link>
        {" • "}
        <Link href={`${baseUrl}/blog`} style={linkStyle}>
          Read Blog
        </Link>
        {" • "}
        <Link href={`${baseUrl}/profile`} style={linkStyle}>
          Your Profile
        </Link>
      </Section>

      <Text style={footerNoteStyle}>
        Keep your streak alive by solving today's puzzle! 🔥
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

const linksSectionStyle = {
  textAlign: "center" as const,
  margin: "24px 0",
  fontSize: "14px",
};

const linkStyle = {
  color: "#8b5cf6",
  textDecoration: "underline",
};

const footerNoteStyle = {
  fontSize: "14px",
  lineHeight: "1.6",
  color: "#6b7280",
  textAlign: "center" as const,
  margin: "24px 0 0",
  fontStyle: "italic",
};

