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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { useGame } from '../src/contexts/GameContext';
import { useAchievements } from '../src/contexts/AchievementsContext';
import { useOffline } from '../src/contexts/OfflineContext';
import { Timer } from '../src/components/Timer';
import { HintCard } from '../src/components/HintCard';
import { OfflineIndicator } from '../src/components/OfflineIndicator';
import { AchievementUnlockedModal } from '../src/components/AchievementUnlockedModal';

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
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#facc15" />
          <Text style={styles.loadingText}>Loading puzzle...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // Error state
  if (error || !puzzle) {
    return (
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorEmoji}>😕</Text>
          <Text style={styles.errorTitle}>Oops!</Text>
          <Text style={styles.errorText}>{error || 'Failed to load puzzle'}</Text>
          <Pressable style={styles.retryButton} onPress={loadTodayPuzzle}>
            <Text style={styles.retryButtonText}>Try Again</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      {/* Offline Indicator */}
      {(isOffline || !isOnline) && <OfflineIndicator />}

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        {/* Puzzle Card */}
        <View style={styles.puzzleCard}>
          <View style={styles.puzzleHeader}>
            <Text style={styles.puzzleLabel}>Today's Puzzle</Text>
            {!isComplete && <Timer seconds={elapsedTime} size="small" />}
          </View>
          <Text style={styles.puzzleClue}>{puzzle.puzzle}</Text>
          {puzzle.puzzleType && (
            <View style={styles.puzzleTypeBadge}>
              <Text style={styles.puzzleTypeText}>{puzzle.puzzleType}</Text>
            </View>
          )}
        </View>

        {/* Hints Section */}
        {availableHints.length > 0 && (
          <HintCard
            hints={availableHints}
            currentIndex={currentHintIndex}
            onShowHint={showNextHint}
            canShowMore={canShowHint}
            isComplete={isComplete}
            style={styles.hintCard}
          />
        )}

        {/* Attempts Display */}
        <View style={styles.attemptsSection}>
          <Text style={styles.attemptsTitle}>
            Attempts: {attempts}/{maxAttempts}
          </Text>
          {guesses.map((attemptGuess, index) => (
            <View key={index} style={styles.attemptRow}>
              <Text style={styles.attemptText}>{attemptGuess}</Text>
              <Text style={styles.attemptWrong}>✗</Text>
            </View>
          ))}
        </View>

        {/* AI Feedback */}
        {feedbackMessage && !isComplete && (
          <View style={styles.feedbackCard}>
            <Text style={styles.feedbackText}>{feedbackMessage}</Text>
          </View>
        )}

        {/* Input */}
        {!isComplete && (
          <View style={styles.inputSection}>
            <TextInput
              style={styles.input}
              value={guess}
              onChangeText={setGuess}
              placeholder="Enter your guess..."
              placeholderTextColor="#64748b"
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="send"
              onSubmitEditing={handleSubmit}
              editable={!submitting}
            />
            <Pressable
              style={[
                styles.submitButton,
                (!guess.trim() || submitting) && styles.submitButtonDisabled,
              ]}
              onPress={handleSubmit}
              disabled={!guess.trim() || submitting}
            >
              {submitting ? (
                <ActivityIndicator color="#1a1a2e" />
              ) : (
                <Text style={styles.submitButtonText}>Submit</Text>
              )}
            </Pressable>
          </View>
        )}

        {/* Result - Won */}
        {isComplete && isCorrect && (
          <View style={[styles.resultCard, styles.resultCardWin]}>
            <Text style={styles.resultEmoji}>🎉</Text>
            <Text style={styles.resultTitle}>Congratulations!</Text>
            <Text style={styles.resultText}>
              You solved it in {attempts} attempt{attempts > 1 ? 's' : ''}!
            </Text>
            <View style={styles.resultStats}>
              <View style={styles.resultStatItem}>
                <Text style={styles.resultStatLabel}>Time</Text>
                <Timer seconds={elapsedTime} size="medium" showIcon={false} />
              </View>
              {score !== null && (
                <View style={styles.resultStatItem}>
                  <Text style={styles.resultStatLabel}>Score</Text>
                  <Text style={styles.scoreValue}>{score}</Text>
                </View>
              )}
            </View>
            <Pressable style={styles.shareButton} onPress={handleShare}>
              <Text style={styles.shareButtonText}>Share Result</Text>
            </Pressable>
          </View>
        )}

        {/* Result - Lost */}
        {isComplete && !isCorrect && (
          <View style={[styles.resultCard, styles.resultCardLoss]}>
            <Text style={styles.resultEmoji}>😔</Text>
            <Text style={styles.resultTitle}>Better luck tomorrow!</Text>
            <Text style={styles.resultText}>The answer was:</Text>
            <Text style={styles.answerReveal}>{puzzle.answer}</Text>
            {puzzle.explanation && (
              <Text style={styles.explanationText}>{puzzle.explanation}</Text>
            )}
            <Pressable style={styles.shareButton} onPress={handleShare}>
              <Text style={styles.shareButtonText}>Share</Text>
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
    backgroundColor: '#1a1a2e',
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
    color: '#94a3b8',
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
    color: '#fff',
    marginBottom: 8,
  },
  errorText: {
    fontSize: 14,
    color: '#94a3b8',
    textAlign: 'center',
    marginBottom: 24,
  },
  retryButton: {
    backgroundColor: 'rgba(250, 204, 21, 0.15)',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(250, 204, 21, 0.3)',
  },
  retryButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#facc15',
  },
  puzzleCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
  },
  puzzleHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  puzzleLabel: {
    fontSize: 12,
    color: '#facc15',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  puzzleClue: {
    fontSize: 22,
    color: '#fff',
    fontWeight: '600',
    lineHeight: 30,
  },
  puzzleTypeBadge: {
    marginTop: 12,
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(250, 204, 21, 0.15)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  puzzleTypeText: {
    fontSize: 11,
    color: '#facc15',
    fontWeight: '500',
    textTransform: 'capitalize',
  },
  hintCard: {
    marginBottom: 16,
  },
  attemptsSection: {
    marginBottom: 16,
  },
  attemptsTitle: {
    fontSize: 14,
    color: '#94a3b8',
    marginBottom: 12,
  },
  attemptRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  attemptText: {
    color: '#ef4444',
    fontSize: 16,
  },
  attemptWrong: {
    color: '#ef4444',
    fontSize: 18,
  },
  feedbackCard: {
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.3)',
  },
  feedbackText: {
    fontSize: 14,
    color: '#93c5fd',
    lineHeight: 20,
  },
  inputSection: {
    gap: 12,
  },
  input: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    padding: 16,
    fontSize: 18,
    color: '#fff',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  submitButton: {
    backgroundColor: '#facc15',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  submitButtonDisabled: {
    opacity: 0.5,
  },
  submitButtonText: {
    color: '#1a1a2e',
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
    backgroundColor: 'rgba(34, 197, 94, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(34, 197, 94, 0.3)',
  },
  resultCardLoss: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  resultEmoji: {
    fontSize: 48,
    marginBottom: 16,
  },
  resultTitle: {
    fontSize: 24,
    color: '#fff',
    fontWeight: 'bold',
    marginBottom: 8,
  },
  resultText: {
    fontSize: 16,
    color: '#94a3b8',
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
    color: '#64748b',
    marginBottom: 4,
  },
  scoreValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#facc15',
  },
  answerReveal: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#facc15',
    marginBottom: 12,
  },
  explanationText: {
    fontSize: 14,
    color: '#94a3b8',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 16,
  },
  shareButton: {
    backgroundColor: 'rgba(250, 204, 21, 0.15)',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(250, 204, 21, 0.3)',
  },
  shareButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#facc15',
  },
});
