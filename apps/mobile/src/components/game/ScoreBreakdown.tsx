/**
 * ScoreBreakdown Component
 * Post-game score details with animations
 */

import React from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { Trophy, Zap, Clock, Target, Flame, Star } from 'lucide-react-native';
import { useTheme } from '../../contexts/ThemeContext';
import { hexToRgba } from '../../lib/theme';

interface ScoreBreakdownProps {
  baseScore: number;
  timeBonus: number;
  streakBonus: number;
  difficultyMultiplier: number;
  totalScore: number;
  timeElapsed: number; // in seconds
  attemptsUsed: number;
  maxAttempts: number;
  isPersonalBest?: boolean;
}

export function ScoreBreakdown({
  baseScore,
  timeBonus,
  streakBonus,
  difficultyMultiplier,
  totalScore,
  timeElapsed,
  attemptsUsed,
  maxAttempts,
  isPersonalBest = false,
}: ScoreBreakdownProps) {
  const { theme, isDark } = useTheme();
  const colors = theme.colors;

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const scoreItems = [
    {
      label: 'Base Score',
      value: `+${baseScore}`,
      icon: Target,
      color: colors.foreground,
    },
    {
      label: 'Time Bonus',
      value: timeBonus > 0 ? `+${timeBonus}` : '0',
      icon: Clock,
      color: timeBonus > 0 ? colors.success : colors.mutedForeground,
    },
    {
      label: 'Streak Bonus',
      value: streakBonus > 0 ? `+${streakBonus}` : '0',
      icon: Flame,
      color: streakBonus > 0 ? '#f97316' : colors.mutedForeground,
    },
    {
      label: 'Difficulty',
      value: `×${difficultyMultiplier.toFixed(1)}`,
      icon: Zap,
      color: colors.primary,
    },
  ];

  return (
    <Animated.View
      entering={FadeInUp.duration(300)}
      style={[styles.container, { backgroundColor: colors.card, borderColor: colors.border }]}
    >
      {/* Header */}
      <View style={styles.header}>
        <Trophy size={24} color={colors.primary} strokeWidth={2} />
        <Text style={[styles.title, { color: colors.foreground }]}>Score Breakdown</Text>
        {isPersonalBest && (
          <View style={[styles.personalBestBadge, { backgroundColor: hexToRgba(colors.success, 0.15) }]}>
            <Star size={12} color={colors.success} fill={colors.success} />
            <Text style={[styles.personalBestText, { color: colors.success }]}>New Best!</Text>
          </View>
        )}
      </View>

      {/* Stats Row */}
      <View style={[styles.statsRow, { borderColor: colors.border }]}>
        <View style={styles.statItem}>
          <Clock size={16} color={colors.mutedForeground} />
          <Text style={[styles.statValue, { color: colors.foreground }]}>{formatTime(timeElapsed)}</Text>
          <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>Time</Text>
        </View>
        <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
        <View style={styles.statItem}>
          <Target size={16} color={colors.mutedForeground} />
          <Text style={[styles.statValue, { color: colors.foreground }]}>
            {attemptsUsed}/{maxAttempts}
          </Text>
          <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>Attempts</Text>
        </View>
      </View>

      {/* Score Items */}
      <View style={styles.scoreItems}>
        {scoreItems.map((item, index) => (
          <Animated.View
            key={item.label}
            entering={FadeInDown.delay(index * 100).duration(200)}
            style={styles.scoreItem}
          >
            <View style={styles.scoreItemLeft}>
              <item.icon size={16} color={colors.mutedForeground} strokeWidth={2} />
              <Text style={[styles.scoreLabel, { color: colors.mutedForeground }]}>{item.label}</Text>
            </View>
            <Text style={[styles.scoreValue, { color: item.color }]}>{item.value}</Text>
          </Animated.View>
        ))}
      </View>

      {/* Divider */}
      <View style={[styles.divider, { backgroundColor: colors.border }]} />

      {/* Total */}
      <Animated.View
        entering={FadeInDown.delay(400).duration(300)}
        style={styles.totalRow}
      >
        <Text style={[styles.totalLabel, { color: colors.foreground }]}>Total Score</Text>
        <Text style={[styles.totalValue, { color: colors.primary }]}>{totalScore.toLocaleString()}</Text>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 20,
    marginBottom: 16,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.08,
        shadowRadius: 12,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    flex: 1,
  },
  personalBestBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  personalBestText: {
    fontSize: 11,
    fontWeight: '600',
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    marginBottom: 16,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  statDivider: {
    width: 1,
    height: 32,
  },
  statValue: {
    fontSize: 18,
    fontWeight: '700',
  },
  statLabel: {
    fontSize: 11,
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  scoreItems: {
    gap: 10,
  },
  scoreItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  scoreItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  scoreLabel: {
    fontSize: 14,
  },
  scoreValue: {
    fontSize: 15,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },
  divider: {
    height: 1,
    marginVertical: 16,
  },
  totalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: '600',
  },
  totalValue: {
    fontSize: 28,
    fontWeight: '800',
  },
});

export default ScoreBreakdown;
