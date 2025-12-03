/**
 * LeaderboardItem Component
 * Single row in the leaderboard list
 */

import React from 'react';
import { View, Text, StyleSheet, StyleProp, ViewStyle } from 'react-native';
import { AvatarCircle } from './AvatarCircle';
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

// Rank badge colors for top 3
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
  const isTopThree = rank <= 3;
  const rankColor = RANK_COLORS[rank];

  return (
    <View
      style={[
        styles.container,
        isCurrentUser && styles.currentUser,
        style,
      ]}
    >
      {/* Rank */}
      <View style={[styles.rankContainer, isTopThree && { backgroundColor: rankColor }]}>
        {isTopThree ? (
          <Text style={styles.rankEmoji}>
            {rank === 1 ? '🥇' : rank === 2 ? '🥈' : '🥉'}
          </Text>
        ) : (
          <Text style={styles.rankText}>{rank}</Text>
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
        <Text style={[styles.username, isCurrentUser && styles.currentUserText]}>
          {entry.user.username}
          {isCurrentUser && ' (You)'}
        </Text>
        <Text style={styles.level}>Level {entry.stats.level}</Text>
      </View>

      {/* Stats */}
      <View style={styles.statsContainer}>
        {sortBy === 'points' ? (
          <>
            <Text style={styles.mainStat}>{entry.stats.points.toLocaleString()}</Text>
            <Text style={styles.statLabel}>points</Text>
          </>
        ) : (
          <>
            <Text style={styles.mainStat}>{entry.stats.streak || 0}</Text>
            <Text style={styles.statLabel}>streak</Text>
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
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    padding: 12,
    borderRadius: 12,
    gap: 12,
  },
  currentUser: {
    backgroundColor: 'rgba(250, 204, 21, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(250, 204, 21, 0.3)',
  },
  rankContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  rankEmoji: {
    fontSize: 16,
  },
  rankText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#94a3b8',
  },
  userInfo: {
    flex: 1,
  },
  username: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
  },
  currentUserText: {
    color: '#facc15',
  },
  level: {
    fontSize: 12,
    color: '#94a3b8',
    marginTop: 2,
  },
  statsContainer: {
    alignItems: 'flex-end',
  },
  mainStat: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#facc15',
  },
  statLabel: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 2,
  },
});
