import { Button, Heading, Link, Section, Text, Hr } from "@react-email/components";
import { BaseEmail } from "./components/base-email";

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

const rarityColors = {
  common: { bg: "#f1f5f9", border: "#94a3b8", text: "#475569", label: "Common" },
  uncommon: { bg: "#dcfce7", border: "#22c55e", text: "#166534", label: "Uncommon" },
  rare: { bg: "#dbeafe", border: "#3b82f6", text: "#1e40af", label: "Rare" },
  epic: { bg: "#f3e8ff", border: "#a855f7", text: "#7c3aed", label: "Epic" },
  legendary: { bg: "#fef3c7", border: "#f59e0b", text: "#b45309", label: "Legendary" },
};

export function AchievementUnlockedEmail({
  username,
  email,
  achievementName,
  achievementDescription,
  achievementRarity,
  achievementPoints,
  achievementIcon,
  totalUnlocked,
  totalAchievements,
}: AchievementUnlockedEmailProps) {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://byronwade.com";
  const unsubscribeUrl = `${baseUrl}/unsubscribe?email=${encodeURIComponent(email)}`;
  const achievementsUrl = `${baseUrl}/achievements`;
  const rarity = rarityColors[achievementRarity];
  const progressPercentage = Math.round((totalUnlocked / totalAchievements) * 100);

  return (
    <BaseEmail
      preview={`You unlocked "${achievementName}"! ${achievementPoints} points earned.`}
      showUnsubscribe={true}
      unsubscribeUrl={unsubscribeUrl}
    >
      <Heading style={headingStyle}>Achievement Unlocked!</Heading>

      <Text style={textStyle}>Hey {username},</Text>

      <Text style={textStyle}>
        Congratulations! You've just unlocked a new achievement in Rebuzzle!
      </Text>

      {/* Achievement Card */}
      <Section style={{ ...achievementCardStyle, backgroundColor: rarity.bg, borderColor: rarity.border }}>
        <div style={achievementIconContainerStyle}>
          <span style={achievementIconStyle}>{getIconEmoji(achievementIcon)}</span>
        </div>
        <Heading as="h2" style={{ ...achievementNameStyle, color: rarity.text }}>
          {achievementName}
        </Heading>
        <Text style={achievementDescriptionStyle}>{achievementDescription}</Text>
        <div style={achievementMetaStyle}>
          <span style={{ ...rarityBadgeStyle, backgroundColor: rarity.border, color: "#ffffff" }}>
            {rarity.label}
          </span>
          <span style={pointsBadgeStyle}>+{achievementPoints} points</span>
        </div>
      </Section>

      {/* Progress Section */}
      <Section style={progressSectionStyle}>
        <Heading as="h3" style={progressHeadingStyle}>Your Progress</Heading>
        <div style={progressBarContainerStyle}>
          <div style={{ ...progressBarStyle, width: `${progressPercentage}%` }} />
        </div>
        <Text style={progressTextStyle}>
          {totalUnlocked} of {totalAchievements} achievements unlocked ({progressPercentage}%)
        </Text>
      </Section>

      <Section style={buttonSectionStyle}>
        <Button href={achievementsUrl} style={buttonStyle}>
          View All Achievements
        </Button>
      </Section>

      <Hr style={hrStyle} />

      <Section style={tipsSectionStyle}>
        <Heading as="h3" style={tipsHeadingStyle}>Keep Going!</Heading>
        <Text style={tipsTextStyle}>
          There are {totalAchievements - totalUnlocked} more achievements waiting to be unlocked.
          Keep solving puzzles to earn more rewards!
        </Text>
        <Text style={tipsTextStyle}>
          <strong>Pro tip:</strong> Build your daily streak to unlock streak-based achievements
          and climb the leaderboard!
        </Text>
      </Section>

      <Text style={textStyle}>
        Ready for more? Head to{" "}
        <Link href={baseUrl} style={linkStyle}>
          Rebuzzle
        </Link>{" "}
        and keep puzzling!
      </Text>

      <Text style={signatureStyle}>
        Happy puzzling!
        <br />
        The Rebuzzle Team
      </Text>
    </BaseEmail>
  );
}

function getIconEmoji(icon: string): string {
  const iconMap: Record<string, string> = {
    trophy: "🏆",
    star: "⭐",
    zap: "⚡",
    flame: "🔥",
    target: "🎯",
    clock: "⏱️",
    crown: "👑",
    gem: "💎",
    medal: "🥇",
    rocket: "🚀",
    brain: "🧠",
    lightning: "⚡",
    heart: "❤️",
    shield: "🛡️",
    sword: "⚔️",
    puzzle: "🧩",
    book: "📚",
    calendar: "📅",
    gift: "🎁",
    sparkles: "✨",
  };
  return iconMap[icon] || "🏆";
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

const achievementCardStyle = {
  borderRadius: "12px",
  padding: "24px",
  margin: "24px 0",
  textAlign: "center" as const,
  border: "2px solid",
};

const achievementIconContainerStyle = {
  marginBottom: "12px",
};

const achievementIconStyle = {
  fontSize: "48px",
  display: "block",
};

const achievementNameStyle = {
  fontSize: "24px",
  fontWeight: "700",
  margin: "0 0 8px",
};

const achievementDescriptionStyle = {
  fontSize: "14px",
  color: "#6b7280",
  margin: "0 0 16px",
};

const achievementMetaStyle = {
  display: "flex",
  justifyContent: "center",
  gap: "8px",
};

const rarityBadgeStyle = {
  padding: "4px 12px",
  borderRadius: "9999px",
  fontSize: "12px",
  fontWeight: "600",
  display: "inline-block",
};

const pointsBadgeStyle = {
  padding: "4px 12px",
  borderRadius: "9999px",
  fontSize: "12px",
  fontWeight: "600",
  backgroundColor: "#fef3c7",
  color: "#b45309",
  display: "inline-block",
};

const progressSectionStyle = {
  backgroundColor: "#f9fafb",
  borderRadius: "8px",
  padding: "20px",
  margin: "24px 0",
};

const progressHeadingStyle = {
  fontSize: "16px",
  fontWeight: "600",
  color: "#1f2937",
  margin: "0 0 12px",
  textAlign: "center" as const,
};

const progressBarContainerStyle = {
  backgroundColor: "#e5e7eb",
  borderRadius: "9999px",
  height: "8px",
  overflow: "hidden",
  marginBottom: "8px",
};

const progressBarStyle = {
  backgroundColor: "#8b5cf6",
  height: "100%",
  borderRadius: "9999px",
  transition: "width 0.3s ease",
};

const progressTextStyle = {
  fontSize: "14px",
  color: "#6b7280",
  textAlign: "center" as const,
  margin: "0",
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

const hrStyle = {
  borderTop: "1px solid #e5e7eb",
  margin: "32px 0",
};

const tipsSectionStyle = {
  backgroundColor: "#f0fdf4",
  borderLeft: "4px solid #22c55e",
  borderRadius: "4px",
  padding: "16px 20px",
  margin: "24px 0",
};

const tipsHeadingStyle = {
  fontSize: "18px",
  fontWeight: "600",
  color: "#166534",
  margin: "0 0 12px",
};

const tipsTextStyle = {
  fontSize: "14px",
  lineHeight: "1.6",
  color: "#15803d",
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
