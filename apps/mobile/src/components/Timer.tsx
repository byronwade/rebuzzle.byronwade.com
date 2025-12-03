/**
 * Timer Component
 * Displays elapsed time in MM:SS format
 */

import React from 'react';
import { View, Text, StyleSheet, StyleProp, ViewStyle } from 'react-native';

interface TimerProps {
  /** Elapsed time in seconds */
  seconds: number;
  /** Optional container style */
  style?: StyleProp<ViewStyle>;
  /** Size variant */
  size?: 'small' | 'medium' | 'large';
  /** Show clock icon */
  showIcon?: boolean;
}

export function Timer({ seconds, style, size = 'medium', showIcon = true }: TimerProps) {
  const minutes = Math.floor(seconds / 60);
  const secs = seconds % 60;

  const timeString = `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;

  const fontSize = size === 'small' ? 14 : size === 'large' ? 24 : 18;

  return (
    <View style={[styles.container, style]}>
      {showIcon && <Text style={[styles.icon, { fontSize }]}>⏱</Text>}
      <Text style={[styles.time, { fontSize }]}>{timeString}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  icon: {
    color: '#94a3b8',
  },
  time: {
    color: '#fff',
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },
});
