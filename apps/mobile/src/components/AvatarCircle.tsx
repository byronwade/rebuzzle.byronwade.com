/**
 * AvatarCircle Component
 * User avatar with color and initials
 */

import React from 'react';
import { View, Text, StyleSheet, StyleProp, ViewStyle } from 'react-native';

// Avatar color palette
const AVATAR_COLORS = [
  '#facc15', // Yellow (default)
  '#22c55e', // Green
  '#3b82f6', // Blue
  '#8b5cf6', // Purple
  '#ec4899', // Pink
  '#f97316', // Orange
  '#06b6d4', // Cyan
  '#ef4444', // Red
  '#84cc16', // Lime
  '#6366f1', // Indigo
];

interface AvatarCircleProps {
  /** Username for generating initials */
  username: string;
  /** Custom initials (1-2 chars) */
  customInitials?: string;
  /** Color index (0-9) */
  colorIndex?: number;
  /** Size in pixels */
  size?: number;
  /** Optional container style */
  style?: StyleProp<ViewStyle>;
}

export function AvatarCircle({
  username,
  customInitials,
  colorIndex = 0,
  size = 48,
  style,
}: AvatarCircleProps) {
  // Get initials (custom or from username)
  const initials = customInitials
    ? customInitials.toUpperCase().slice(0, 2)
    : username
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2) || username.slice(0, 2).toUpperCase();

  // Get color
  const backgroundColor = AVATAR_COLORS[colorIndex % AVATAR_COLORS.length];

  // Calculate font size based on avatar size
  const fontSize = size * 0.4;

  return (
    <View
      style={[
        styles.container,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor,
        },
        style,
      ]}
    >
      <Text style={[styles.initials, { fontSize }]}>{initials}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  initials: {
    color: '#1a1a2e',
    fontWeight: 'bold',
  },
});

export { AVATAR_COLORS };
