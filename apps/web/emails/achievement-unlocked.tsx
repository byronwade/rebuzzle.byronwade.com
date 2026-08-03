import { Button, Heading, Link, Section, Text } from "@react-email/components";
import { BaseEmail } from "./components/base-email";
import { appBaseUrl, colors, fonts, styles } from "./components/theme";

interface AchievementUnlockedEmailProps {
  username: string;
  email: string;
  achievementName: string;
  achievementDescription: string;
  achievementRarity: "common" | "uncommon" | "rare" | "epic" | "legendary";
  achievementPoints: number;
  achievementIcon: string;
  totalUnlocked: number;
  totalAchievements: number;
}

const rarityStyles = {
  common: { label: "Common", ink: colors.muted, bg: colors.inset },
  uncommon: { label: "Uncommon", ink: colors.inkSoft, bg: colors.inset },
  rare: { label: "Rare", ink: colors.linkDeep, bg: "#eef5ff" },
  epic: { label: "Epic", ink: colors.ink, bg: colors.inset },
  legendary: { label: "Legendary", ink: colors.warnInk, bg: colors.warnBg },
} as const;

export function AchievementUnlockedEmail({
  username,
  email,
  achievementName,
  achievementDescription,
  achievementRarity,
  achievementPoints,
  achievementIcon: _achievementIcon,
  totalUnlocked,
  totalAchievements,
}: AchievementUnlockedEmailProps) {
  const baseUrl = appBaseUrl();
  const unsubscribeUrl = `${baseUrl}/unsubscribe?email=${encodeURIComponent(email)}`;
  const achievementsUrl = `${baseUrl}/achievements`;
  const rarity = rarityStyles[achievementRarity];
  const remaining = Math.max(0, totalAchievements - totalUnlocked);
  const progressPercentage =
    totalAchievements > 0 ? Math.round((totalUnlocked / totalAchievements) * 100) : 0;

  return (
    <BaseEmail
      kicker="Achievement"
      preview={`Unlocked: ${achievementName} (+${achievementPoints} pts)`}
      showUnsubscribe
      unsubscribeUrl={unsubscribeUrl}
    >
      <Text style={styles.eyebrow}>New unlock</Text>
      <Heading style={styles.h1}>You just earned a mark.</Heading>

      <Text style={styles.p}>Hey {username},</Text>
      <Text style={styles.p}>
        Something you did on the board unlocked a fresh achievement. Wear it proudly — then chase
        the next one.
      </Text>

      <Section
        style={{
          ...styles.panel,
          backgroundColor: rarity.bg,
          textAlign: "center" as const,
          padding: "28px 22px",
        }}
      >
        <Text style={{ ...styles.eyebrow, color: rarity.ink }}>{rarity.label}</Text>
        <Heading as="h2" style={{ ...styles.h2, color: rarity.ink, marginBottom: "8px" }}>
          {achievementName}
        </Heading>
        <Text style={{ ...styles.pSmall, color: rarity.ink, marginBottom: "14px" }}>
          {achievementDescription}
        </Text>
        <Text style={pointsStyle}>+{achievementPoints} points</Text>
      </Section>

      <Section style={styles.panel}>
        <Text style={styles.h3}>Collection progress</Text>
        <Section style={trackStyle}>
          <Section style={{ ...fillStyle, width: `${Math.min(100, progressPercentage)}%` }} />
        </Section>
        <Text style={{ ...styles.pSmall, marginBottom: 0 }}>
          {totalUnlocked} of {totalAchievements} unlocked ({progressPercentage}%)
          {remaining > 0 ? ` · ${remaining} still hiding` : " · set complete"}
        </Text>
      </Section>

      <Section style={styles.ctaWrap}>
        <Button href={achievementsUrl} style={styles.cta}>
          View achievements
        </Button>
      </Section>

      <Text style={styles.p}>
        Back to the board:{" "}
        <Link href={baseUrl} style={styles.link}>
          today&apos;s puzzle
        </Link>
        .
      </Text>

      <Text style={styles.signature}>
        Keep going,
        <br />
        Rebuzzle
      </Text>
    </BaseEmail>
  );
}

const pointsStyle = {
  margin: "0",
  display: "inline-block",
  padding: "6px 12px",
  backgroundColor: colors.ink,
  color: colors.onInk,
  borderRadius: "999px",
  fontFamily: fonts.mono,
  fontSize: "11px",
  fontWeight: "500" as const,
  letterSpacing: "0.1em",
  textTransform: "uppercase" as const,
};

const trackStyle = {
  backgroundColor: colors.line,
  borderRadius: "999px",
  height: "6px",
  margin: "0 0 10px",
  overflow: "hidden" as const,
};

const fillStyle = {
  backgroundColor: colors.ink,
  height: "6px",
  borderRadius: "999px",
};
