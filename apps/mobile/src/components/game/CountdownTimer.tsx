/**
 * CountdownTimer Component
 * Countdown to next puzzle with animated display
 */

import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import Animated, { FadeIn, useAnimatedStyle, withRepeat, withSequence, withTiming } from 'react-native-reanimated';
import { Clock, RefreshCw } from 'lucide-react-native';
import { useTheme } from '../../contexts/ThemeContext';
import { hexToRgba } from '../../lib/theme';

interface CountdownTimerProps {
  targetDate: Date;
  onComplete?: () => void;
  label?: string;
}

interface TimeLeft {
  hours: number;
  minutes: number;
  seconds: number;
}

function calculateTimeLeft(targetDate: Date): TimeLeft {
  const difference = targetDate.getTime() - new Date().getTime();

  if (difference <= 0) {
    return { hours: 0, minutes: 0, seconds: 0 };
  }

  return {
    hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
    minutes: Math.floor((difference / 1000 / 60) % 60),
    seconds: Math.floor((difference / 1000) % 60),
  };
}

export function CountdownTimer({
  targetDate,
  onComplete,
  label = 'Next puzzle in',
}: CountdownTimerProps) {
  const { theme, isDark } = useTheme();
  const colors = theme.colors;
  const [timeLeft, setTimeLeft] = useState<TimeLeft>(calculateTimeLeft(targetDate));
  const [isComplete, setIsComplete] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => {
      const newTimeLeft = calculateTimeLeft(targetDate);
      setTimeLeft(newTimeLeft);

      if (newTimeLeft.hours === 0 && newTimeLeft.minutes === 0 && newTimeLeft.seconds === 0) {
        setIsComplete(true);
        clearInterval(timer);
        onComplete?.();
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [targetDate, onComplete]);

  const pulseStyle = useAnimatedStyle(() => ({
    opacity: withRepeat(
      withSequence(
        withTiming(0.5, { duration: 1000 }),
        withTiming(1, { duration: 1000 })
      ),
      -1,
      true
    ),
  }));

  const formatNumber = (num: number): string => num.toString().padStart(2, '0');

  if (isComplete) {
    return (
      <Animated.View
        entering={FadeIn.duration(300)}
        style={[styles.container, { backgroundColor: hexToRgba(colors.success, 0.1), borderColor: colors.success }]}
      >
        <RefreshCw size={20} color={colors.success} strokeWidth={2} />
        <Text style={[styles.completeText, { color: colors.success }]}>New puzzle available!</Text>
      </Animated.View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={styles.labelRow}>
        <Clock size={16} color={colors.mutedForeground} strokeWidth={2} />
        <Text style={[styles.label, { color: colors.mutedForeground }]}>{label}</Text>
      </View>
      <View style={styles.timerRow}>
        {/* Hours */}
        <View style={styles.timeUnit}>
          <Animated.View style={[styles.timeBox, { backgroundColor: hexToRgba(colors.foreground, 0.05) }]}>
            <Text style={[styles.timeValue, { color: colors.foreground }]}>
              {formatNumber(timeLeft.hours)}
            </Text>
          </Animated.View>
          <Text style={[styles.timeLabel, { color: colors.mutedForeground }]}>hours</Text>
        </View>

        <Text style={[styles.separator, { color: colors.mutedForeground }]}>:</Text>

        {/* Minutes */}
        <View style={styles.timeUnit}>
          <View style={[styles.timeBox, { backgroundColor: hexToRgba(colors.foreground, 0.05) }]}>
            <Text style={[styles.timeValue, { color: colors.foreground }]}>
              {formatNumber(timeLeft.minutes)}
            </Text>
          </View>
          <Text style={[styles.timeLabel, { color: colors.mutedForeground }]}>min</Text>
        </View>

        <Text style={[styles.separator, { color: colors.mutedForeground }]}>:</Text>

        {/* Seconds */}
        <View style={styles.timeUnit}>
          <Animated.View style={[styles.timeBox, { backgroundColor: hexToRgba(colors.foreground, 0.05) }, pulseStyle]}>
            <Text style={[styles.timeValue, { color: colors.foreground }]}>
              {formatNumber(timeLeft.seconds)}
            </Text>
          </Animated.View>
          <Text style={[styles.timeLabel, { color: colors.mutedForeground }]}>sec</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 20,
    alignItems: 'center',
    marginBottom: 16,
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
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 12,
  },
  label: {
    fontSize: 13,
    fontWeight: '500',
  },
  timerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  timeUnit: {
    alignItems: 'center',
  },
  timeBox: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 10,
    minWidth: 56,
    alignItems: 'center',
  },
  timeValue: {
    fontSize: 28,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  timeLabel: {
    fontSize: 10,
    fontWeight: '500',
    textTransform: 'uppercase',
    marginTop: 4,
    letterSpacing: 0.5,
  },
  separator: {
    fontSize: 24,
    fontWeight: '600',
    marginBottom: 16,
  },
  completeText: {
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
});

export default CountdownTimer;
