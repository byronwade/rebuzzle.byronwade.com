import { Button, Heading, Link, Section, Text } from "@react-email/components";
import { BaseEmail } from "./components/base-email";
import { appBaseUrl, colors, fonts, styles } from "./components/theme";

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
  const baseUrl = appBaseUrl();
  const greeting = username ? `${username},` : "Friend,";

  return (
    <BaseEmail
      kicker="Daily puzzle"
      preview="Today's Rebuzzle is live — one board, local midnight to local midnight."
      showUnsubscribe
      unsubscribeUrl={unsubscribeUrl}
    >
      <Text style={styles.eyebrow}>Ready when you are</Text>
      <Heading style={styles.h1}>Today&apos;s board is waiting.</Heading>

      <Text style={styles.p}>
        {greeting} a fresh visual puzzle just unlocked. Same rules as always: see it, say it, solve
        it — before your next local midnight.
      </Text>

      <Section style={styles.panel}>
        <Text style={styles.h3}>Today&apos;s challenge</Text>
        {puzzleType ? (
          <Text style={metaRowStyle}>
            <span style={metaLabelStyle}>Type</span> {puzzleType}
          </Text>
        ) : null}
        {difficulty ? (
          <Text style={metaRowStyle}>
            <span style={metaLabelStyle}>Feel</span> {difficulty}
          </Text>
        ) : null}
        <Text style={{ ...styles.pSmall, marginBottom: 0 }}>
          Progressive hints if you need them. Spoiler-free sharing when you finish.
        </Text>
      </Section>

      <Section style={styles.ctaWrap}>
        <Button href={puzzleUrl} style={styles.cta}>
          Open today&apos;s puzzle
        </Button>
      </Section>

      <Text style={{ ...styles.pSmall, textAlign: "center" as const, marginTop: "18px" }}>
        <Link href={`${baseUrl}/leaderboard`} style={styles.link}>
          Leaderboard
        </Link>
        {" · "}
        <Link href={`${baseUrl}/profile`} style={styles.link}>
          Your stats
        </Link>
        {" · "}
        <Link href={`${baseUrl}/blog`} style={styles.link}>
          Blog
        </Link>
      </Text>
    </BaseEmail>
  );
}

const metaRowStyle = {
  margin: "0 0 6px",
  fontSize: "15px",
  lineHeight: "1.5",
  color: colors.inkSoft,
};

const metaLabelStyle = {
  display: "inline-block",
  minWidth: "48px",
  fontFamily: fonts.mono,
  fontSize: "11px",
  letterSpacing: "0.1em",
  textTransform: "uppercase" as const,
  color: colors.subtle,
  marginRight: "10px",
};
