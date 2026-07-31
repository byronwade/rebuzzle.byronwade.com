/**
 * HintCard Component
 * Displays hints with reveal functionality
 */

import React from 'react';
import { View, Text, Pressable, StyleSheet, StyleProp, ViewStyle } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';
import { hexToRgba } from '../lib/theme';

interface HintCardProps {
  /** All available hints */
  hints: string[];
  /** Current hint index (how many are revealed) */
  currentIndex: number;
  /** Callback when "Get Hint" is pressed */
  onShowHint: () => void;
  /** Whether more hints can be shown */
  canShowMore: boolean;
  /** Whether the game is complete */
  isComplete?: boolean;
  /** Optional container style */
  style?: StyleProp<ViewStyle>;
}

export function HintCard({
  hints,
  currentIndex,
  onShowHint,
  canShowMore,
  isComplete = false,
  style,
}: HintCardProps) {
  const { theme } = useTheme();
  const colors = theme.colors;

  if (hints.length === 0) {
    return null;
  }

  const revealedHints = hints.slice(0, currentIndex + 1);
  const hintsRemaining = hints.length - revealedHints.length;

  return (
    <View style={[styles.container, { backgroundColor: hexToRgba(colors.foreground, 0.05) }, style]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.accent }]}>Hints</Text>
        <Text style={[styles.counter, { color: colors.mutedForeground }]}>
          {revealedHints.length}/{hints.length}
        </Text>
      </View>

      {revealedHints.length > 0 ? (
        <View style={styles.hintsList}>
          {revealedHints.map((hint, index) => (
            <View key={index} style={styles.hintItem}>
              <Text style={[styles.hintNumber, { color: colors.mutedForeground }]}>{index + 1}.</Text>
              <Text style={[styles.hintText, { color: colors.foreground }]}>{hint}</Text>
            </View>
          ))}
        </View>
      ) : (
        <Text style={[styles.noHints, { color: colors.mutedForeground }]}>No hints revealed yet</Text>
      )}

      {!isComplete && canShowMore && (
        <Pressable
          style={[
            styles.button,
            {
              backgroundColor: hexToRgba(colors.accent, 0.15),
              borderColor: hexToRgba(colors.accent, 0.3),
            },
          ]}
          onPress={onShowHint}
        >
          <Text style={[styles.buttonText, { color: colors.accent }]}>
            Get Hint ({hintsRemaining} remaining)
          </Text>
        </Pressable>
      )}

      {!isComplete && !canShowMore && revealedHints.length > 0 && (
        <Text style={[styles.noMoreHints, { color: colors.mutedForeground }]}>No more hints available</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 12,
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  title: {
    fontSize: 14,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  counter: {
    fontSize: 12,
  },
  hintsList: {
    gap: 8,
  },
  hintItem: {
    flexDirection: 'row',
    gap: 8,
  },
  hintNumber: {
    fontSize: 14,
    fontWeight: '600',
    width: 20,
  },
  hintText: {
    fontSize: 14,
    flex: 1,
    lineHeight: 20,
  },
  noHints: {
    fontSize: 14,
    fontStyle: 'italic',
  },
  button: {
    marginTop: 12,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
  },
  buttonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  noMoreHints: {
    marginTop: 8,
    fontSize: 12,
    textAlign: 'center',
  },
});
