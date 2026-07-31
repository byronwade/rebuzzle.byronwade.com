/**
 * PerformanceCard Component
 * Additional performance metrics display
 */

import React from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { Zap, Clock, Percent, TrendingUp } from 'lucide-react-native';
import { useTheme } from '../../contexts/ThemeContext';
import { hexToRgba } from '../../lib/theme';

interface PerformanceCardProps {
  perfectGames: number;
  fastestTime: number; // in seconds
  totalGames: number;
  winRate: number; // percentage 0-100
  averageTime?: number; // in seconds
}

export function PerformanceCard({
  perfectGames,
  fastestTime,
  totalGames,
  winRate,
  averageTime,
}: PerformanceCardProps) {
  const { theme } = useTheme();
  const colors = theme.colors;

  const formatTime = (seconds: number): string => {
    if (seconds === 0) return '--:--';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const stats = [
    {
      icon: Zap,
      label: 'Perfect',
      value: perfectGames.toString(),
      color: '#f59e0b',
    },
    {
      icon: Clock,
      label: 'Fastest',
      value: formatTime(fastestTime),
      color: colors.primary,
    },
    {
      icon: TrendingUp,
      label: 'Games',
      value: totalGames.toString(),
      color: '#10b981',
    },
    {
      icon: Percent,
      label: 'Win Rate',
      value: `${winRate}%`,
      color: '#8b5cf6',
    },
  ];

  return (
    <View style={[styles.container, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <Text style={[styles.title, { color: colors.foreground }]}>Performance</Text>

      <View style={styles.statsRow}>
        {stats.map((stat, index) => (
          <View key={stat.label} style={styles.statItem}>
            <View style={[styles.iconWrapper, { backgroundColor: hexToRgba(stat.color, 0.12) }]}>
              <stat.icon size={16} color={stat.color} strokeWidth={2.5} />
            </View>
            <Text style={[styles.statValue, { color: colors.foreground }]}>{stat.value}</Text>
            <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>{stat.label}</Text>
          </View>
        ))}
      </View>

      {averageTime !== undefined && averageTime > 0 && (
        <View style={[styles.averageRow, { borderTopColor: colors.border }]}>
          <Text style={[styles.averageLabel, { color: colors.mutedForeground }]}>Average Time</Text>
          <Text style={[styles.averageValue, { color: colors.foreground }]}>{formatTime(averageTime)}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    marginBottom: 16,
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
  title: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 16,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  iconWrapper: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  statValue: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 11,
    fontWeight: '500',
  },
  averageRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 16,
    paddingTop: 12,
    borderTopWidth: 1,
  },
  averageLabel: {
    fontSize: 13,
    fontWeight: '500',
  },
  averageValue: {
    fontSize: 15,
    fontWeight: '600',
  },
});

export default PerformanceCard;
