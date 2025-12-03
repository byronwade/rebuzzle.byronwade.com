/**
 * Input Component
 * Styled text input matching shadcn/ui design
 */

import React, { useState, forwardRef } from 'react';
import {
  TextInput,
  View,
  Text,
  StyleSheet,
  Platform,
  ViewStyle,
  TextStyle,
  TextInputProps,
} from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { useTheme } from '../../contexts/ThemeContext';
import { hexToRgba } from '../../lib/theme';

const AnimatedView = Animated.createAnimatedComponent(View);

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  hint?: string;
  containerStyle?: ViewStyle;
  inputStyle?: TextStyle;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Input = forwardRef<TextInput, InputProps>(
  (
    {
      label,
      error,
      hint,
      containerStyle,
      inputStyle,
      leftIcon,
      rightIcon,
      onFocus,
      onBlur,
      ...props
    },
    ref
  ) => {
    const { theme, isDark } = useTheme();
    const colors = theme.colors;
    const [isFocused, setIsFocused] = useState(false);
    const focusAnimation = useSharedValue(0);

    const animatedBorderStyle = useAnimatedStyle(() => ({
      borderColor: error
        ? colors.destructive
        : focusAnimation.value === 1
        ? colors.accent
        : colors.border,
      borderWidth: focusAnimation.value === 1 ? 2 : 1,
    }));

    const handleFocus = (e: any) => {
      setIsFocused(true);
      focusAnimation.value = withTiming(1, { duration: 150 });
      onFocus?.(e);
    };

    const handleBlur = (e: any) => {
      setIsFocused(false);
      focusAnimation.value = withTiming(0, { duration: 150 });
      onBlur?.(e);
    };

    return (
      <View style={[styles.container, containerStyle]}>
        {label && (
          <Text style={[styles.label, { color: colors.foreground }]}>{label}</Text>
        )}
        <AnimatedView
          style={[
            styles.inputContainer,
            {
              backgroundColor: colors.secondary,
            },
            animatedBorderStyle,
          ]}
        >
          {leftIcon && <View style={styles.leftIcon}>{leftIcon}</View>}
          <TextInput
            ref={ref}
            style={[
              styles.input,
              {
                color: colors.foreground,
              },
              leftIcon && styles.inputWithLeftIcon,
              rightIcon && styles.inputWithRightIcon,
              inputStyle,
            ]}
            placeholderTextColor={colors.mutedForeground}
            onFocus={handleFocus}
            onBlur={handleBlur}
            {...props}
          />
          {rightIcon && <View style={styles.rightIcon}>{rightIcon}</View>}
        </AnimatedView>
        {error && (
          <Text style={[styles.error, { color: colors.destructive }]}>{error}</Text>
        )}
        {hint && !error && (
          <Text style={[styles.hint, { color: colors.mutedForeground }]}>{hint}</Text>
        )}
      </View>
    );
  }
);

Input.displayName = 'Input';

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    overflow: 'hidden',
  },
  input: {
    flex: 1,
    padding: 16,
    fontSize: 16,
  },
  inputWithLeftIcon: {
    paddingLeft: 8,
  },
  inputWithRightIcon: {
    paddingRight: 8,
  },
  leftIcon: {
    paddingLeft: 12,
  },
  rightIcon: {
    paddingRight: 12,
  },
  error: {
    fontSize: 12,
    marginTop: 6,
  },
  hint: {
    fontSize: 12,
    marginTop: 6,
  },
});

export default Input;
