/**
 * Home Screen
 * Main landing page with user stats, achievement progress, and navigation
 */

import { Link } from 'expo-router';
import { StyleSheet, Text, View, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../src/contexts/AuthContext';
import { useAchievements } from '../src/contexts/AchievementsContext';
import { useOffline } from '../src/contexts/OfflineContext';
import { AvatarCircle } from '../src/components/AvatarCircle';
import { OfflineIndicator } from '../src/components/OfflineIndicator';

export default function HomeScreen() {
  const { isAuthenticated, user, stats } = useAuth();
  const { progress, achievements } = useAchievements();
  const { isOnline } = useOffline();

  // Get recent unlocked achievements (last 3)
  const recentAchievements = achievements
    .filter((a) => a.unlocked)
    .sort((a, b) => {
      const dateA = a.unlockedAt ? new Date(a.unlockedAt).getTime() : 0;
      const dateB = b.unlockedAt ? new Date(b.unlockedAt).getTime() : 0;
      return dateB - dateA;
    })
    .slice(0, 3);

  const achievementPercentage = progress
    ? Math.round((progress.unlocked / progress.total) * 100)
    : 0;

  return (
    <SafeAreaView style={styles.container}>
      {/* Offline Indicator */}
      {!isOnline && <OfflineIndicator />}

      <View style={styles.content}>
        <Text style={styles.title}>Rebuzzle</Text>
        <Text style={styles.subtitle}>The Daily Puzzle Challenge</Text>

        {/* User Card - shown when authenticated */}
        {isAuthenticated && user ? (
          <View style={styles.userCard}>
            <View style={styles.userHeader}>
              <AvatarCircle
                username={user.username}
                customInitials={user.avatarCustomInitials}
                colorIndex={user.avatarColorIndex}
                size={56}
              />
              <View style={styles.userInfo}>
                <Text style={styles.username}>
                  {user.isGuest ? 'Guest' : user.username}
                </Text>
                {stats && (
                  <Text style={styles.userStats}>
                    Level {stats.level || 1} • {stats.streak || 0} day streak
                  </Text>
                )}
              </View>
            </View>

            {/* Stats Row */}
            {stats && (
              <View style={styles.statsRow}>
                <View style={styles.statItem}>
                  <Text style={styles.statValue}>{stats.wins || 0}</Text>
                  <Text style={styles.statLabel}>Solved</Text>
                </View>
                <View style={styles.statItem}>
                  <Text style={styles.statValue}>{stats.points || 0}</Text>
                  <Text style={styles.statLabel}>Score</Text>
                </View>
                <View style={styles.statItem}>
                  <Text style={styles.statValue}>{stats.streak || 0}</Text>
                  <Text style={styles.statLabel}>Streak</Text>
                </View>
              </View>
            )}

            {/* Achievement Progress */}
            {progress && progress.total > 0 && (
              <View style={styles.achievementSection}>
                <View style={styles.achievementHeader}>
                  <Text style={styles.achievementTitle}>Achievements</Text>
                  <Text style={styles.achievementPercent}>{achievementPercentage}%</Text>
                </View>
                <View style={styles.achievementProgressBar}>
                  <View
                    style={[
                      styles.achievementProgressFill,
                      { width: `${achievementPercentage}%` },
                    ]}
                  />
                </View>
                <Text style={styles.achievementSubtext}>
                  {progress.unlocked}/{progress.total} unlocked • {progress.earnedPoints} pts
                </Text>

                {/* Recent Achievements */}
                {recentAchievements.length > 0 && (
                  <View style={styles.recentAchievements}>
                    {recentAchievements.map((achievement) => (
                      <View key={achievement.id} style={styles.recentBadge}>
                        <Text style={styles.recentBadgeIcon}>{achievement.icon}</Text>
                      </View>
                    ))}
                    <Link href="/achievements" asChild>
                      <Pressable style={styles.viewAllBadge}>
                        <Text style={styles.viewAllText}>+{progress.total - recentAchievements.length}</Text>
                      </Pressable>
                    </Link>
                  </View>
                )}
              </View>
            )}
          </View>
        ) : (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Welcome!</Text>
            <Text style={styles.cardText}>
              Rebuzzle is a daily word puzzle game that challenges your creativity
              and lateral thinking.
            </Text>
          </View>
        )}

        <Link href="/game" asChild>
          <Pressable style={styles.button}>
            <Text style={styles.buttonText}>Play Today's Puzzle</Text>
          </Pressable>
        </Link>

        {/* Auth buttons when not logged in */}
        {!isAuthenticated && (
          <View style={styles.authButtons}>
            <Link href="/login" asChild>
              <Pressable style={styles.secondaryButton}>
                <Text style={styles.secondaryButtonText}>Sign In</Text>
              </Pressable>
            </Link>
            <Link href="/signup" asChild>
              <Pressable style={styles.outlineButton}>
                <Text style={styles.outlineButtonText}>Create Account</Text>
              </Pressable>
            </Link>
          </View>
        )}

        {/* Navigation links when logged in */}
        {isAuthenticated && (
          <View style={styles.navLinks}>
            <Link href="/profile" asChild>
              <Pressable style={styles.navLink}>
                <Text style={styles.navLinkEmoji}>👤</Text>
                <Text style={styles.navLinkText}>Profile</Text>
              </Pressable>
            </Link>
            <Link href="/leaderboard" asChild>
              <Pressable style={styles.navLink}>
                <Text style={styles.navLinkEmoji}>🏆</Text>
                <Text style={styles.navLinkText}>Leaderboard</Text>
              </Pressable>
            </Link>
            <Link href="/achievements" asChild>
              <Pressable style={styles.navLink}>
                <Text style={styles.navLinkEmoji}>🎖️</Text>
                <Text style={styles.navLinkText}>Achievements</Text>
              </Pressable>
            </Link>
          </View>
        )}

        <View style={styles.features}>
          <FeatureItem emoji="🧩" text="Daily puzzles" />
          <FeatureItem emoji="🔥" text="Build streaks" />
          <FeatureItem emoji="🏆" text="Earn achievements" />
          <FeatureItem emoji="📊" text="Track progress" />
        </View>
      </View>

      <Text style={styles.footer}>© 2024 Rebuzzle</Text>
    </SafeAreaView>
  );
}

function FeatureItem({ emoji, text }: { emoji: string; text: string }) {
  return (
    <View style={styles.featureItem}>
      <Text style={styles.featureEmoji}>{emoji}</Text>
      <Text style={styles.featureText}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a2e',
  },
  content: {
    flex: 1,
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#facc15',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 18,
    color: '#94a3b8',
    marginBottom: 32,
  },
  card: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 16,
    padding: 24,
    marginBottom: 32,
    width: '100%',
  },
  cardTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 12,
  },
  cardText: {
    fontSize: 16,
    color: '#cbd5e1',
    lineHeight: 24,
  },
  userCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    width: '100%',
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
    color: '#fff',
  },
  userStats: {
    fontSize: 14,
    color: '#94a3b8',
    marginTop: 2,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#facc15',
  },
  statLabel: {
    fontSize: 12,
    color: '#94a3b8',
    marginTop: 4,
  },
  achievementSection: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
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
    color: '#facc15',
  },
  achievementPercent: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#fff',
  },
  achievementProgressBar: {
    height: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 8,
  },
  achievementProgressFill: {
    height: '100%',
    backgroundColor: '#facc15',
    borderRadius: 3,
  },
  achievementSubtext: {
    fontSize: 12,
    color: '#64748b',
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
    backgroundColor: 'rgba(250, 204, 21, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(250, 204, 21, 0.3)',
  },
  recentBadgeIcon: {
    fontSize: 18,
  },
  viewAllBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  viewAllText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#94a3b8',
  },
  button: {
    backgroundColor: '#facc15',
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 30,
    marginBottom: 16,
  },
  buttonText: {
    color: '#1a1a2e',
    fontSize: 18,
    fontWeight: 'bold',
  },
  authButtons: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  secondaryButton: {
    backgroundColor: 'rgba(250, 204, 21, 0.2)',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 20,
  },
  secondaryButtonText: {
    color: '#facc15',
    fontSize: 16,
    fontWeight: '600',
  },
  outlineButton: {
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 20,
  },
  outlineButtonText: {
    color: '#fff',
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
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    gap: 6,
  },
  navLinkEmoji: {
    fontSize: 14,
  },
  navLinkText: {
    color: '#fff',
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
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
  },
  featureEmoji: {
    fontSize: 14,
    marginRight: 6,
  },
  featureText: {
    color: '#94a3b8',
    fontSize: 13,
  },
  footer: {
    color: '#64748b',
    fontSize: 12,
    textAlign: 'center',
    padding: 16,
  },
});
