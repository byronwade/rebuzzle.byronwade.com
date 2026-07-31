/**
 * PuzzleCard Component
 * Main puzzle display container with emoji/text and hint
 * Uses shared formatting utilities for consistent display across platforms
 */

import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, Platform, TouchableOpacity, TextStyle } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  FadeIn,
} from 'react-native-reanimated';
import { Lightbulb, Users, Eye, EyeOff } from 'lucide-react-native';
import { useTheme } from '../../contexts/ThemeContext';
import { hexToRgba } from '../../lib/theme';
import { SPRING_CONFIG } from '../../lib/animations';
import {
  getPuzzleDisplayConfig,
  getPuzzleQuestion,
  FONT_SIZE_VALUES,
  FONT_WEIGHT_VALUES,
  type PuzzleDisplayConfig,
} from '@rebuzzle/game-logic';

interface PuzzleCardProps {
  puzzleContent: string; // Emoji or text content
  puzzleType: string; // Now accepts all puzzle types
  hint?: string;
  solvedCount?: number;
  category?: string;
}

/**
 * Get dynamic styles based on puzzle display config
 */
function getPuzzleContentStyle(config: PuzzleDisplayConfig): TextStyle {
  const fontSize = FONT_SIZE_VALUES[config.fontSize];
  const fontWeight = String(FONT_WEIGHT_VALUES[config.fontWeight]) as TextStyle['fontWeight'];

  const style: TextStyle = {
    fontSize,
    fontWeight,
    textAlign: config.textAlign,
    lineHeight: fontSize * 1.25, // Consistent line height ratio
  };

  // Apply monospace font for cipher/sequence puzzles
  if (config.fontFamily === 'mono') {
    style.fontFamily = Platform.select({
      ios: 'Menlo',
      android: 'monospace',
      default: 'monospace',
    });
  }

  return style;
}

export function PuzzleCard({
  puzzleContent,
  puzzleType,
  hint,
  solvedCount = 0,
  category,
}: PuzzleCardProps) {
  const { theme, isDark } = useTheme();
  const colors = theme.colors;
  const [showHint, setShowHint] = useState(false);
  const hintScale = useSharedValue(1);

  // Get shared display configuration
  const displayConfig = useMemo(() => getPuzzleDisplayConfig(puzzleType), [puzzleType]);
  const question = useMemo(() => getPuzzleQuestion(puzzleType), [puzzleType]);
  const contentStyle = useMemo(() => getPuzzleContentStyle(displayConfig), [displayConfig]);

  const handleHintPress = () => {
    hintScale.value = withSpring(0.95, SPRING_CONFIG.stiff);
    setTimeout(() => {
      hintScale.value = withSpring(1, SPRING_CONFIG.gentle);
    }, 100);
    setShowHint(!showHint);
  };

  const hintAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: hintScale.value }],
  }));

  return (
    <View style={[styles.container, { backgroundColor: colors.card, borderColor: colors.border }]}>
      {/* Category Badge */}
      {category && (
        <View style={[styles.categoryBadge, { backgroundColor: hexToRgba(colors.primary, 0.1) }]}>
          <Text style={[styles.categoryText, { color: colors.primary }]}>{category}</Text>
        </View>
      )}

      {/* Puzzle Content */}
      <View style={[
        styles.puzzleContainer,
        // Adjust alignment based on config
        displayConfig.textAlign === 'left' && styles.puzzleContainerLeft,
      ]}>
        <Text style={[styles.puzzleContent, contentStyle]}>
          {puzzleContent}
        </Text>
      </View>

      {/* Question */}
      <Text style={[styles.question, { color: colors.mutedForeground }]}>{question}</Text>

      {/* Solved Counter */}
      {solvedCount > 0 && (
        <View style={styles.solvedRow}>
          <Users size={14} color={colors.mutedForeground} strokeWidth={2} />
          <Text style={[styles.solvedText, { color: colors.mutedForeground }]}>
            {solvedCount.toLocaleString()} players solved today
          </Text>
        </View>
      )}

      {/* Hint Section */}
      {hint && (
        <Animated.View style={hintAnimatedStyle}>
          <TouchableOpacity
            style={[
              styles.hintButton,
              {
                backgroundColor: showHint
                  ? hexToRgba(colors.warning, 0.15)
                  : hexToRgba(colors.foreground, 0.05),
                borderColor: showHint
                  ? hexToRgba(colors.warning, 0.3)
                  : colors.border,
              },
            ]}
            onPress={handleHintPress}
            activeOpacity={0.7}
          >
            <Lightbulb
              size={16}
              color={showHint ? colors.warning : colors.mutedForeground}
              strokeWidth={2}
            />
            <Text
              style={[
                styles.hintLabel,
                { color: showHint ? colors.warning : colors.mutedForeground },
              ]}
            >
              {showHint ? 'Hide Hint' : 'Show Hint'}
            </Text>
            {showHint ? (
              <EyeOff size={14} color={colors.warning} strokeWidth={2} />
            ) : (
              <Eye size={14} color={colors.mutedForeground} strokeWidth={2} />
            )}
          </TouchableOpacity>
          {showHint && (
            <Animated.View entering={FadeIn.duration(200)} style={styles.hintContent}>
              <Text style={[styles.hintText, { color: colors.foreground }]}>{hint}</Text>
            </Animated.View>
          )}
        </Animated.View>
      )}
    </View>
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
  categoryBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    marginBottom: 16,
  },
  categoryText: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  puzzleContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 120,
    marginBottom: 16,
  },
  puzzleContainerLeft: {
    alignItems: 'flex-start',
  },
  puzzleContent: {
    // Base styles - will be overridden by dynamic contentStyle
    textAlign: 'center',
  },
  question: {
    fontSize: 15,
    fontWeight: '500',
    textAlign: 'center',
    marginBottom: 12,
  },
  solvedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginBottom: 16,
  },
  solvedText: {
    fontSize: 13,
  },
  hintButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
    borderWidth: 1,
  },
  hintLabel: {
    fontSize: 14,
    fontWeight: '500',
  },
  hintContent: {
    marginTop: 12,
    padding: 12,
    borderRadius: 8,
  },
  hintText: {
    fontSize: 14,
    textAlign: 'center',
    fontStyle: 'italic',
  },
});

export default PuzzleCard;
