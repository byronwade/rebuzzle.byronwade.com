/**
 * Home Screen
 * Main landing page with user stats, achievement progress, and navigation
 */

import { Link } from 'expo-router';
import { StyleSheet, Text, View, Pressable, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

// Hardcoded colors for now (dark theme)
const colors = {
  background: '#121212',
  foreground: '#EDEDED',
  card: '#1A1A1A',
  cardForeground: '#EDEDED',
  primary: '#FAFAFA',
  primaryForeground: '#171717',
  secondary: '#262626',
  secondaryForeground: '#FAFAFA',
  muted: '#262626',
  mutedForeground: '#999999',
  accent: '#FACC15',
  accentForeground: '#1A1A2E',
  border: '#333333',
  destructive: '#7F1D1D',
};

function hexToRgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export default function HomeScreen() {
  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.content}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerLeft} />
            <View style={styles.headerCenter}>
              <Text style={[styles.title, { color: colors.accent }]}>Rebuzzle</Text>
              <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
                The Daily Puzzle Challenge
              </Text>
            </View>
            <View style={styles.themeToggle}>
              <Text style={styles.themeToggleText}>🌙</Text>
            </View>
          </View>

          {/* Welcome Card */}
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.cardTitle, { color: colors.cardForeground }]}>Welcome!</Text>
            <Text style={[styles.cardText, { color: colors.mutedForeground }]}>
              Rebuzzle is a daily word puzzle game that challenges your creativity
              and lateral thinking.
            </Text>
          </View>

          <Link href="/game" asChild>
            <Pressable style={[styles.button, { backgroundColor: colors.accent }]}>
              <Text style={[styles.buttonText, { color: colors.accentForeground }]}>
                Play Today's Puzzle
              </Text>
            </Pressable>
          </Link>

          {/* Auth buttons */}
          <View style={styles.authButtons}>
            <Link href="/login" asChild>
              <Pressable
                style={[
                  styles.secondaryButton,
                  { backgroundColor: hexToRgba(colors.accent, 0.2) },
                ]}
              >
                <Text style={[styles.secondaryButtonText, { color: colors.accent }]}>
                  Sign In
                </Text>
              </Pressable>
            </Link>
            <Link href="/signup" asChild>
              <Pressable style={[styles.outlineButton, { borderColor: colors.border }]}>
                <Text style={[styles.outlineButtonText, { color: colors.foreground }]}>
                  Create Account
                </Text>
              </Pressable>
            </Link>
          </View>

          <View style={styles.features}>
            <FeatureItem emoji="🧩" text="Daily puzzles" colors={colors} />
            <FeatureItem emoji="🔥" text="Build streaks" colors={colors} />
            <FeatureItem emoji="🏆" text="Earn achievements" colors={colors} />
            <FeatureItem emoji="📊" text="Track progress" colors={colors} />
          </View>
        </View>

        <Text style={[styles.footer, { color: colors.mutedForeground }]}>© 2024 Rebuzzle</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

function FeatureItem({
  emoji,
  text,
  colors,
}: {
  emoji: string;
  text: string;
  colors: { muted: string; mutedForeground: string };
}) {
  return (
    <View style={[styles.featureItem, { backgroundColor: hexToRgba(colors.muted, 0.5) }]}>
      <Text style={styles.featureEmoji}>{emoji}</Text>
      <Text style={[styles.featureText, { color: colors.mutedForeground }]}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  content: {
    flex: 1,
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: 24,
  },
  headerLeft: {
    width: 44,
  },
  headerCenter: {
    alignItems: 'center',
    flex: 1,
  },
  themeToggle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  themeToggleText: {
    fontSize: 24,
  },
  title: {
    fontSize: 48,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 18,
    marginBottom: 8,
  },
  card: {
    borderRadius: 16,
    padding: 24,
    marginBottom: 32,
    width: '100%',
    borderWidth: 1,
  },
  cardTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  cardText: {
    fontSize: 16,
    lineHeight: 24,
  },
  userCard: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    width: '100%',
    borderWidth: 1,
  },
  userHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 12,
  },
  userInfo: {
    flex: 1,
  },
  username: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  userStats: {
    fontSize: 14,
    marginTop: 2,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingTop: 16,
    borderTopWidth: 1,
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  statLabel: {
    fontSize: 12,
    marginTop: 4,
  },
  achievementSection: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
  },
  achievementHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  achievementTitle: {
    fontSize: 14,
    fontWeight: '600',
  },
  achievementPercent: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  achievementProgressBar: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 8,
  },
  achievementProgressFill: {
    height: '100%',
    borderRadius: 3,
  },
  achievementSubtext: {
    fontSize: 12,
    textAlign: 'center',
  },
  recentAchievements: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 12,
    gap: 8,
  },
  recentBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
  },
  recentBadgeIcon: {
    fontSize: 18,
  },
  viewAllBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  viewAllText: {
    fontSize: 11,
    fontWeight: '600',
  },
  button: {
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 30,
    marginBottom: 16,
  },
  buttonText: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  authButtons: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  secondaryButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 20,
  },
  secondaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  outlineButton: {
    borderWidth: 1,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 20,
  },
  outlineButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  navLinks: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 12,
    marginBottom: 24,
  },
  navLink: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    gap: 6,
  },
  navLinkEmoji: {
    fontSize: 14,
  },
  navLinkText: {
    fontSize: 13,
    fontWeight: '600',
  },
  features: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 12,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
  },
  featureEmoji: {
    fontSize: 14,
    marginRight: 6,
  },
  featureText: {
    fontSize: 13,
  },
  footer: {
    fontSize: 12,
    textAlign: 'center',
    padding: 16,
  },
});
