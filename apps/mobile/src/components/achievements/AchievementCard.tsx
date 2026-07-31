/**
 * AchievementCard Component
 * Single achievement display with locked/unlocked state
 */

import React from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { Lock, Check, Star } from 'lucide-react-native';
import { useTheme } from '../../contexts/ThemeContext';
import { hexToRgba } from '../../lib/theme';

export type AchievementRarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';

interface AchievementCardProps {
  id: string;
  name: string;
  description: string;
  icon: string;
  points: number;
  rarity: AchievementRarity;
  isUnlocked: boolean;
  unlockedAt?: Date;
  progress?: number;
  maxProgress?: number;
  animationDelay?: number;
}

const RARITY_CONFIG: Record<AchievementRarity, { color: string; label: string }> = {
  common: { color: '#9ca3af', label: 'Common' },
  uncommon: { color: '#22c55e', label: 'Uncommon' },
  rare: { color: '#3b82f6', label: 'Rare' },
  epic: { color: '#8b5cf6', label: 'Epic' },
  legendary: { color: '#f59e0b', label: 'Legendary' },
};

export function AchievementCard({
  name,
  description,
  icon,
  points,
  rarity,
  isUnlocked,
  unlockedAt,
  progress,
  maxProgress,
  animationDelay = 0,
}: AchievementCardProps) {
  const { theme, isDark } = useTheme();
  const colors = theme.colors;
  const rarityConfig = RARITY_CONFIG[rarity];

  const hasProgress = progress !== undefined && maxProgress !== undefined;
  const progressPercent = hasProgress ? (progress / maxProgress) * 100 : 0;

  return (
    <Animated.View
      entering={FadeIn.delay(animationDelay).duration(300)}
      style={[
        styles.container,
        {
          backgroundColor: isUnlocked ? colors.card : hexToRgba(colors.card, 0.5),
          borderColor: isUnlocked ? hexToRgba(rarityConfig.color, 0.4) : colors.border,
          opacity: isUnlocked ? 1 : 0.7,
        },
      ]}
    >
      {/* Icon */}
      <View
        style={[
          styles.iconContainer,
          {
            backgroundColor: isUnlocked
              ? hexToRgba(rarityConfig.color, 0.15)
              : hexToRgba(colors.mutedForeground, 0.1),
          },
        ]}
      >
        {isUnlocked ? (
          <Text style={styles.icon}>{icon}</Text>
        ) : (
          <Lock size={24} color={colors.mutedForeground} strokeWidth={2} />
        )}
      </View>

      {/* Content */}
      <View style={styles.content}>
        <View style={styles.header}>
          <Text
            style={[
              styles.name,
              { color: isUnlocked ? colors.foreground : colors.mutedForeground },
            ]}
            numberOfLines={1}
          >
            {isUnlocked ? name : '???'}
          </Text>
          <View style={[styles.pointsBadge, { backgroundColor: hexToRgba(colors.primary, 0.12) }]}>
            <Star size={10} color={colors.primary} fill={colors.primary} />
            <Text style={[styles.points, { color: colors.primary }]}>{points}</Text>
          </View>
        </View>

        <Text
          style={[
            styles.description,
            { color: colors.mutedForeground },
          ]}
          numberOfLines={2}
        >
          {isUnlocked ? description : 'Complete the challenge to unlock'}
        </Text>

        {/* Rarity & Status */}
        <View style={styles.footer}>
          <View style={[styles.rarityBadge, { backgroundColor: hexToRgba(rarityConfig.color, 0.15) }]}>
            <Text style={[styles.rarityText, { color: rarityConfig.color }]}>{rarityConfig.label}</Text>
          </View>
          {isUnlocked && (
            <View style={styles.unlockedBadge}>
              <Check size={12} color={colors.success} strokeWidth={3} />
              <Text style={[styles.unlockedText, { color: colors.success }]}>Earned</Text>
            </View>
          )}
        </View>

        {/* Progress Bar */}
        {hasProgress && !isUnlocked && (
          <View style={styles.progressContainer}>
            <View style={[styles.progressTrack, { backgroundColor: hexToRgba(colors.foreground, 0.1) }]}>
              <View
                style={[
                  styles.progressFill,
                  {
                    width: `${progressPercent}%`,
                    backgroundColor: rarityConfig.color,
                  },
                ]}
              />
            </View>
            <Text style={[styles.progressText, { color: colors.mutedForeground }]}>
              {progress}/{maxProgress}
            </Text>
          </View>
        )}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    marginBottom: 12,
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
  iconContainer: {
    width: 52,
    height: 52,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  icon: {
    fontSize: 28,
  },
  content: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  name: {
    fontSize: 15,
    fontWeight: '700',
    flex: 1,
    marginRight: 8,
  },
  pointsBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  points: {
    fontSize: 11,
    fontWeight: '700',
  },
  description: {
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 8,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  rarityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  rarityText: {
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  unlockedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  unlockedText: {
    fontSize: 11,
    fontWeight: '600',
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
  },
  progressTrack: {
    flex: 1,
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  progressText: {
    fontSize: 11,
    fontWeight: '500',
  },
});

export default AchievementCard;
