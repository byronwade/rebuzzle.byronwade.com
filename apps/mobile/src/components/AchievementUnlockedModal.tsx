/**
 * AchievementUnlockedModal Component
 * Celebration modal for newly unlocked achievements
 */

import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  Modal,
  Pressable,
  StyleSheet,
  Animated,
  ScrollView,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import type { NewlyUnlockedAchievement, AchievementRarity } from '../types';

// Rarity colors
const RARITY_COLORS: Record<string, { border: string; bg: string; text: string }> = {
  common: { border: '#9ca3af', bg: 'rgba(156, 163, 175, 0.15)', text: '#9ca3af' },
  uncommon: { border: '#22c55e', bg: 'rgba(34, 197, 94, 0.15)', text: '#22c55e' },
  rare: { border: '#3b82f6', bg: 'rgba(59, 130, 246, 0.15)', text: '#3b82f6' },
  epic: { border: '#8b5cf6', bg: 'rgba(139, 92, 246, 0.15)', text: '#8b5cf6' },
  legendary: { border: '#facc15', bg: 'rgba(250, 204, 21, 0.15)', text: '#facc15' },
};

// Icon mapping
const ICON_MAP: Record<string, string> = {
  trophy: '🏆',
  star: '⭐',
  zap: '⚡',
  flame: '🔥',
  target: '🎯',
  clock: '⏰',
  crown: '👑',
  gem: '💎',
  medal: '🏅',
  rocket: '🚀',
  brain: '🧠',
  default: '🏆',
};

interface AchievementUnlockedModalProps {
  /** List of newly unlocked achievements */
  achievements: NewlyUnlockedAchievement[];
  /** Total points earned */
  totalPoints: number;
  /** Callback when modal is dismissed */
  onDismiss: () => void;
  /** Whether modal is visible */
  visible: boolean;
}

export function AchievementUnlockedModal({
  achievements,
  totalPoints,
  onDismiss,
  visible,
}: AchievementUnlockedModalProps) {
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      // Trigger haptic feedback
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      // Animate in
      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1,
          tension: 50,
          friction: 7,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      scaleAnim.setValue(0);
      opacityAnim.setValue(0);
    }
  }, [visible, scaleAnim, opacityAnim]);

  const handleDismiss = () => {
    Animated.parallel([
      Animated.timing(scaleAnim, {
        toValue: 0,
        duration: 150,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 0,
        duration: 150,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onDismiss();
    });
  };

  if (achievements.length === 0) {
    return null;
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={handleDismiss}
    >
      <Animated.View style={[styles.overlay, { opacity: opacityAnim }]}>
        <Animated.View
          style={[
            styles.modal,
            {
              transform: [{ scale: scaleAnim }],
            },
          ]}
        >
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.celebration}>🎉</Text>
            <Text style={styles.title}>
              Achievement{achievements.length > 1 ? 's' : ''} Unlocked!
            </Text>
          </View>

          {/* Achievements List */}
          <ScrollView
            style={styles.achievementsList}
            showsVerticalScrollIndicator={false}
          >
            {achievements.map((achievement) => {
              const colors = RARITY_COLORS[achievement.rarity] || RARITY_COLORS.common;
              const icon = ICON_MAP[achievement.icon] || ICON_MAP.default;

              return (
                <View
                  key={achievement.id}
                  style={[
                    styles.achievementItem,
                    { backgroundColor: colors.bg, borderColor: colors.border },
                  ]}
                >
                  <Text style={styles.achievementIcon}>{icon}</Text>
                  <View style={styles.achievementInfo}>
                    <Text style={styles.achievementName}>{achievement.name}</Text>
                    <Text style={styles.achievementDescription}>
                      {achievement.description}
                    </Text>
                    <View style={styles.achievementMeta}>
                      <Text style={[styles.rarityBadge, { color: colors.text }]}>
                        {achievement.rarity.toUpperCase()}
                      </Text>
                      <Text style={styles.pointsBadge}>+{achievement.points} pts</Text>
                    </View>
                  </View>
                </View>
              );
            })}
          </ScrollView>

          {/* Total Points */}
          {totalPoints > 0 && (
            <View style={styles.totalPoints}>
              <Text style={styles.totalPointsLabel}>Total Points Earned</Text>
              <Text style={styles.totalPointsValue}>+{totalPoints}</Text>
            </View>
          )}

          {/* Dismiss Button */}
          <Pressable style={styles.dismissButton} onPress={handleDismiss}>
            <Text style={styles.dismissButtonText}>Awesome!</Text>
          </Pressable>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modal: {
    backgroundColor: '#1a1a2e',
    borderRadius: 20,
    padding: 24,
    width: '100%',
    maxWidth: 340,
    maxHeight: '80%',
    borderWidth: 1,
    borderColor: 'rgba(250, 204, 21, 0.3)',
  },
  header: {
    alignItems: 'center',
    marginBottom: 20,
  },
  celebration: {
    fontSize: 48,
    marginBottom: 8,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
  },
  achievementsList: {
    maxHeight: 300,
  },
  achievementItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
  },
  achievementIcon: {
    fontSize: 32,
    marginRight: 12,
  },
  achievementInfo: {
    flex: 1,
  },
  achievementName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 4,
  },
  achievementDescription: {
    fontSize: 13,
    color: '#94a3b8',
    marginBottom: 6,
  },
  achievementMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  rarityBadge: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  pointsBadge: {
    fontSize: 12,
    color: '#facc15',
    fontWeight: '600',
  },
  totalPoints: {
    alignItems: 'center',
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
    marginTop: 8,
  },
  totalPointsLabel: {
    fontSize: 12,
    color: '#94a3b8',
    marginBottom: 4,
  },
  totalPointsValue: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#facc15',
  },
  dismissButton: {
    backgroundColor: '#facc15',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 20,
  },
  dismissButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1a1a2e',
  },
});
