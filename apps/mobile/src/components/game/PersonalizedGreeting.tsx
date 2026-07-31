/**
 * PersonalizedGreeting Component
 * Time-based greeting with streak information
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Flame, Sun, Moon, CloudSun } from 'lucide-react-native';
import { useTheme } from '../../contexts/ThemeContext';

interface PersonalizedGreetingProps {
  username?: string;
  streak?: number;
}

function getTimeOfDay(): 'morning' | 'afternoon' | 'evening' | 'night' {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) return 'morning';
  if (hour >= 12 && hour < 17) return 'afternoon';
  if (hour >= 17 && hour < 21) return 'evening';
  return 'night';
}

function getGreeting(timeOfDay: string, username?: string): string {
  const name = username ? `, ${username}` : '';
  switch (timeOfDay) {
    case 'morning':
      return `Good morning${name}!`;
    case 'afternoon':
      return `Good afternoon${name}!`;
    case 'evening':
      return `Good evening${name}!`;
    case 'night':
      return `Good night${name}!`;
    default:
      return `Hello${name}!`;
  }
}

function getTimeIcon(timeOfDay: string, color: string) {
  const size = 18;
  const strokeWidth = 2;
  switch (timeOfDay) {
    case 'morning':
      return <Sun size={size} color={color} strokeWidth={strokeWidth} />;
    case 'afternoon':
      return <CloudSun size={size} color={color} strokeWidth={strokeWidth} />;
    case 'evening':
    case 'night':
      return <Moon size={size} color={color} strokeWidth={strokeWidth} />;
    default:
      return <Sun size={size} color={color} strokeWidth={strokeWidth} />;
  }
}

export function PersonalizedGreeting({ username, streak = 0 }: PersonalizedGreetingProps) {
  const { theme } = useTheme();
  const colors = theme.colors;
  const timeOfDay = getTimeOfDay();
  const greeting = getGreeting(timeOfDay, username);

  return (
    <View style={styles.container}>
      <View style={styles.greetingRow}>
        {getTimeIcon(timeOfDay, colors.mutedForeground)}
        <Text style={[styles.greetingText, { color: colors.foreground }]}>
          {greeting}
        </Text>
      </View>
      {streak > 0 && (
        <View style={styles.streakRow}>
          <Flame size={16} color="#f97316" strokeWidth={2} fill="#f97316" />
          <Text style={[styles.streakText, { color: colors.mutedForeground }]}>
            Day {streak} streak
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  greetingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  greetingText: {
    fontSize: 18,
    fontWeight: '600',
  },
  streakRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
    marginLeft: 26, // Align with text
  },
  streakText: {
    fontSize: 14,
    fontWeight: '500',
  },
});

export default PersonalizedGreeting;
