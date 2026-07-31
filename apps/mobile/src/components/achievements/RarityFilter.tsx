/**
 * RarityFilter Component
 * Rarity selection for filtering achievements
 */

import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import * as Haptics from 'expo-haptics';
import { Circle, CheckCircle } from 'lucide-react-native';
import { useTheme } from '../../contexts/ThemeContext';
import { hexToRgba } from '../../lib/theme';
import type { AchievementRarity } from './AchievementCard';

interface RarityFilterProps {
  selected: AchievementRarity | 'all';
  onSelect: (rarity: AchievementRarity | 'all') => void;
}

const RARITIES: { key: AchievementRarity | 'all'; label: string; color: string }[] = [
  { key: 'all', label: 'All', color: '#9ca3af' },
  { key: 'common', label: 'Common', color: '#9ca3af' },
  { key: 'uncommon', label: 'Uncommon', color: '#22c55e' },
  { key: 'rare', label: 'Rare', color: '#3b82f6' },
  { key: 'epic', label: 'Epic', color: '#8b5cf6' },
  { key: 'legendary', label: 'Legendary', color: '#f59e0b' },
];

export function RarityFilter({ selected, onSelect }: RarityFilterProps) {
  const { theme } = useTheme();
  const colors = theme.colors;

  return (
    <View style={[styles.container, { borderColor: colors.border }]}>
      <Text style={[styles.label, { color: colors.mutedForeground }]}>Rarity:</Text>
      <View style={styles.options}>
        {RARITIES.map((rarity) => {
          const isSelected = selected === rarity.key;
          return (
            <Pressable
              key={rarity.key}
              style={[
                styles.option,
                {
                  backgroundColor: isSelected
                    ? hexToRgba(rarity.color, 0.15)
                    : 'transparent',
                  borderColor: isSelected ? rarity.color : 'transparent',
                },
              ]}
              onPress={() => {
                Haptics.selectionAsync();
                onSelect(rarity.key);
              }}
            >
              {isSelected ? (
                <CheckCircle size={14} color={rarity.color} strokeWidth={2.5} />
              ) : (
                <Circle size={14} color={colors.mutedForeground} strokeWidth={1.5} />
              )}
              <Text
                style={[
                  styles.optionText,
                  { color: isSelected ? rarity.color : colors.mutedForeground },
                ]}
              >
                {rarity.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 10,
  },
  options: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    borderWidth: 1,
  },
  optionText: {
    fontSize: 12,
    fontWeight: '500',
  },
});

export default RarityFilter;
