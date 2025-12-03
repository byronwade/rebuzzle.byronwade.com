/**
 * StatsGrid Component
 * 2x2 grid displaying key player statistics
 */

import React from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Trophy, Flame, Target, Calendar } from 'lucide-react-native';
import { useTheme } from '../../contexts/ThemeContext';
import { hexToRgba } from '../../lib/theme';

interface StatItem {
  label: string;
  value: string | number;
  icon: React.ComponentType<any>;
  color: string;
}

interface StatsGridProps {
  totalPoints: number;
  currentStreak: number;
  puzzlesSolved: number;
  bestStreak: number;
}

export function StatsGrid({
  totalPoints,
  currentStreak,
  puzzlesSolved,
  bestStreak,
}: StatsGridProps) {
  const { theme } = useTheme();
  const colors = theme.colors;

  const stats: StatItem[] = [
    {
      label: 'Points',
      value: totalPoints.toLocaleString(),
      icon: Trophy,
      color: colors.primary,
    },
    {
      label: 'Streak',
      value: currentStreak,
      icon: Flame,
      color: '#f97316',
    },
    {
      label: 'Solved',
      value: puzzlesSolved,
      icon: Target,
      color: colors.success,
    },
    {
      label: 'Best Streak',
      value: bestStreak,
      icon: Calendar,
      color: '#8b5cf6',
    },
  ];

  return (
    <View style={styles.container}>
      {stats.map((stat, index) => (
        <Animated.View
          key={stat.label}
          entering={FadeInDown.delay(index * 50).duration(200)}
          style={[
            styles.statCard,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
        >
          <View style={[styles.iconContainer, { backgroundColor: hexToRgba(stat.color, 0.12) }]}>
            <stat.icon size={20} color={stat.color} strokeWidth={2} />
          </View>
          <Text style={[styles.statValue, { color: colors.foreground }]}>{stat.value}</Text>
          <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>{stat.label}</Text>
        </Animated.View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 16,
  },
  statCard: {
    width: '47%',
    borderRadius: 14,
    borderWidth: 1,
    padding: 16,
    alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  statValue: {
    fontSize: 24,
    fontWeight: '800',
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 12,
    fontWeight: '500',
  },
});

export default StatsGrid;
