/**
 * AnswerInput Component
 * Input field with submit button and helper text
 */

import React, { useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Platform,
  Keyboard,
  TouchableOpacity,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
  withSpring,
} from 'react-native-reanimated';
import { Send, ArrowRight } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../../contexts/ThemeContext';
import { hexToRgba } from '../../lib/theme';
import { SPRING_CONFIG } from '../../lib/animations';

interface AnswerInputProps {
  value: string;
  onChangeText: (text: string) => void;
  onSubmit: () => void;
  disabled?: boolean;
  placeholder?: string;
  helperText?: string;
  showShake?: boolean;
  onShakeComplete?: () => void;
}

const AnimatedTextInput = Animated.createAnimatedComponent(TextInput);
const AnimatedTouchableOpacity = Animated.createAnimatedComponent(TouchableOpacity);

export function AnswerInput({
  value,
  onChangeText,
  onSubmit,
  disabled = false,
  placeholder = 'Enter your answer...',
  helperText = 'Words turn green when correct',
  showShake = false,
  onShakeComplete,
}: AnswerInputProps) {
  const { theme, isDark } = useTheme();
  const colors = theme.colors;
  const inputRef = useRef<TextInput>(null);
  const shakeX = useSharedValue(0);
  const buttonScale = useSharedValue(1);

  // Shake animation effect
  useEffect(() => {
    if (showShake) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      shakeX.value = withSequence(
        withTiming(-10, { duration: 50 }),
        withTiming(10, { duration: 50 }),
        withTiming(-10, { duration: 50 }),
        withTiming(10, { duration: 50 }),
        withTiming(0, { duration: 50 })
      );
      setTimeout(() => {
        onShakeComplete?.();
      }, 250);
    }
  }, [showShake]);

  const inputAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: shakeX.value }],
  }));

  const buttonAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: buttonScale.value }],
  }));

  const handleSubmit = () => {
    if (!value.trim() || disabled) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    buttonScale.value = withSequence(
      withSpring(0.9, SPRING_CONFIG.stiff),
      withSpring(1, SPRING_CONFIG.gentle)
    );
    onSubmit();
    Keyboard.dismiss();
  };

  const handleButtonPressIn = () => {
    buttonScale.value = withSpring(0.95, SPRING_CONFIG.stiff);
  };

  const handleButtonPressOut = () => {
    buttonScale.value = withSpring(1, SPRING_CONFIG.gentle);
  };

  const canSubmit = value.trim().length > 0 && !disabled;

  return (
    <View style={styles.container}>
      <Animated.View
        style={[
          styles.inputContainer,
          {
            backgroundColor: colors.card,
            borderColor: showShake ? colors.destructive : colors.border,
          },
          inputAnimatedStyle,
        ]}
      >
        <TextInput
          ref={inputRef}
          style={[
            styles.input,
            {
              color: colors.foreground,
            },
          ]}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={colors.mutedForeground}
          editable={!disabled}
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="send"
          onSubmitEditing={handleSubmit}
          blurOnSubmit={false}
        />
        <AnimatedTouchableOpacity
          style={[
            styles.submitButton,
            {
              backgroundColor: canSubmit
                ? colors.primary
                : hexToRgba(colors.foreground, 0.1),
            },
            buttonAnimatedStyle,
          ]}
          onPress={handleSubmit}
          onPressIn={handleButtonPressIn}
          onPressOut={handleButtonPressOut}
          disabled={!canSubmit}
          activeOpacity={0.8}
        >
          <Send
            size={18}
            color={canSubmit ? colors.primaryForeground : colors.mutedForeground}
            strokeWidth={2.5}
          />
        </AnimatedTouchableOpacity>
      </Animated.View>
      {helperText && (
        <Text style={[styles.helperText, { color: colors.mutedForeground }]}>
          {helperText}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 'auto',
    paddingTop: 16,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    borderWidth: 1.5,
    paddingLeft: 16,
    paddingRight: 6,
    paddingVertical: 6,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  input: {
    flex: 1,
    fontSize: 16,
    paddingVertical: Platform.OS === 'ios' ? 12 : 10,
    marginRight: 8,
  },
  submitButton: {
    width: 44,
    height: 44,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  helperText: {
    fontSize: 12,
    textAlign: 'center',
    marginTop: 8,
  },
});

export default AnswerInput;
