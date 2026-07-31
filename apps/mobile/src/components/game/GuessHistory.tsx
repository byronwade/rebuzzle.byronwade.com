/**
 * GuessHistory Component
 * Displays list of previous guesses with correct/incorrect indicators
 */

import React from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import Animated, { FadeInDown, Layout } from 'react-native-reanimated';
import { Check, X } from 'lucide-react-native';
import { useTheme } from '../../contexts/ThemeContext';
import { hexToRgba } from '../../lib/theme';

interface Guess {
  id: string;
  text: string;
  isCorrect: boolean;
  timestamp?: Date;
}

interface GuessHistoryProps {
  guesses: Guess[];
  maxDisplay?: number;
}

export function GuessHistory({ guesses, maxDisplay = 5 }: GuessHistoryProps) {
  const { theme } = useTheme();
  const colors = theme.colors;

  if (guesses.length === 0) {
    return null;
  }

  // Show most recent guesses, limited by maxDisplay
  const displayGuesses = guesses.slice(-maxDisplay);

  return (
    <View style={styles.container}>
      <Text style={[styles.title, { color: colors.mutedForeground }]}>Previous Guesses</Text>
      <View style={styles.guessesContainer}>
        {displayGuesses.map((guess, index) => (
          <Animated.View
            key={guess.id}
            entering={FadeInDown.delay(index * 50).duration(200)}
            layout={Layout.springify()}
            style={[
              styles.guessItem,
              {
                backgroundColor: guess.isCorrect
                  ? hexToRgba(colors.success, 0.1)
                  : hexToRgba(colors.destructive, 0.05),
                borderColor: guess.isCorrect
                  ? hexToRgba(colors.success, 0.3)
                  : hexToRgba(colors.destructive, 0.2),
              },
            ]}
          >
            <View style={styles.guessContent}>
              <Text
                style={[
                  styles.guessText,
                  {
                    color: guess.isCorrect ? colors.success : colors.foreground,
                  },
                ]}
                numberOfLines={1}
              >
                {guess.text}
              </Text>
            </View>
            <View
              style={[
                styles.iconContainer,
                {
                  backgroundColor: guess.isCorrect
                    ? hexToRgba(colors.success, 0.2)
                    : hexToRgba(colors.destructive, 0.15),
                },
              ]}
            >
              {guess.isCorrect ? (
                <Check size={14} color={colors.success} strokeWidth={3} />
              ) : (
                <X size={14} color={colors.destructive} strokeWidth={3} />
              )}
            </View>
          </Animated.View>
        ))}
      </View>
      {guesses.length > maxDisplay && (
        <Text style={[styles.moreText, { color: colors.mutedForeground }]}>
          +{guesses.length - maxDisplay} more
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  title: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  guessesContainer: {
    gap: 8,
  },
  guessItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
  guessContent: {
    flex: 1,
    marginRight: 12,
  },
  guessText: {
    fontSize: 15,
    fontWeight: '500',
  },
  iconContainer: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  moreText: {
    fontSize: 12,
    textAlign: 'center',
    marginTop: 8,
  },
});

export default GuessHistory;
