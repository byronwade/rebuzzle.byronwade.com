/**
 * HintBadge Component
 * Badge that shows hint count and opens a modal to reveal hints
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Modal,
  ScrollView,
  StyleProp,
  ViewStyle,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../contexts/ThemeContext';
import { hexToRgba } from '../lib/theme';

interface HintBadgeProps {
  /** All available hints */
  hints: string[];
  /** Current hint index (how many are revealed, 0 = none) */
  currentIndex: number;
  /** Callback when hint is revealed */
  onRevealHint: () => void;
  /** Whether more hints can be shown */
  canShowMore: boolean;
  /** Whether the game is complete */
  isComplete?: boolean;
  /** Optional container style */
  style?: StyleProp<ViewStyle>;
}

export function HintBadge({
  hints,
  currentIndex,
  onRevealHint,
  canShowMore,
  isComplete = false,
  style,
}: HintBadgeProps) {
  const [modalVisible, setModalVisible] = useState(false);
  const { theme } = useTheme();
  const colors = theme.colors;

  if (hints.length === 0) {
    return null;
  }

  const revealedCount = currentIndex + 1 > hints.length ? hints.length : currentIndex;
  const hintsRemaining = hints.length - revealedCount;

  const handleRevealHint = async () => {
    if (!canShowMore || isComplete) return;

    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onRevealHint();
  };

  const handleOpenModal = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setModalVisible(true);
  };

  return (
    <>
      {/* Badge Button */}
      <Pressable
        style={[
          styles.badge,
          {
            backgroundColor: hexToRgba(colors.accent, 0.15),
            borderColor: hexToRgba(colors.accent, 0.3),
          },
          style,
        ]}
        onPress={handleOpenModal}
      >
        <Text style={styles.badgeIcon}>💡</Text>
        <Text style={[styles.badgeLabel, { color: colors.accent }]}>
          Need Help?
        </Text>
        <Text style={[styles.badgeCount, { color: colors.accent }]}>
          ({hintsRemaining})
        </Text>
      </Pressable>

      {/* Hint Dialog Modal */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setModalVisible(false)}
        >
          <Pressable
            style={[
              styles.modalContent,
              {
                backgroundColor: colors.card,
                borderColor: colors.border,
              },
            ]}
            onPress={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <View style={styles.modalHeader}>
              <View style={styles.modalTitleRow}>
                <Text style={styles.modalIcon}>💡</Text>
                <Text style={[styles.modalTitle, { color: colors.foreground }]}>
                  Need a Hint?
                </Text>
              </View>
              <Pressable
                style={[
                  styles.closeButton,
                  { backgroundColor: hexToRgba(colors.foreground, 0.1) },
                ]}
                onPress={() => setModalVisible(false)}
              >
                <Text style={[styles.closeButtonText, { color: colors.mutedForeground }]}>
                  ✕
                </Text>
              </Pressable>
            </View>

            {/* Hint List */}
            <ScrollView style={styles.hintList} showsVerticalScrollIndicator={false}>
              {hints.map((hint, index) => {
                const isRevealed = index < revealedCount;
                return (
                  <View
                    key={index}
                    style={[
                      styles.hintItem,
                      {
                        backgroundColor: isRevealed
                          ? hexToRgba(colors.accent, 0.1)
                          : hexToRgba(colors.muted, 0.3),
                        borderColor: isRevealed
                          ? hexToRgba(colors.accent, 0.3)
                          : hexToRgba(colors.border, 0.5),
                      },
                    ]}
                  >
                    <Text style={[styles.hintNumber, { color: colors.mutedForeground }]}>
                      {index + 1}.
                    </Text>
                    {isRevealed ? (
                      <Text style={[styles.hintText, { color: colors.foreground }]}>
                        {hint}
                      </Text>
                    ) : (
                      <View style={styles.lockedHint}>
                        <Text style={styles.lockIcon}>🔒</Text>
                        <Text style={[styles.lockedText, { color: colors.mutedForeground }]}>
                          Locked
                        </Text>
                      </View>
                    )}
                  </View>
                );
              })}
            </ScrollView>

            {/* Footer */}
            <View style={[styles.modalFooter, { borderTopColor: colors.border }]}>
              <View style={styles.warningRow}>
                <Text style={styles.warningIcon}>⚠️</Text>
                <Text style={[styles.warningText, { color: colors.mutedForeground }]}>
                  Each hint costs <Text style={styles.warningBold}>-10 points</Text>
                </Text>
              </View>
              <Pressable
                style={[
                  styles.revealButton,
                  {
                    backgroundColor: canShowMore && !isComplete
                      ? colors.accent
                      : hexToRgba(colors.muted, 0.5),
                  },
                  (!canShowMore || isComplete) && styles.revealButtonDisabled,
                ]}
                onPress={handleRevealHint}
                disabled={!canShowMore || isComplete}
              >
                <Text style={styles.revealIcon}>💡</Text>
                <Text
                  style={[
                    styles.revealButtonText,
                    {
                      color: canShowMore && !isComplete
                        ? colors.accentForeground
                        : colors.mutedForeground,
                    },
                  ]}
                >
                  {isComplete
                    ? 'Puzzle Complete'
                    : hintsRemaining === 0
                    ? 'All Hints Revealed'
                    : `Reveal Hint (${hintsRemaining} left)`}
                </Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    gap: 4,
  },
  badgeIcon: {
    fontSize: 12,
  },
  badgeLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  badgeCount: {
    fontSize: 11,
    fontWeight: '500',
    fontVariant: ['tabular-nums'],
    opacity: 0.8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    width: '100%',
    maxWidth: 400,
    maxHeight: '80%',
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  modalTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  modalIcon: {
    fontSize: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  hintList: {
    padding: 16,
    maxHeight: 300,
  },
  hintItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 8,
    gap: 8,
  },
  hintNumber: {
    fontSize: 14,
    fontWeight: '700',
    minWidth: 20,
  },
  hintText: {
    fontSize: 14,
    flex: 1,
    lineHeight: 20,
  },
  lockedHint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  lockIcon: {
    fontSize: 12,
  },
  lockedText: {
    fontSize: 14,
    fontStyle: 'italic',
  },
  modalFooter: {
    padding: 16,
    borderTopWidth: 1,
    gap: 12,
  },
  warningRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  warningIcon: {
    fontSize: 14,
  },
  warningText: {
    fontSize: 13,
  },
  warningBold: {
    fontWeight: '700',
  },
  revealButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 10,
    gap: 8,
  },
  revealButtonDisabled: {
    opacity: 0.6,
  },
  revealIcon: {
    fontSize: 16,
  },
  revealButtonText: {
    fontSize: 15,
    fontWeight: '600',
  },
});
