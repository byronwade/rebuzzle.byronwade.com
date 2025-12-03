/**
 * TimeframeTabs Component
 * Horizontal tab selector for leaderboard timeframes
 */

import React from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../../contexts/ThemeContext';
import { hexToRgba } from '../../lib/theme';
import { SPRING_CONFIG } from '../../lib/animations';

export type Timeframe = 'today' | 'week' | 'month' | 'all';

interface TimeframeTabsProps {
  selected: Timeframe;
  onSelect: (timeframe: Timeframe) => void;
}

const TABS: { key: Timeframe; label: string }[] = [
  { key: 'today', label: 'Today' },
  { key: 'week', label: 'Week' },
  { key: 'month', label: 'Month' },
  { key: 'all', label: 'All Time' },
];

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function TimeframeTabs({ selected, onSelect }: TimeframeTabsProps) {
  const { theme } = useTheme();
  const colors = theme.colors;

  return (
    <View style={[styles.container, { backgroundColor: colors.card, borderColor: colors.border }]}>
      {TABS.map((tab) => {
        const isSelected = selected === tab.key;
        return (
          <Pressable
            key={tab.key}
            style={[
              styles.tab,
              isSelected && [
                styles.tabSelected,
                { backgroundColor: colors.primary },
              ],
            ]}
            onPress={() => {
              Haptics.selectionAsync();
              onSelect(tab.key);
            }}
          >
            <Text
              style={[
                styles.tabText,
                { color: isSelected ? colors.primaryForeground : colors.mutedForeground },
                isSelected && styles.tabTextSelected,
              ]}
            >
              {tab.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    borderRadius: 12,
    borderWidth: 1,
    padding: 4,
    marginBottom: 16,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabSelected: {},
  tabText: {
    fontSize: 13,
    fontWeight: '500',
  },
  tabTextSelected: {
    fontWeight: '600',
  },
});

export default TimeframeTabs;
