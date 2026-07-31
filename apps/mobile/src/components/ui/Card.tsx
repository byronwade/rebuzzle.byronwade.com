/**
 * Card Component
 * Styled card container with shadow matching shadcn/ui design
 */

import React from 'react';
import { View, Text, StyleSheet, Platform, ViewStyle, TextStyle } from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';
import { hexToRgba } from '../../lib/theme';

interface CardProps {
  children: React.ReactNode;
  style?: ViewStyle;
  variant?: 'default' | 'elevated' | 'outlined';
}

interface CardHeaderProps {
  children: React.ReactNode;
  style?: ViewStyle;
}

interface CardTitleProps {
  children: React.ReactNode;
  style?: TextStyle;
}

interface CardDescriptionProps {
  children: React.ReactNode;
  style?: TextStyle;
}

interface CardContentProps {
  children: React.ReactNode;
  style?: ViewStyle;
}

interface CardFooterProps {
  children: React.ReactNode;
  style?: ViewStyle;
}

export function Card({ children, style, variant = 'default' }: CardProps) {
  const { theme, isDark } = useTheme();
  const colors = theme.colors;

  const getVariantStyles = (): ViewStyle => {
    switch (variant) {
      case 'elevated':
        return {
          backgroundColor: colors.card,
          borderColor: hexToRgba(colors.border, 0.5),
          borderWidth: 1,
          ...Platform.select({
            ios: {
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: isDark ? 0.3 : 0.08,
              shadowRadius: 12,
            },
            android: {
              elevation: 4,
            },
          }),
        };
      case 'outlined':
        return {
          backgroundColor: colors.card,
          borderColor: colors.border,
          borderWidth: 1,
        };
      case 'default':
      default:
        return {
          backgroundColor: colors.card,
          borderColor: hexToRgba(colors.border, 0.5),
          borderWidth: 1,
          ...Platform.select({
            ios: {
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: isDark ? 0.2 : 0.05,
              shadowRadius: 4,
            },
            android: {
              elevation: 2,
            },
          }),
        };
    }
  };

  return (
    <View style={[styles.card, getVariantStyles(), style]}>
      {children}
    </View>
  );
}

export function CardHeader({ children, style }: CardHeaderProps) {
  return <View style={[styles.header, style]}>{children}</View>;
}

export function CardTitle({ children, style }: CardTitleProps) {
  const { theme } = useTheme();

  return (
    <Text style={[styles.title, { color: theme.colors.cardForeground }, style]}>
      {children}
    </Text>
  );
}

export function CardDescription({ children, style }: CardDescriptionProps) {
  const { theme } = useTheme();

  return (
    <Text style={[styles.description, { color: theme.colors.mutedForeground }, style]}>
      {children}
    </Text>
  );
}

export function CardContent({ children, style }: CardContentProps) {
  return <View style={[styles.content, style]}>{children}</View>;
}

export function CardFooter({ children, style }: CardFooterProps) {
  const { theme } = useTheme();

  return (
    <View style={[styles.footer, { borderTopColor: hexToRgba(theme.colors.border, 0.5) }, style]}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  header: {
    padding: 20,
    paddingBottom: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 4,
  },
  description: {
    fontSize: 14,
    lineHeight: 20,
  },
  content: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  footer: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    borderTopWidth: 1,
  },
});

export default Card;
