/**
 * Button Component
 * Styled button with variants matching shadcn/ui design
 */

import React from 'react';
import {
  Pressable,
  Text,
  StyleSheet,
  ActivityIndicator,
  Platform,
  ViewStyle,
  TextStyle,
  PressableProps,
} from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../../contexts/ThemeContext';
import { hexToRgba } from '../../lib/theme';
import { pressIn, pressOut } from '../../lib/animations';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

type ButtonVariant = 'default' | 'secondary' | 'outline' | 'ghost' | 'destructive' | 'link';
type ButtonSize = 'sm' | 'default' | 'lg' | 'icon';

interface ButtonProps extends Omit<PressableProps, 'style'> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  children: React.ReactNode;
  loading?: boolean;
  disabled?: boolean;
  icon?: React.ReactNode;
  style?: ViewStyle;
  textStyle?: TextStyle;
  haptic?: boolean;
}

export function Button({
  variant = 'default',
  size = 'default',
  children,
  loading = false,
  disabled = false,
  icon,
  style,
  textStyle,
  haptic = true,
  onPress,
  onPressIn,
  onPressOut,
  ...props
}: ButtonProps) {
  const { theme, isDark } = useTheme();
  const colors = theme.colors;
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = (e: any) => {
    pressIn(scale);
    onPressIn?.(e);
  };

  const handlePressOut = (e: any) => {
    pressOut(scale);
    onPressOut?.(e);
  };

  const handlePress = (e: any) => {
    if (haptic && !disabled && !loading) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    onPress?.(e);
  };

  const getVariantStyles = (): { container: ViewStyle; text: TextStyle } => {
    switch (variant) {
      case 'default':
        // Match web: dark bg in light mode, light bg in dark mode
        return {
          container: {
            backgroundColor: colors.primary,
            ...Platform.select({
              ios: {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 1 },
                shadowOpacity: 0.1,
                shadowRadius: 2,
              },
              android: {
                elevation: 2,
              },
            }),
          },
          text: {
            color: colors.primaryForeground,
          },
        };
      case 'secondary':
        return {
          container: {
            backgroundColor: colors.secondary,
            ...Platform.select({
              ios: {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 1 },
                shadowOpacity: 0.05,
                shadowRadius: 2,
              },
              android: {
                elevation: 1,
              },
            }),
          },
          text: {
            color: colors.secondaryForeground,
          },
        };
      case 'outline':
        return {
          container: {
            backgroundColor: colors.background,
            borderWidth: 1,
            borderColor: colors.input,
            ...Platform.select({
              ios: {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 1 },
                shadowOpacity: 0.05,
                shadowRadius: 2,
              },
              android: {
                elevation: 1,
              },
            }),
          },
          text: {
            color: colors.foreground,
          },
        };
      case 'ghost':
        return {
          container: {
            backgroundColor: 'transparent',
          },
          text: {
            color: colors.foreground,
          },
        };
      case 'destructive':
        return {
          container: {
            backgroundColor: colors.destructive,
            ...Platform.select({
              ios: {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 1 },
                shadowOpacity: 0.1,
                shadowRadius: 2,
              },
              android: {
                elevation: 2,
              },
            }),
          },
          text: {
            color: colors.destructiveForeground,
          },
        };
      case 'link':
        return {
          container: {
            backgroundColor: 'transparent',
          },
          text: {
            color: colors.primary,
            textDecorationLine: 'underline',
          },
        };
      default:
        return {
          container: {},
          text: {},
        };
    }
  };

  const getSizeStyles = (): { container: ViewStyle; text: TextStyle } => {
    switch (size) {
      case 'sm':
        // Match web: h-8 (32px), px-3, text-xs
        return {
          container: {
            height: 32,
            paddingHorizontal: 12,
            borderRadius: 6,
          },
          text: {
            fontSize: 12,
          },
        };
      case 'default':
        // Match web: h-9 (36px), px-4, text-sm
        return {
          container: {
            height: 36,
            paddingHorizontal: 16,
            borderRadius: 6,
          },
          text: {
            fontSize: 14,
          },
        };
      case 'lg':
        // Match web: h-10 (40px), px-8, text-sm
        return {
          container: {
            height: 40,
            paddingHorizontal: 32,
            borderRadius: 6,
          },
          text: {
            fontSize: 14,
          },
        };
      case 'icon':
        // Match web: h-9 w-9 (36x36)
        return {
          container: {
            height: 36,
            width: 36,
            paddingHorizontal: 0,
            borderRadius: 6,
          },
          text: {
            fontSize: 14,
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
  const sizeStyles = getSizeStyles();

  return (
    <AnimatedPressable
      {...props}
      style={[
        styles.base,
        variantStyles.container,
        sizeStyles.container,
        (disabled || loading) && styles.disabled,
        animatedStyle,
        style,
      ]}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      onPress={handlePress}
      disabled={disabled || loading}
    >
      {loading ? (
        <ActivityIndicator
          color={variantStyles.text.color}
          size={size === 'sm' ? 'small' : 'small'}
        />
      ) : (
        <>
          {icon}
          {typeof children === 'string' ? (
            <Text
              style={[
                styles.text,
                variantStyles.text,
                sizeStyles.text,
                icon && styles.textWithIcon,
                textStyle,
              ]}
            >
              {children}
            </Text>
          ) : (
            children
          )}
        </>
      )}
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    fontWeight: '600',
  },
  textWithIcon: {
    marginLeft: 8,
  },
  disabled: {
    opacity: 0.5,
  },
});

export default Button;
