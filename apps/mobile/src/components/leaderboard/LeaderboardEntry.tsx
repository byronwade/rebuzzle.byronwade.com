/**
 * LeaderboardEntry Component
 * Individual rank card for leaderboard display
 */

import React from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import Animated, { FadeInRight } from 'react-native-reanimated';
import { Flame, Crown, Medal, Award } from 'lucide-react-native';
import { useTheme } from '../../contexts/ThemeContext';
import { AvatarCircle } from '../AvatarCircle';
import { hexToRgba } from '../../lib/theme';

interface LeaderboardEntryProps {
  rank: number;
  username: string;
  level: number;
  wins: number;
  points: number;
  streak: number;
  avatarColorIndex?: number;
  avatarInitials?: string;
  isCurrentUser?: boolean;
  animationDelay?: number;
}

function getRankIcon(rank: number, colors: any) {
  switch (rank) {
    case 1:
      return <Crown size={18} color="#ffd700" fill="#ffd700" strokeWidth={2} />;
    case 2:
      return <Medal size={18} color="#c0c0c0" strokeWidth={2} />;
    case 3:
      return <Award size={18} color="#cd7f32" strokeWidth={2} />;
    default:
      return null;
  }
}

function getRankEmoji(rank: number): string | null {
  switch (rank) {
    case 1:
      return '🥇';
    case 2:
      return '🥈';
    case 3:
      return '🥉';
    default:
      return null;
  }
}

export function LeaderboardEntry({
  rank,
  username,
  level,
  wins,
  points,
  streak,
  avatarColorIndex = 0,
  avatarInitials,
  isCurrentUser = false,
  animationDelay = 0,
}: LeaderboardEntryProps) {
  const { theme, isDark } = useTheme();
  const colors = theme.colors;
  const rankEmoji = getRankEmoji(rank);
  const isTopThree = rank <= 3;

  return (
    <Animated.View
      entering={FadeInRight.delay(animationDelay).duration(200)}
      style={[
        styles.container,
        {
          backgroundColor: isCurrentUser ? hexToRgba(colors.primary, 0.08) : colors.card,
          borderColor: isCurrentUser ? colors.primary : colors.border,
        },
      ]}
    >
      {/* Rank */}
      <View style={styles.rankContainer}>
        {rankEmoji ? (
          <Text style={styles.rankEmoji}>{rankEmoji}</Text>
        ) : (
          <Text style={[styles.rankNumber, { color: colors.mutedForeground }]}>#{rank}</Text>
        )}
      </View>

      {/* Avatar */}
      <AvatarCircle
        username={username}
        customInitials={avatarInitials}
        colorIndex={avatarColorIndex}
        size={44}
      />

      {/* User Info */}
      <View style={styles.userInfo}>
        <View style={styles.nameRow}>
          <Text
            style={[
              styles.username,
              { color: colors.foreground },
              isCurrentUser && { color: colors.primary, fontWeight: '700' },
            ]}
            numberOfLines={1}
          >
            {username}
          </Text>
          {isCurrentUser && (
            <View style={[styles.youBadge, { backgroundColor: hexToRgba(colors.primary, 0.15) }]}>
              <Text style={[styles.youBadgeText, { color: colors.primary }]}>You</Text>
            </View>
          )}
        </View>
        <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
          Level {level} • {wins} wins
        </Text>
      </View>

      {/* Stats */}
      <View style={styles.statsContainer}>
        <Text style={[styles.points, { color: colors.foreground }]}>
          {points.toLocaleString()}
        </Text>
        {streak > 0 && (
          <View style={styles.streakRow}>
            <Flame size={12} color="#f97316" fill="#f97316" />
            <Text style={[styles.streakText, { color: '#f97316' }]}>{streak}</Text>
          </View>
        )}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 10,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.04,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  rankContainer: {
    width: 36,
    alignItems: 'center',
    marginRight: 8,
  },
  rankEmoji: {
    fontSize: 22,
  },
  rankNumber: {
    fontSize: 14,
    fontWeight: '600',
  },
  userInfo: {
    flex: 1,
    marginLeft: 12,
    marginRight: 8,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  username: {
    fontSize: 15,
    fontWeight: '600',
  },
  youBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  youBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  subtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  statsContainer: {
    alignItems: 'flex-end',
  },
  points: {
    fontSize: 16,
    fontWeight: '700',
  },
  streakRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    marginTop: 2,
  },
  streakText: {
    fontSize: 12,
    fontWeight: '600',
  },
});

export default LeaderboardEntry;
