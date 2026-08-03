import { Button, Heading, Link, Section, Text } from "@react-email/components";
import { BaseEmail } from "./components/base-email";
import { appBaseUrl, colors, fonts, styles } from "./components/theme";

interface StreakAtRiskEmailProps {
  username?: string;
  currentStreak: number;
  puzzleUrl: string;
  unsubscribeUrl?: string;
}

/**
 * Soft loss-aversion nudge — encouraging, never guilt-heavy.
 */
export function StreakAtRiskEmail({
  username,
  currentStreak,
  puzzleUrl,
  unsubscribeUrl,
}: StreakAtRiskEmailProps) {
  const baseUrl = appBaseUrl();
  const greeting = username ? `${username},` : "Hey,";

  const copy =
    currentStreak >= 30
      ? {
          eyebrow: "Legendary run",
          headline: "A rare streak is still open today.",
          body: `You've kept ${currentStreak} days in a row. Today's board is the only thing between that chain and a quiet reset at local midnight.`,
        }
      : currentStreak >= 14
        ? {
            eyebrow: "Two-week heat",
            headline: "Your streak still has a pulse.",
            body: `${currentStreak} days in. One short solve keeps the rhythm — no heroics required.`,
          }
        : currentStreak >= 7
          ? {
              eyebrow: "Week locked in",
              headline: "Don't let a good week go quiet.",
              body: `You're at ${currentStreak} days. Today's puzzle is usually a few minutes — then you're clear until tomorrow.`,
            }
          : {
              eyebrow: "Streak watch",
              headline: "Today's board can keep the chain.",
              body: `${currentStreak} day${currentStreak === 1 ? "" : "s"} so far. Pop in when you have a spare moment.`,
            };

  return (
    <BaseEmail
      kicker="Streak"
      preview={`Your ${currentStreak}-day streak is still open until local midnight.`}
      showUnsubscribe
      unsubscribeUrl={unsubscribeUrl}
    >
      <Text style={styles.eyebrow}>{copy.eyebrow}</Text>
      <Heading style={styles.h1}>{copy.headline}</Heading>

      <Text style={styles.p}>
        {greeting} {copy.body}
      </Text>

      <Section style={streakPanelStyle}>
        <Text style={streakNumberStyle}>{currentStreak}</Text>
        <Text style={streakLabelStyle}>Day streak</Text>
      </Section>

      <Section style={styles.ctaWrap}>
        <Button href={puzzleUrl} style={styles.ctaAccent}>
          Keep the streak
        </Button>
      </Section>

      <Text style={{ ...styles.pSmall, textAlign: "center" as const }}>
        No pressure if today&apos;s chaos wins. Fresh board tomorrow either way.
      </Text>

      <Text style={{ ...styles.pSmall, textAlign: "center" as const, marginTop: "16px" }}>
        <Link href={`${baseUrl}/profile`} style={styles.link}>
          Your stats
        </Link>
        {" · "}
        <Link href={`${baseUrl}/settings`} style={styles.link}>
          Notification settings
        </Link>
      </Text>
    </BaseEmail>
  );
}

const streakPanelStyle = {
  ...styles.panelWarn,
  textAlign: "center" as const,
  padding: "28px 20px",
};

const streakNumberStyle = {
  margin: "0",
  fontFamily: fonts.serif,
  fontSize: "56px",
  fontWeight: "700" as const,
  lineHeight: "1",
  letterSpacing: "-0.03em",
  color: colors.ink,
};

const streakLabelStyle = {
  margin: "10px 0 0",
  fontFamily: fonts.mono,
  fontSize: "11px",
  letterSpacing: "0.16em",
  textTransform: "uppercase" as const,
  color: colors.warnInk,
};
