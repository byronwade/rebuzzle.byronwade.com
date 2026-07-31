/**
 * LevelProgress Component
 * XP progress bar with level and tier display
 */

import React from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import Animated, { useAnimatedStyle, withSpring, useSharedValue, withTiming } from 'react-native-reanimated';
import { Star, Zap } from 'lucide-react-native';
import { useTheme } from '../../contexts/ThemeContext';
import { hexToRgba } from '../../lib/theme';

interface LevelProgressProps {
  level: number;
  currentXP: number;
  requiredXP: number;
  tier?: 'bronze' | 'silver' | 'gold' | 'platinum' | 'diamond';
}

const TIER_CONFIG = {
  bronze: { color: '#cd7f32', label: 'Bronze' },
  silver: { color: '#c0c0c0', label: 'Silver' },
  gold: { color: '#ffd700', label: 'Gold' },
  platinum: { color: '#e5e4e2', label: 'Platinum' },
  diamond: { color: '#b9f2ff', label: 'Diamond' },
};

export function LevelProgress({
  level,
  currentXP,
  requiredXP,
  tier = 'bronze',
}: LevelProgressProps) {
  const { theme, isDark } = useTheme();
  const colors = theme.colors;
  const tierConfig = TIER_CONFIG[tier];
  const progressPercent = Math.min((currentXP / requiredXP) * 100, 100);

  return (
    <View style={[styles.container, { backgroundColor: colors.card, borderColor: colors.border }]}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.levelContainer}>
          <View style={[styles.levelBadge, { backgroundColor: hexToRgba(colors.primary, 0.15) }]}>
            <Star size={14} color={colors.primary} fill={colors.primary} />
            <Text style={[styles.levelNumber, { color: colors.primary }]}>Level {level}</Text>
          </View>
          <View style={[styles.tierBadge, { backgroundColor: hexToRgba(tierConfig.color, 0.2) }]}>
            <Zap size={12} color={tierConfig.color} fill={tierConfig.color} />
            <Text style={[styles.tierText, { color: tierConfig.color }]}>{tierConfig.label}</Text>
          </View>
        </View>
        <Text style={[styles.xpText, { color: colors.mutedForeground }]}>
          {currentXP.toLocaleString()} / {requiredXP.toLocaleString()} XP
        </Text>
      </View>

      {/* Progress Bar */}
      <View style={[styles.progressTrack, { backgroundColor: hexToRgba(colors.foreground, 0.1) }]}>
        <View
          style={[
            styles.progressFill,
            {
              width: `${progressPercent}%`,
              backgroundColor: colors.primary,
            },
          ]}
        />
      </View>

      {/* XP to next level */}
      <Text style={[styles.remainingText, { color: colors.mutedForeground }]}>
        {(requiredXP - currentXP).toLocaleString()} XP to Level {level + 1}
      </Text>
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  levelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  levelBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  levelNumber: {
    fontSize: 14,
    fontWeight: '700',
  },
  tierBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  tierText: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  xpText: {
    fontSize: 13,
    fontWeight: '500',
  },
  progressTrack: {
    height: 10,
    borderRadius: 5,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 5,
  },
  remainingText: {
    fontSize: 12,
    textAlign: 'center',
    marginTop: 8,
  },
});

export default LevelProgress;
