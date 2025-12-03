/**
 * GameHeader Component
 * Displays difficulty badge, timer, and attempts remaining
 */

import React from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { Heart, Clock, Zap } from 'lucide-react-native';
import { useTheme } from '../../contexts/ThemeContext';
import { hexToRgba } from '../../lib/theme';

interface GameHeaderProps {
  difficulty: 'easy' | 'medium' | 'hard' | 'expert';
  timeElapsed: number; // in seconds
  attemptsRemaining: number;
  maxAttempts: number;
  isPlaying: boolean;
}

const DIFFICULTY_CONFIG: Record<string, { label: string; color: string }> = {
  easy: { label: 'Easy', color: '#22c55e' },
  medium: { label: 'Medium', color: '#eab308' },
  hard: { label: 'Hard', color: '#f97316' },
  expert: { label: 'Expert', color: '#ef4444' },
};

const DEFAULT_DIFFICULTY = { label: 'Medium', color: '#eab308' };

export function GameHeader({
  difficulty,
  timeElapsed,
  attemptsRemaining,
  maxAttempts,
  isPlaying,
}: GameHeaderProps) {
  const { theme, isDark } = useTheme();
  const colors = theme.colors;
  const diffConfig = DIFFICULTY_CONFIG[difficulty] || DEFAULT_DIFFICULTY;

  // Format time as MM:SS
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Render heart indicators
  const renderHearts = () => {
    const hearts = [];
    for (let i = 0; i < maxAttempts; i++) {
      const isFilled = i < attemptsRemaining;
      hearts.push(
        <Heart
          key={i}
          size={18}
          color={isFilled ? colors.destructive : colors.mutedForeground}
          fill={isFilled ? colors.destructive : 'transparent'}
          strokeWidth={2}
        />
      );
    }
    return hearts;
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.card, borderColor: colors.border }]}>
      {/* Difficulty Badge */}
      <View
        style={[
          styles.difficultyBadge,
          { backgroundColor: hexToRgba(diffConfig.color, 0.15) },
        ]}
      >
        <Zap size={14} color={diffConfig.color} strokeWidth={2.5} />
        <Text style={[styles.difficultyText, { color: diffConfig.color }]}>
          {diffConfig.label}
        </Text>
      </View>

      {/* Timer */}
      <View style={styles.timerContainer}>
        <Clock size={16} color={colors.mutedForeground} strokeWidth={2} />
        <Text
          style={[
            styles.timerText,
            { color: isPlaying ? colors.foreground : colors.mutedForeground },
          ]}
        >
          {formatTime(timeElapsed)}
        </Text>
      </View>

      {/* Attempts */}
      <View style={styles.attemptsContainer}>
        {renderHearts()}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
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
  difficultyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 4,
  },
  difficultyText: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  timerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  timerText: {
    fontSize: 16,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },
  attemptsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
});

export default GameHeader;
