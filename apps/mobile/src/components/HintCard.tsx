/**
 * HintCard Component
 * Displays hints with reveal functionality
 */

import React from 'react';
import { View, Text, Pressable, StyleSheet, StyleProp, ViewStyle } from 'react-native';

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
  if (hints.length === 0) {
    return null;
  }

  const revealedHints = hints.slice(0, currentIndex + 1);
  const hintsRemaining = hints.length - revealedHints.length;

  return (
    <View style={[styles.container, style]}>
      <View style={styles.header}>
        <Text style={styles.title}>Hints</Text>
        <Text style={styles.counter}>
          {revealedHints.length}/{hints.length}
        </Text>
      </View>

      {revealedHints.length > 0 ? (
        <View style={styles.hintsList}>
          {revealedHints.map((hint, index) => (
            <View key={index} style={styles.hintItem}>
              <Text style={styles.hintNumber}>{index + 1}.</Text>
              <Text style={styles.hintText}>{hint}</Text>
            </View>
          ))}
        </View>
      ) : (
        <Text style={styles.noHints}>No hints revealed yet</Text>
      )}

      {!isComplete && canShowMore && (
        <Pressable style={styles.button} onPress={onShowHint}>
          <Text style={styles.buttonText}>
            Get Hint ({hintsRemaining} remaining)
          </Text>
        </Pressable>
      )}

      {!isComplete && !canShowMore && revealedHints.length > 0 && (
        <Text style={styles.noMoreHints}>No more hints available</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
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
    color: '#facc15',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  counter: {
    fontSize: 12,
    color: '#94a3b8',
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
    color: '#64748b',
    fontWeight: '600',
    width: 20,
  },
  hintText: {
    fontSize: 14,
    color: '#e2e8f0',
    flex: 1,
    lineHeight: 20,
  },
  noHints: {
    fontSize: 14,
    color: '#64748b',
    fontStyle: 'italic',
  },
  button: {
    marginTop: 12,
    backgroundColor: 'rgba(250, 204, 21, 0.15)',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(250, 204, 21, 0.3)',
  },
  buttonText: {
    fontSize: 14,
    color: '#facc15',
    fontWeight: '600',
  },
  noMoreHints: {
    marginTop: 8,
    fontSize: 12,
    color: '#64748b',
    textAlign: 'center',
  },
});
