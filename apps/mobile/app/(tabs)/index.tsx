/**
 * Game Screen
 * Daily puzzle gameplay with timer, hints, and achievements
 */

import { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  TextInput,
  View,
  Pressable,
  ActivityIndicator,
  ScrollView,
  Share,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { useGame } from '../../src/contexts/GameContext';
import { useAchievements } from '../../src/contexts/AchievementsContext';
import { useOffline } from '../../src/contexts/OfflineContext';
import { useTheme } from '../../src/contexts/ThemeContext';
import { Timer } from '../../src/components/Timer';
import { HintBadge } from '../../src/components/HintBadge';
import { OfflineIndicator } from '../../src/components/OfflineIndicator';
import { AchievementUnlockedModal } from '../../src/components/AchievementUnlockedModal';
import { hexToRgba } from '../../src/lib/theme';

export default function GameScreen() {
  const {
    puzzle,
    isLoading,
    error,
    attempts,
    maxAttempts,
    guesses,
    isComplete,
    isCorrect,
    score,
    elapsedTime,
    availableHints,
    currentHintIndex,
    canShowHint,
    aiFeedback,
    isOffline,
    loadTodayPuzzle,
    submitGuess,
    showNextHint,
    getGameContext,
  } = useGame();

  const { checkAchievementsAfterGame, newlyUnlocked, newlyUnlockedPoints, dismissNewAchievements } =
    useAchievements();

  const { isOnline } = useOffline();
  const { theme, isDark } = useTheme();
  const colors = theme.colors;

  const [guess, setGuess] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [showAchievementModal, setShowAchievementModal] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);

  // Load puzzle on mount
  useEffect(() => {
    loadTodayPuzzle();
  }, [loadTodayPuzzle]);

  // Show achievement modal when new achievements are unlocked
  useEffect(() => {
    if (newlyUnlocked.length > 0) {
      setShowAchievementModal(true);
    }
  }, [newlyUnlocked]);

  const handleSubmit = async () => {
    if (!guess.trim() || submitting || isComplete) return;

    setSubmitting(true);
    setFeedbackMessage(null);

    try {
      const result = await submitGuess(guess.trim());

      if (result.correct) {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

        // Check for achievements after winning
        const gameContext = getGameContext();
        if (gameContext) {
          await checkAchievementsAfterGame(gameContext);
        }
      } else {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);

        // Show AI feedback if available
        if (result.feedback) {
          setFeedbackMessage(result.feedback);
        }

        // Check achievements on game over too
        if (result.gameOver) {
          const gameContext = getGameContext();
          if (gameContext) {
            await checkAchievementsAfterGame(gameContext);
          }
        }
      }
    } finally {
      setSubmitting(false);
      setGuess('');
    }
  };

  const handleShare = async () => {
    if (!puzzle || !isComplete) return;

    const attemptsText = isCorrect
      ? `Solved in ${attempts} attempt${attempts > 1 ? 's' : ''}!`
      : 'Better luck next time!';

    const scoreText = isCorrect && score ? `Score: ${score}` : '';

    const message = `Rebuzzle Daily Puzzle\n${attemptsText}\n${scoreText}\n\nPlay at rebuzzle.byronwade.com`;

    try {
      await Share.share({
        message,
      });
    } catch (err) {
      console.error('Share failed:', err);
    }
  };

  const handleDismissAchievements = () => {
    setShowAchievementModal(false);
    dismissNewAchievements();
  };

  // Loading state
  if (isLoading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['bottom']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.accent} />
          <Text style={[styles.loadingText, { color: colors.mutedForeground }]}>Loading puzzle...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // Error state
  if (error || !puzzle) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['bottom']}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorEmoji}>😕</Text>
          <Text style={[styles.errorTitle, { color: colors.foreground }]}>Oops!</Text>
          <Text style={[styles.errorText, { color: colors.mutedForeground }]}>
            {error || 'Failed to load puzzle'}
          </Text>
          <Pressable
            style={[
              styles.retryButton,
              {
                backgroundColor: hexToRgba(colors.accent, 0.15),
                borderColor: hexToRgba(colors.accent, 0.3),
              },
            ]}
            onPress={loadTodayPuzzle}
          >
            <Text style={[styles.retryButtonText, { color: colors.accent }]}>Try Again</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['bottom']}>
      {/* Offline Indicator */}
      {(isOffline || !isOnline) && <OfflineIndicator />}

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        {/* Puzzle Card */}
        <View
          style={[
            styles.puzzleCard,
            {
              backgroundColor: colors.card,
              borderColor: hexToRgba(colors.border, 0.5),
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
            },
          ]}
        >
          <View style={styles.puzzleHeader}>
            <Text style={[styles.puzzleLabel, { color: colors.accent }]}>Today's Puzzle</Text>
            <View style={styles.headerBadges}>
              {!isComplete && availableHints.length > 0 && (
                <HintBadge
                  hints={availableHints}
                  currentIndex={currentHintIndex}
                  onRevealHint={showNextHint}
                  canShowMore={canShowHint}
                  isComplete={isComplete}
                />
              )}
              {!isComplete && <Timer seconds={elapsedTime} size="small" />}
            </View>
          </View>
          <Text style={[styles.puzzleClue, { color: colors.cardForeground }]}>{puzzle.puzzle}</Text>
          {puzzle.puzzleType && (
            <View
              style={[
                styles.puzzleTypeBadge,
                { backgroundColor: hexToRgba(colors.accent, 0.15) },
              ]}
            >
              <Text style={[styles.puzzleTypeText, { color: colors.accent }]}>
                {puzzle.puzzleType}
              </Text>
            </View>
          )}
        </View>

        {/* Attempts Display - Visual */}
        <View style={styles.attemptsVisual}>
          {Array.from({ length: maxAttempts }).map((_, i) => (
            <View
              key={i}
              style={[
                styles.attemptDot,
                {
                  backgroundColor: i < attempts
                    ? hexToRgba(colors.destructive, 0.8)
                    : hexToRgba(colors.muted, 0.5),
                },
              ]}
            />
          ))}
        </View>


        {/* Previous Attempts */}
        {guesses.length > 0 && (
          <View style={styles.attemptsSection}>
            <Text style={[styles.attemptsTitle, { color: colors.mutedForeground }]}>
              Previous Attempts
            </Text>
            {guesses.map((attemptGuess, index) => (
              <View
                key={index}
                style={[
                  styles.attemptRow,
                  { backgroundColor: hexToRgba(colors.destructive, 0.1) },
                ]}
              >
                <Text style={[styles.attemptText, { color: colors.destructive }]}>{attemptGuess}</Text>
                <Text style={[styles.attemptWrong, { color: colors.destructive }]}>✗</Text>
              </View>
            ))}
          </View>
        )}

        {/* AI Feedback */}
        {feedbackMessage && !isComplete && (
          <View
            style={[
              styles.feedbackCard,
              {
                backgroundColor: hexToRgba('#3b82f6', 0.1),
                borderColor: hexToRgba('#3b82f6', 0.3),
              },
            ]}
          >
            <Text style={[styles.feedbackText, { color: '#93c5fd' }]}>{feedbackMessage}</Text>
          </View>
        )}

        {/* Input */}
        {!isComplete && (
          <View style={styles.inputSection}>
            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: colors.secondary,
                  color: colors.foreground,
                  borderColor: colors.border,
                },
              ]}
              value={guess}
              onChangeText={setGuess}
              placeholder="Enter your guess..."
              placeholderTextColor={colors.mutedForeground}
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="send"
              onSubmitEditing={handleSubmit}
              editable={!submitting}
            />
            <Pressable
              style={[
                styles.submitButton,
                {
                  backgroundColor: colors.accent,
                  ...Platform.select({
                    ios: {
                      shadowColor: colors.accent,
                      shadowOffset: { width: 0, height: 2 },
                      shadowOpacity: 0.3,
                      shadowRadius: 4,
                    },
                    android: {
                      elevation: 3,
                    },
                  }),
                },
                (!guess.trim() || submitting) && styles.submitButtonDisabled,
              ]}
              onPress={handleSubmit}
              disabled={!guess.trim() || submitting}
            >
              {submitting ? (
                <ActivityIndicator color={colors.accentForeground} />
              ) : (
                <Text style={[styles.submitButtonText, { color: colors.accentForeground }]}>
                  Submit
                </Text>
              )}
            </Pressable>
          </View>
        )}

        {/* Result - Won */}
        {isComplete && isCorrect && (
          <View
            style={[
              styles.resultCard,
              styles.resultCardWin,
              {
                backgroundColor: hexToRgba(colors.success, 0.1),
                borderColor: hexToRgba(colors.success, 0.3),
              },
            ]}
          >
            <Text style={styles.resultEmoji}>🎉</Text>
            <Text style={[styles.resultTitle, { color: colors.foreground }]}>Congratulations!</Text>
            <Text style={[styles.resultText, { color: colors.mutedForeground }]}>
              You solved it in {attempts} attempt{attempts > 1 ? 's' : ''}!
            </Text>
            <View style={styles.resultStats}>
              <View style={styles.resultStatItem}>
                <Text style={[styles.resultStatLabel, { color: colors.mutedForeground }]}>Time</Text>
                <Timer seconds={elapsedTime} size="medium" showIcon={false} />
              </View>
              {score !== null && (
                <View style={styles.resultStatItem}>
                  <Text style={[styles.resultStatLabel, { color: colors.mutedForeground }]}>Score</Text>
                  <Text style={[styles.scoreValue, { color: colors.accent }]}>{score}</Text>
                </View>
              )}
            </View>
            <Pressable
              style={[
                styles.shareButton,
                {
                  backgroundColor: hexToRgba(colors.accent, 0.15),
                  borderColor: hexToRgba(colors.accent, 0.3),
                },
              ]}
              onPress={handleShare}
            >
              <Text style={[styles.shareButtonText, { color: colors.accent }]}>Share Result</Text>
            </Pressable>
          </View>
        )}

        {/* Result - Lost */}
        {isComplete && !isCorrect && (
          <View
            style={[
              styles.resultCard,
              styles.resultCardLoss,
              { backgroundColor: colors.secondary },
            ]}
          >
            <Text style={styles.resultEmoji}>😔</Text>
            <Text style={[styles.resultTitle, { color: colors.foreground }]}>
              Better luck tomorrow!
            </Text>
            <Text style={[styles.resultText, { color: colors.mutedForeground }]}>
              The answer was:
            </Text>
            <Text style={[styles.answerReveal, { color: colors.accent }]}>{puzzle.answer}</Text>
            {puzzle.explanation && (
              <Text style={[styles.explanationText, { color: colors.mutedForeground }]}>
                {puzzle.explanation}
              </Text>
            )}
            <Pressable
              style={[
                styles.shareButton,
                {
                  backgroundColor: hexToRgba(colors.accent, 0.15),
                  borderColor: hexToRgba(colors.accent, 0.3),
                },
              ]}
              onPress={handleShare}
            >
              <Text style={[styles.shareButtonText, { color: colors.accent }]}>Share</Text>
            </Pressable>
          </View>
        )}
      </ScrollView>

      {/* Achievement Modal */}
      <AchievementUnlockedModal
        achievements={newlyUnlocked}
        totalPoints={newlyUnlockedPoints}
        visible={showAchievementModal}
        onDismiss={handleDismissAchievements}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 16,
    paddingBottom: 32,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  errorEmoji: {
    fontSize: 48,
    marginBottom: 16,
  },
  errorTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  errorText: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 24,
  },
  retryButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
  },
  retryButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  puzzleCard: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
  },
  puzzleHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  puzzleLabel: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  puzzleClue: {
    fontSize: 22,
    fontWeight: '600',
    lineHeight: 30,
  },
  puzzleTypeBadge: {
    marginTop: 12,
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  puzzleTypeText: {
    fontSize: 11,
    fontWeight: '500',
    textTransform: 'capitalize',
  },
  attemptsVisual: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 16,
  },
  attemptDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  headerBadges: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  attemptsSection: {
    marginBottom: 16,
  },
  attemptsTitle: {
    fontSize: 14,
    marginBottom: 12,
  },
  attemptRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  attemptText: {
    fontSize: 16,
  },
  attemptWrong: {
    fontSize: 18,
  },
  feedbackCard: {
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
  },
  feedbackText: {
    fontSize: 14,
    lineHeight: 20,
  },
  inputSection: {
    gap: 12,
  },
  input: {
    borderRadius: 12,
    padding: 16,
    fontSize: 18,
    borderWidth: 2,
  },
  submitButton: {
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  submitButtonDisabled: {
    opacity: 0.5,
  },
  submitButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  resultCard: {
    borderRadius: 16,
    padding: 28,
    alignItems: 'center',
    marginTop: 16,
  },
  resultCardWin: {
    borderWidth: 1,
  },
  resultCardLoss: {},
  resultEmoji: {
    fontSize: 48,
    marginBottom: 16,
  },
  resultTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  resultText: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 16,
  },
  resultStats: {
    flexDirection: 'row',
    gap: 32,
    marginBottom: 20,
  },
  resultStatItem: {
    alignItems: 'center',
  },
  resultStatLabel: {
    fontSize: 12,
    marginBottom: 4,
  },
  scoreValue: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  answerReveal: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  explanationText: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 16,
  },
  shareButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
  },
  shareButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
});
