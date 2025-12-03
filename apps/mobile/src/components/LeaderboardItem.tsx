/**
 * LeaderboardItem Component
 * Single row in the leaderboard list
 */

import React from 'react';
import { View, Text, StyleSheet, StyleProp, ViewStyle } from 'react-native';
import { AvatarCircle } from './AvatarCircle';
import { useTheme } from '../contexts/ThemeContext';
import { hexToRgba } from '../lib/theme';
import type { LeaderboardEntry } from '../types';

interface LeaderboardItemProps {
  /** Leaderboard entry data */
  entry: LeaderboardEntry;
  /** Whether this is the current user */
  isCurrentUser: boolean;
  /** Rank number */
  rank: number;
  /** What stat is being sorted by */
  sortBy?: 'points' | 'streak';
  /** Optional container style */
  style?: StyleProp<ViewStyle>;
}

// Rank badge colors for top 3 (consistent across themes)
const RANK_COLORS: Record<number, string> = {
  1: '#facc15', // Gold
  2: '#94a3b8', // Silver
  3: '#cd7f32', // Bronze
};

export function LeaderboardItem({
  entry,
  isCurrentUser,
  rank,
  sortBy = 'points',
  style,
}: LeaderboardItemProps) {
  const { theme } = useTheme();
  const colors = theme.colors;

  const isTopThree = rank <= 3;
  const rankColor = RANK_COLORS[rank];

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: hexToRgba(colors.foreground, 0.05) },
        isCurrentUser && {
          backgroundColor: hexToRgba(colors.accent, 0.1),
          borderWidth: 1,
          borderColor: hexToRgba(colors.accent, 0.3),
        },
        style,
      ]}
    >
      {/* Rank */}
      <View
        style={[
          styles.rankContainer,
          { backgroundColor: isTopThree ? rankColor : hexToRgba(colors.foreground, 0.1) },
        ]}
      >
        {isTopThree ? (
          <Text style={styles.rankEmoji}>
            {rank === 1 ? '🥇' : rank === 2 ? '🥈' : '🥉'}
          </Text>
        ) : (
          <Text style={[styles.rankText, { color: colors.mutedForeground }]}>{rank}</Text>
        )}
      </View>

      {/* Avatar */}
      <AvatarCircle
        username={entry.user.username}
        customInitials={entry.user.avatarCustomInitials}
        colorIndex={entry.user.avatarColorIndex}
        size={40}
      />

      {/* User Info */}
      <View style={styles.userInfo}>
        <Text style={[styles.username, { color: isCurrentUser ? colors.accent : colors.foreground }]}>
          {entry.user.username}
          {isCurrentUser && ' (You)'}
        </Text>
        <Text style={[styles.level, { color: colors.mutedForeground }]}>Level {entry.stats.level}</Text>
      </View>

      {/* Stats */}
      <View style={styles.statsContainer}>
        {sortBy === 'points' ? (
          <>
            <Text style={[styles.mainStat, { color: colors.accent }]}>{entry.stats.points.toLocaleString()}</Text>
            <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>points</Text>
          </>
        ) : (
          <>
            <Text style={[styles.mainStat, { color: colors.accent }]}>{entry.stats.streak || 0}</Text>
            <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>streak</Text>
          </>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    gap: 12,
  },
  rankContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  rankEmoji: {
    fontSize: 16,
  },
  rankText: {
    fontSize: 14,
    fontWeight: '600',
  },
  userInfo: {
    flex: 1,
  },
  username: {
    fontSize: 15,
    fontWeight: '600',
  },
  level: {
    fontSize: 12,
    marginTop: 2,
  },
  statsContainer: {
    alignItems: 'flex-end',
  },
  mainStat: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  statLabel: {
    fontSize: 11,
    marginTop: 2,
  },
});
