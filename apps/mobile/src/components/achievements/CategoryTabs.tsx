/**
 * CategoryTabs Component
 * Horizontal scrollable category filter for achievements
 */

import React from 'react';
import { ScrollView, Text, StyleSheet, Pressable } from 'react-native';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../../contexts/ThemeContext';
import { hexToRgba } from '../../lib/theme';

export type AchievementCategory = 'all' | 'mastery' | 'speed' | 'streak' | 'social' | 'special';

interface CategoryTabsProps {
  selected: AchievementCategory;
  onSelect: (category: AchievementCategory) => void;
  counts?: Record<AchievementCategory, number>;
}

const CATEGORIES: { key: AchievementCategory; label: string; icon: string }[] = [
  { key: 'all', label: 'All', icon: '🏆' },
  { key: 'mastery', label: 'Mastery', icon: '⭐' },
  { key: 'speed', label: 'Speed', icon: '⚡' },
  { key: 'streak', label: 'Streak', icon: '🔥' },
  { key: 'social', label: 'Social', icon: '👥' },
  { key: 'special', label: 'Special', icon: '💎' },
];

export function CategoryTabs({ selected, onSelect, counts }: CategoryTabsProps) {
  const { theme } = useTheme();
  const colors = theme.colors;

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.container}
    >
      {CATEGORIES.map((category) => {
        const isSelected = selected === category.key;
        const count = counts?.[category.key];

        return (
          <Pressable
            key={category.key}
            style={[
              styles.tab,
              {
                backgroundColor: isSelected
                  ? colors.primary
                  : hexToRgba(colors.foreground, 0.05),
                borderColor: isSelected ? colors.primary : colors.border,
              },
            ]}
            onPress={() => {
              Haptics.selectionAsync();
              onSelect(category.key);
            }}
          >
            <Text style={styles.icon}>{category.icon}</Text>
            <Text
              style={[
                styles.label,
                { color: isSelected ? colors.primaryForeground : colors.foreground },
              ]}
            >
              {category.label}
            </Text>
            {count !== undefined && count > 0 && (
              <Text
                style={[
                  styles.count,
                  { color: isSelected ? colors.primaryForeground : colors.mutedForeground },
                ]}
              >
                {count}
              </Text>
            )}
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 20,
    borderWidth: 1,
  },
  icon: {
    fontSize: 14,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
  },
  count: {
    fontSize: 12,
    fontWeight: '500',
  },
});

export default CategoryTabs;
