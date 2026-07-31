/**
 * AchievementBadge Component
 * Displays an achievement with icon, rarity styling, and lock state
 */

import React from 'react';
import { View, Text, StyleSheet, StyleProp, ViewStyle } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';
import type { AchievementRarity } from '../types';

// Rarity colors (these remain constant across themes for recognition)
const RARITY_COLORS: Record<AchievementRarity, { border: string; bg: string; text: string }> = {
  common: { border: '#9ca3af', bg: 'rgba(156, 163, 175, 0.1)', text: '#9ca3af' },
  uncommon: { border: '#22c55e', bg: 'rgba(34, 197, 94, 0.1)', text: '#22c55e' },
  rare: { border: '#3b82f6', bg: 'rgba(59, 130, 246, 0.1)', text: '#3b82f6' },
  epic: { border: '#8b5cf6', bg: 'rgba(139, 92, 246, 0.1)', text: '#8b5cf6' },
  legendary: { border: '#facc15', bg: 'rgba(250, 204, 21, 0.1)', text: '#facc15' },
};

// Icon mapping (simplified emoji icons)
const ICON_MAP: Record<string, string> = {
  trophy: '🏆',
  star: '⭐',
  zap: '⚡',
  flame: '🔥',
  target: '🎯',
  clock: '⏰',
  crown: '👑',
  gem: '💎',
  medal: '🏅',
  rocket: '🚀',
  brain: '🧠',
  lightning: '⚡',
  heart: '❤️',
  shield: '🛡️',
  sword: '⚔️',
  puzzle: '🧩',
  book: '📚',
  calendar: '📅',
  gift: '🎁',
  sparkles: '✨',
  default: '🏆',
};

interface AchievementBadgeProps {
  /** Achievement icon name */
  icon: string;
  /** Achievement name */
  name: string;
  /** Achievement rarity */
  rarity: AchievementRarity;
  /** Whether achievement is unlocked */
  unlocked: boolean;
  /** Whether achievement is secret (show ??? if locked) */
  secret?: boolean;
  /** Points value */
  points?: number;
  /** Size variant */
  size?: 'small' | 'medium' | 'large';
  /** Optional container style */
  style?: StyleProp<ViewStyle>;
}

export function AchievementBadge({
  icon,
  name,
  rarity,
  unlocked,
  secret = false,
  points,
  size = 'medium',
  style,
}: AchievementBadgeProps) {
  const { theme } = useTheme();
  const themeColors = theme.colors;
  const rarityColors = RARITY_COLORS[rarity];
  const iconEmoji = ICON_MAP[icon] || ICON_MAP.default;

  const dimensions = size === 'small' ? 48 : size === 'large' ? 80 : 64;
  const iconSize = size === 'small' ? 20 : size === 'large' ? 36 : 28;
  const showName = size !== 'small';

  // If locked and secret, show mystery content
  const displayName = !unlocked && secret ? '???' : name;
  const displayIcon = !unlocked && secret ? '❓' : iconEmoji;

  return (
    <View style={[styles.container, style]}>
      <View
        style={[
          styles.badge,
          {
            width: dimensions,
            height: dimensions,
            borderRadius: dimensions / 2,
            backgroundColor: unlocked ? rarityColors.bg : 'rgba(100, 116, 139, 0.1)',
            borderColor: unlocked ? rarityColors.border : themeColors.muted,
          },
        ]}
      >
        <Text style={[styles.icon, { fontSize: iconSize, opacity: unlocked ? 1 : 0.4 }]}>
          {displayIcon}
        </Text>
        {!unlocked && (
          <View style={[styles.lockOverlay, { backgroundColor: themeColors.background }]}>
            <Text style={styles.lockIcon}>🔒</Text>
          </View>
        )}
      </View>

      {showName && (
        <Text
          style={[
            styles.name,
            { color: unlocked ? themeColors.foreground : themeColors.mutedForeground },
          ]}
          numberOfLines={2}
        >
          {displayName}
        </Text>
      )}

      {points !== undefined && unlocked && (
        <View style={[styles.pointsBadge, { backgroundColor: rarityColors.bg }]}>
          <Text style={[styles.pointsText, { color: rarityColors.text }]}>+{points}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    gap: 6,
  },
  badge: {
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    position: 'relative',
  },
  icon: {
    textAlign: 'center',
  },
  lockOverlay: {
    position: 'absolute',
    bottom: -4,
    right: -4,
    borderRadius: 10,
    padding: 2,
  },
  lockIcon: {
    fontSize: 12,
  },
  name: {
    fontSize: 11,
    textAlign: 'center',
    maxWidth: 80,
    fontWeight: '500',
  },
  pointsBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  pointsText: {
    fontSize: 10,
    fontWeight: '600',
  },
});
