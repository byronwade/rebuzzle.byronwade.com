import { Button, Heading, Link, Section, Text } from "@react-email/components";
import { BaseEmail } from "./components/base-email";

interface StreakAtRiskEmailProps {
  username?: string;
  currentStreak: number;
  puzzleUrl: string;
  unsubscribeUrl?: string;
}

/**
 * Streak At Risk Email
 *
 * Psychology: Loss aversion - people feel losses 2x more than gains.
 * Subtle approach: Encouraging without guilt-tripping or pressure.
 */
export function StreakAtRiskEmail({
  username,
  currentStreak,
  puzzleUrl,
  unsubscribeUrl,
}: StreakAtRiskEmailProps) {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://byronwade.com";
  const greeting = username ? `Hi ${username},` : "Hi there,";

  // Dynamic messaging based on streak length
  const getStreakMessage = () => {
    if (currentStreak >= 30) {
      return {
        emoji: "🏆",
        headline: "Don't let your incredible streak slip away!",
        body: `You've built an amazing ${currentStreak}-day streak - that's truly impressive dedication! Today's puzzle is waiting.`,
      };
    }
    if (currentStreak >= 14) {
      return {
        emoji: "🔥",
        headline: "Your streak is on fire!",
        body: `${currentStreak} days strong! You're on an incredible run. Keep the momentum going with today's puzzle.`,
      };
    }
    if (currentStreak >= 7) {
      return {
        emoji: "⚡",
        headline: "One week milestone in sight!",
        body: `You're at ${currentStreak} days - that's a solid streak! Just a quick puzzle to keep it alive.`,
      };
    }
    return {
      emoji: "✨",
      headline: "Your streak is building nicely!",
      body: `${currentStreak} days and counting! Each day adds to your achievement. Today's puzzle is ready.`,
    };
  };

  const { emoji, headline, body } = getStreakMessage();

  return (
    <BaseEmail
      preview={`${emoji} Your ${currentStreak}-day streak needs you!`}
      showUnsubscribe={true}
      unsubscribeUrl={unsubscribeUrl}
    >
      <Heading style={headingStyle}>
        {emoji} {headline}
      </Heading>

      <Text style={textStyle}>{greeting}</Text>

      <Text style={textStyle}>{body}</Text>

      <Section style={streakBoxStyle}>
        <Text style={streakNumberStyle}>{currentStreak}</Text>
        <Text style={streakLabelStyle}>Day Streak</Text>
      </Section>

      <Section style={buttonSectionStyle}>
        <Button href={puzzleUrl} style={buttonStyle}>
          🎮 Play Today's Puzzle
        </Button>
      </Section>

      <Section style={tipsBoxStyle}>
        <Heading as="h3" style={tipsHeadingStyle}>
          Quick Tips:
        </Heading>
        <Text style={tipTextStyle}>• Today's puzzle takes just 2-5 minutes</Text>
        <Text style={tipTextStyle}>• You have unlimited attempts</Text>
        <Text style={tipTextStyle}>• Your streak resets at midnight</Text>
      </Section>

      <Section style={linksSectionStyle}>
        <Link href={`${baseUrl}/leaderboard`} style={linkStyle}>
          Streak Leaderboard
        </Link>
        {" • "}
        <Link href={`${baseUrl}/profile`} style={linkStyle}>
          Your Stats
        </Link>
        {" • "}
        <Link href={`${baseUrl}/settings`} style={linkStyle}>
          Notification Settings
        </Link>
      </Section>

      <Text style={footerNoteStyle}>
        No pressure - we just thought you'd want to know! If you're busy today,
        that's totally fine. There's always tomorrow for a fresh start.
      </Text>
    </BaseEmail>
  );
}

const headingStyle = {
  fontSize: "26px",
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

const streakBoxStyle = {
  backgroundColor: "#fef3c7",
  borderRadius: "12px",
  padding: "24px",
  margin: "24px 0",
  textAlign: "center" as const,
  border: "2px solid #fbbf24",
};

const streakNumberStyle = {
  fontSize: "48px",
  fontWeight: "700",
  color: "#d97706",
  margin: "0",
  lineHeight: "1",
};

const streakLabelStyle = {
  fontSize: "16px",
  fontWeight: "600",
  color: "#92400e",
  margin: "8px 0 0",
  textTransform: "uppercase" as const,
  letterSpacing: "1px",
};

const buttonSectionStyle = {
  textAlign: "center" as const,
  margin: "32px 0",
};

const buttonStyle = {
  backgroundColor: "#f59e0b",
  color: "#ffffff",
  padding: "14px 28px",
  borderRadius: "6px",
  textDecoration: "none",
  fontWeight: "600",
  fontSize: "16px",
  display: "inline-block",
};

const tipsBoxStyle = {
  backgroundColor: "#f3f4f6",
  borderRadius: "8px",
  padding: "16px 20px",
  margin: "24px 0",
};

const tipsHeadingStyle = {
  fontSize: "16px",
  fontWeight: "600",
  color: "#1f2937",
  margin: "0 0 8px",
};

const tipTextStyle = {
  fontSize: "14px",
  lineHeight: "1.5",
  color: "#4b5563",
  margin: "4px 0",
};

const linksSectionStyle = {
  textAlign: "center" as const,
  margin: "24px 0",
  fontSize: "14px",
};

const linkStyle = {
  color: "#f59e0b",
  textDecoration: "underline",
};

const footerNoteStyle = {
  fontSize: "13px",
  lineHeight: "1.5",
  color: "#9ca3af",
  textAlign: "center" as const,
  margin: "24px 0 0",
  fontStyle: "italic",
};
