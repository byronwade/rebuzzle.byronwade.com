/**
 * Celebration Overlay
 * Win celebration with confetti animation and score breakdown
 */

import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Pressable,
  Animated,
  Dimensions,
  Share,
  Platform,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../contexts/ThemeContext';
import { hexToRgba } from '../lib/theme';
import { Button } from './ui/Button';

interface CelebrationOverlayProps {
  visible: boolean;
  score: number | null;
  attempts: number;
  maxAttempts: number;
  elapsedTime: number;
  streak?: number;
  onDismiss: () => void;
  onShare?: () => void;
}

const { width, height } = Dimensions.get('window');

// Confetti particle component
function ConfettiParticle({ delay, color }: { delay: number; color: string }) {
  const translateY = useRef(new Animated.Value(-50)).current;
  const translateX = useRef(new Animated.Value(Math.random() * width)).current;
  const rotate = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const animation = Animated.sequence([
      Animated.delay(delay),
      Animated.parallel([
        Animated.timing(translateY, {
          toValue: height + 50,
          duration: 3000 + Math.random() * 2000,
          useNativeDriver: true,
        }),
        Animated.timing(translateX, {
          toValue: translateX._value + (Math.random() - 0.5) * 200,
          duration: 3000 + Math.random() * 2000,
          useNativeDriver: true,
        }),
        Animated.timing(rotate, {
          toValue: 360 * (Math.random() > 0.5 ? 1 : -1),
          duration: 3000,
          useNativeDriver: true,
        }),
        Animated.sequence([
          Animated.delay(2000),
          Animated.timing(opacity, {
            toValue: 0,
            duration: 1000,
            useNativeDriver: true,
          }),
        ]),
      ]),
    ]);

    animation.start();
  }, []);

  const spin = rotate.interpolate({
    inputRange: [0, 360],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <Animated.View
      style={[
        styles.confetti,
        {
          backgroundColor: color,
          transform: [
            { translateX },
            { translateY },
            { rotate: spin },
          ],
          opacity,
        },
      ]}
    />
  );
}

export function CelebrationOverlay({
  visible,
  score,
  attempts,
  maxAttempts,
  elapsedTime,
  streak,
  onDismiss,
  onShare,
}: CelebrationOverlayProps) {
  const { theme, isDark } = useTheme();
  const colors = theme.colors;
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  // Confetti colors
  const confettiColors = ['#f59e0b', '#22c55e', '#3b82f6', '#ec4899', '#8b5cf6'];
  const confettiCount = 50;

  useEffect(() => {
    if (visible) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1,
          useNativeDriver: true,
          damping: 12,
          stiffness: 150,
        }),
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      scaleAnim.setValue(0);
      fadeAnim.setValue(0);
    }
  }, [visible]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleShare = async () => {
    if (onShare) {
      onShare();
    } else {
      const attemptsText = `Solved in ${attempts}/${maxAttempts} attempts`;
      const scoreText = score ? `Score: ${score}` : '';
      const timeText = `Time: ${formatTime(elapsedTime)}`;
      const streakText = streak ? `Streak: ${streak} days` : '';

      const message = `🎉 Rebuzzle Daily Puzzle\n${attemptsText}\n${timeText}\n${scoreText}${streakText ? `\n${streakText}` : ''}\n\nPlay at rebuzzle.byronwade.com`;

      try {
        await Share.share({ message });
      } catch (err) {
        console.error('Share failed:', err);
      }
    }
  };

  // Calculate performance rating
  const getPerformanceEmoji = () => {
    if (attempts === 1) return '🏆';
    if (attempts <= 2) return '🌟';
    if (attempts <= 3) return '✨';
    return '🎉';
  };

  const getPerformanceText = () => {
    if (attempts === 1) return 'Perfect!';
    if (attempts <= 2) return 'Excellent!';
    if (attempts <= 3) return 'Great job!';
    return 'Well done!';
  };

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onDismiss}
    >
      <View style={styles.overlay}>
        {/* Confetti */}
        {Array.from({ length: confettiCount }).map((_, i) => (
          <ConfettiParticle
            key={i}
            delay={i * 30}
            color={confettiColors[i % confettiColors.length]}
          />
        ))}

        <Animated.View
          style={[
            styles.backdrop,
            {
              backgroundColor: hexToRgba('#000', 0.6),
              opacity: fadeAnim,
            },
          ]}
        />

        <Animated.View
          style={[
            styles.card,
            {
              backgroundColor: colors.card,
              borderColor: hexToRgba(colors.success, 0.3),
              transform: [{ scale: scaleAnim }],
              opacity: fadeAnim,
              ...Platform.select({
                ios: {
                  shadowColor: colors.success,
                  shadowOffset: { width: 0, height: 8 },
                  shadowOpacity: 0.3,
                  shadowRadius: 24,
                },
                android: {
                  elevation: 16,
                },
              }),
            },
          ]}
        >
          {/* Header emoji */}
          <Text style={styles.headerEmoji}>{getPerformanceEmoji()}</Text>

          {/* Title */}
          <Text style={[styles.title, { color: colors.foreground }]}>
            {getPerformanceText()}
          </Text>

          <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
            You solved today's puzzle!
          </Text>

          {/* Stats Grid */}
          <View style={styles.statsGrid}>
            <View style={[styles.statBox, { backgroundColor: hexToRgba(colors.accent, 0.1) }]}>
              <Text style={[styles.statValue, { color: colors.accent }]}>{attempts}</Text>
              <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>Attempts</Text>
            </View>
            <View style={[styles.statBox, { backgroundColor: hexToRgba(colors.success, 0.1) }]}>
              <Text style={[styles.statValue, { color: colors.success }]}>{formatTime(elapsedTime)}</Text>
              <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>Time</Text>
            </View>
            {score !== null && (
              <View style={[styles.statBox, { backgroundColor: hexToRgba('#f59e0b', 0.1) }]}>
                <Text style={[styles.statValue, { color: '#f59e0b' }]}>{score}</Text>
                <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>Score</Text>
              </View>
            )}
          </View>

          {/* Streak badge */}
          {streak && streak > 1 && (
            <View style={[styles.streakBadge, { backgroundColor: hexToRgba(colors.accent, 0.15) }]}>
              <Text style={styles.streakEmoji}>🔥</Text>
              <Text style={[styles.streakText, { color: colors.accent }]}>
                {streak} day streak!
              </Text>
            </View>
          )}

          {/* Actions */}
          <View style={styles.actions}>
            <Button
              variant="default"
              onPress={handleShare}
              style={styles.shareButton}
            >
              Share Result
            </Button>
            <Button
              variant="ghost"
              onPress={onDismiss}
              style={styles.dismissButton}
            >
              Continue
            </Button>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  card: {
    width: width - 48,
    maxWidth: 360,
    borderRadius: 24,
    padding: 28,
    alignItems: 'center',
    borderWidth: 1,
  },
  headerEmoji: {
    fontSize: 64,
    marginBottom: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    marginBottom: 24,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  statBox: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
  },
  streakBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginBottom: 24,
    gap: 6,
  },
  streakEmoji: {
    fontSize: 16,
  },
  streakText: {
    fontSize: 14,
    fontWeight: '600',
  },
  actions: {
    width: '100%',
    gap: 12,
  },
  shareButton: {
    width: '100%',
  },
  dismissButton: {
    width: '100%',
  },
  confetti: {
    position: 'absolute',
    width: 10,
    height: 10,
    borderRadius: 2,
  },
});

export default CelebrationOverlay;
