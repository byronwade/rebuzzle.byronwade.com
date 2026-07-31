/**
 * UserPosition Component
 * Sticky current user position display
 */

import React from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { Flame, TrendingUp, TrendingDown, Minus } from 'lucide-react-native';
import { useTheme } from '../../contexts/ThemeContext';
import { AvatarCircle } from '../AvatarCircle';
import { hexToRgba } from '../../lib/theme';

interface UserPositionProps {
  rank: number;
  previousRank?: number;
  username: string;
  points: number;
  streak: number;
  avatarColorIndex?: number;
  avatarInitials?: string;
}

export function UserPosition({
  rank,
  previousRank,
  username,
  points,
  streak,
  avatarColorIndex = 0,
  avatarInitials,
}: UserPositionProps) {
  const { theme, isDark } = useTheme();
  const colors = theme.colors;

  const getRankChange = () => {
    if (!previousRank || previousRank === rank) {
      return { icon: Minus, color: colors.mutedForeground, text: 'No change' };
    }
    if (rank < previousRank) {
      return {
        icon: TrendingUp,
        color: colors.success,
        text: `Up ${previousRank - rank}`,
      };
    }
    return {
      icon: TrendingDown,
      color: colors.destructive,
      text: `Down ${rank - previousRank}`,
    };
  };

  const rankChange = getRankChange();
  const RankIcon = rankChange.icon;

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: colors.card,
          borderColor: colors.primary,
          ...Platform.select({
            ios: {
              shadowColor: colors.primary,
              shadowOffset: { width: 0, height: -4 },
              shadowOpacity: 0.15,
              shadowRadius: 8,
            },
            android: {
              elevation: 8,
            },
          }),
        },
      ]}
    >
      <View style={styles.content}>
        {/* Rank */}
        <View style={[styles.rankBadge, { backgroundColor: hexToRgba(colors.primary, 0.15) }]}>
          <Text style={[styles.rankLabel, { color: colors.primary }]}>Your Rank</Text>
          <Text style={[styles.rankValue, { color: colors.primary }]}>#{rank}</Text>
        </View>

        {/* User Info */}
        <View style={styles.userSection}>
          <AvatarCircle
            username={username}
            customInitials={avatarInitials}
            colorIndex={avatarColorIndex}
            size={40}
          />
          <View style={styles.userInfo}>
            <Text style={[styles.username, { color: colors.foreground }]} numberOfLines={1}>
              {username}
            </Text>
            <View style={styles.statsRow}>
              <Text style={[styles.points, { color: colors.mutedForeground }]}>
                {points.toLocaleString()} pts
              </Text>
              {streak > 0 && (
                <View style={styles.streakBadge}>
                  <Flame size={12} color="#f97316" fill="#f97316" />
                  <Text style={styles.streakText}>{streak}</Text>
                </View>
              )}
            </View>
          </View>
        </View>

        {/* Rank Change */}
        {previousRank && (
          <View style={[styles.changeContainer, { backgroundColor: hexToRgba(rankChange.color, 0.1) }]}>
            <RankIcon size={14} color={rankChange.color} />
            <Text style={[styles.changeText, { color: rankChange.color }]}>{rankChange.text}</Text>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderTopWidth: 2,
    paddingTop: 12,
    paddingBottom: 12,
    paddingHorizontal: 16,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  rankBadge: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    alignItems: 'center',
  },
  rankLabel: {
    fontSize: 10,
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  rankValue: {
    fontSize: 20,
    fontWeight: '800',
  },
  userSection: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  userInfo: {
    flex: 1,
  },
  username: {
    fontSize: 15,
    fontWeight: '600',
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 2,
  },
  points: {
    fontSize: 13,
  },
  streakBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  streakText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#f97316',
  },
  changeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  changeText: {
    fontSize: 11,
    fontWeight: '600',
  },
});

export default UserPosition;
