/**
 * Badge Component
 * Status/rarity badges matching shadcn/ui design
 */

import React from 'react';
import { View, Text, StyleSheet, ViewStyle, TextStyle } from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';
import { hexToRgba } from '../../lib/theme';

type BadgeVariant = 'default' | 'secondary' | 'outline' | 'destructive' | 'success' | 'warning';
type BadgeRarity = 'common' | 'rare' | 'epic' | 'legendary';

interface BadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
  rarity?: BadgeRarity;
  style?: ViewStyle;
  textStyle?: TextStyle;
  icon?: React.ReactNode;
}

const RARITY_COLORS: Record<BadgeRarity, { bg: string; text: string; border: string }> = {
  common: {
    bg: '#6b7280',
    text: '#f3f4f6',
    border: '#9ca3af',
  },
  rare: {
    bg: '#3b82f6',
    text: '#dbeafe',
    border: '#60a5fa',
  },
  epic: {
    bg: '#8b5cf6',
    text: '#ede9fe',
    border: '#a78bfa',
  },
  legendary: {
    bg: '#f59e0b',
    text: '#fef3c7',
    border: '#fbbf24',
  },
};

export function Badge({
  children,
  variant = 'default',
  rarity,
  style,
  textStyle,
  icon,
}: BadgeProps) {
  const { theme } = useTheme();
  const colors = theme.colors;

  const getVariantStyles = (): { container: ViewStyle; text: TextStyle } => {
    // If rarity is provided, use rarity colors
    if (rarity) {
      const rarityColors = RARITY_COLORS[rarity];
      return {
        container: {
          backgroundColor: hexToRgba(rarityColors.bg, 0.2),
          borderColor: hexToRgba(rarityColors.border, 0.3),
          borderWidth: 1,
        },
        text: {
          color: rarityColors.text,
        },
      };
    }

    switch (variant) {
      case 'default':
        return {
          container: {
            backgroundColor: colors.accent,
          },
          text: {
            color: colors.accentForeground,
          },
        };
      case 'secondary':
        return {
          container: {
            backgroundColor: colors.secondary,
          },
          text: {
            color: colors.secondaryForeground,
          },
        };
      case 'outline':
        return {
          container: {
            backgroundColor: 'transparent',
            borderWidth: 1,
            borderColor: colors.border,
          },
          text: {
            color: colors.foreground,
          },
        };
      case 'destructive':
        return {
          container: {
            backgroundColor: hexToRgba(colors.destructive, 0.15),
          },
          text: {
            color: colors.destructive,
          },
        };
      case 'success':
        return {
          container: {
            backgroundColor: hexToRgba(colors.success, 0.15),
          },
          text: {
            color: colors.success,
          },
        };
      case 'warning':
        return {
          container: {
            backgroundColor: hexToRgba(colors.warning, 0.15),
          },
          text: {
            color: colors.warning,
          },
        };
      default:
        return {
          container: {},
          text: {},
        };
    }
  };

  const variantStyles = getVariantStyles();

  return (
    <View style={[styles.badge, variantStyles.container, style]}>
      {icon && <View style={styles.icon}>{icon}</View>}
      {typeof children === 'string' ? (
        <Text style={[styles.text, variantStyles.text, textStyle]}>{children}</Text>
      ) : (
        children
      )}
    </View>
  );
}

// Rarity badge specifically for achievements
export function RarityBadge({ rarity }: { rarity: BadgeRarity }) {
  const rarityLabels: Record<BadgeRarity, string> = {
    common: 'Common',
    rare: 'Rare',
    epic: 'Epic',
    legendary: 'Legendary',
  };

  const rarityIcons: Record<BadgeRarity, string> = {
    common: '⚪',
    rare: '🔵',
    epic: '🟣',
    legendary: '🟡',
  };

  return (
    <Badge rarity={rarity} icon={<Text>{rarityIcons[rarity]}</Text>}>
      {rarityLabels[rarity]}
    </Badge>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 9999,
  },
  icon: {
    marginRight: 4,
  },
  text: {
    fontSize: 12,
    fontWeight: '600',
  },
});

export default Badge;
