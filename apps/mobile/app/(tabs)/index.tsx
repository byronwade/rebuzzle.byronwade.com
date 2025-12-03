/**
 * Game Screen
 * Daily puzzle gameplay with redesigned UI matching desktop/web
 */

import { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ActivityIndicator,
  ScrollView,
  Share,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeIn, FadeInDown, FadeOut } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { RefreshCw } from 'lucide-react-native';
import { useGame } from '../../src/contexts/GameContext';
import { useAchievements } from '../../src/contexts/AchievementsContext';
import { useOffline } from '../../src/contexts/OfflineContext';
import { useAuth } from '../../src/contexts/AuthContext';
import { useTheme } from '../../src/contexts/ThemeContext';
import { OfflineIndicator } from '../../src/components/OfflineIndicator';
import { AchievementUnlockedModal } from '../../src/components/AchievementUnlockedModal';
import { Button } from '../../src/components/ui/Button';
import { hexToRgba } from '../../src/lib/theme';

// New game components
import {
  GameHeader,
  PersonalizedGreeting,
  PuzzleCard,
  GuessHistory,
  AnswerInput,
  ScoreBreakdown,
  CountdownTimer,
} from '../../src/components/game';

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
  const { user } = useAuth();
  const { theme, isDark } = useTheme();
  const colors = theme.colors;

  const [guess, setGuess] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [showAchievementModal, setShowAchievementModal] = useState(false);
  const [showShake, setShowShake] = useState(false);
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
        // Trigger shake animation
        setShowShake(true);

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

  const handleShakeComplete = useCallback(() => {
    setShowShake(false);
  }, []);

  const handleShare = async () => {
    if (!puzzle || !isComplete) return;

    const attemptsText = isCorrect
      ? `Solved in ${attempts} attempt${attempts > 1 ? 's' : ''}!`
      : 'Better luck next time!';

    const scoreText = isCorrect && score ? `Score: ${score}` : '';

    const message = `Rebuzzle Daily Puzzle\n${attemptsText}\n${scoreText}\n\nPlay at rebuzzle.byronwade.com`;

    try {
      await Share.share({ message });
    } catch (err) {
      console.error('Share failed:', err);
    }
  };

  const handleDismissAchievements = () => {
    setShowAchievementModal(false);
    dismissNewAchievements();
  };

  // Get next puzzle date (midnight tomorrow)
  const getNextPuzzleDate = (): Date => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    return tomorrow;
  };

  // Convert guesses to format expected by GuessHistory
  const formattedGuesses = guesses.map((g, i) => ({
    id: `guess-${i}`,
    text: g,
    isCorrect: isCorrect && i === guesses.length - 1,
  }));

  // Get difficulty from puzzle or default
  const difficulty = (puzzle?.difficulty as 'easy' | 'medium' | 'hard' | 'expert') || 'medium';

  // Get current hint
  const currentHint = availableHints.length > 0 && currentHintIndex > 0
    ? availableHints[currentHintIndex - 1]
    : undefined;

  // Loading state
  if (isLoading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['bottom']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.mutedForeground }]}>
            Loading today's puzzle...
          </Text>
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
          <Button
            variant="outline"
            onPress={loadTodayPuzzle}
            icon={<RefreshCw size={16} color={colors.foreground} />}
          >
            Try Again
          </Button>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['bottom']}>
      {/* Offline Indicator */}
      {(isOffline || !isOnline) && <OfflineIndicator />}

      <KeyboardAvoidingView
        style={styles.keyboardAvoid}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Personalized Greeting */}
          <PersonalizedGreeting
            username={user?.user_metadata?.display_name || user?.email?.split('@')[0]}
            streak={user?.user_metadata?.streak || 0}
          />

          {/* Game Header - Difficulty, Timer, Attempts */}
          {!isComplete && (
            <Animated.View entering={FadeIn.duration(300)}>
              <GameHeader
                difficulty={difficulty}
                timeElapsed={elapsedTime}
                attemptsRemaining={maxAttempts - attempts}
                maxAttempts={maxAttempts}
                isPlaying={!isComplete}
              />
            </Animated.View>
          )}

          {/* Puzzle Card */}
          <Animated.View entering={FadeInDown.delay(100).duration(300)}>
            <PuzzleCard
              puzzleContent={puzzle.puzzle}
              puzzleType={puzzle.puzzleType || 'rebus'}
              hint={currentHint}
              solvedCount={puzzle.solvedCount}
              category={puzzle.category}
            />
          </Animated.View>

          {/* Hint Button (when hints are available but not shown yet) */}
          {!isComplete && availableHints.length > 0 && canShowHint && currentHintIndex < availableHints.length && (
            <Animated.View entering={FadeIn.delay(200)} style={styles.hintButtonContainer}>
              <Button
                variant="outline"
                size="sm"
                onPress={showNextHint}
              >
                {currentHintIndex === 0 ? 'Show Hint' : 'Show Next Hint'}
              </Button>
            </Animated.View>
          )}

          {/* AI Feedback */}
          {feedbackMessage && !isComplete && (
            <Animated.View
              entering={FadeIn.duration(200)}
              style={[
                styles.feedbackCard,
                {
                  backgroundColor: hexToRgba(colors.primary, 0.1),
                  borderColor: hexToRgba(colors.primary, 0.3),
                },
              ]}
            >
              <Text style={[styles.feedbackText, { color: colors.primary }]}>{feedbackMessage}</Text>
            </Animated.View>
          )}

          {/* Previous Guesses */}
          {!isComplete && formattedGuesses.length > 0 && (
            <GuessHistory guesses={formattedGuesses} />
          )}

          {/* Result - Won */}
          {isComplete && isCorrect && (
            <Animated.View entering={FadeIn.delay(200).duration(400)}>
              <View style={styles.successHeader}>
                <Text style={styles.successEmoji}>🎉</Text>
                <Text style={[styles.successTitle, { color: colors.foreground }]}>
                  Congratulations!
                </Text>
                <Text style={[styles.successSubtitle, { color: colors.mutedForeground }]}>
                  You solved today's puzzle
                </Text>
              </View>

              {score !== null && (
                <ScoreBreakdown
                  baseScore={100}
                  timeBonus={Math.max(0, 50 - Math.floor(elapsedTime / 60) * 10)}
                  streakBonus={user?.user_metadata?.streak ? user.user_metadata.streak * 5 : 0}
                  difficultyMultiplier={difficulty === 'easy' ? 1 : difficulty === 'medium' ? 1.5 : difficulty === 'hard' ? 2 : 2.5}
                  totalScore={score}
                  timeElapsed={elapsedTime}
                  attemptsUsed={attempts}
                  maxAttempts={maxAttempts}
                  isPersonalBest={false}
                />
              )}

              <CountdownTimer
                targetDate={getNextPuzzleDate()}
                label="Next puzzle in"
              />

              <Button variant="default" onPress={handleShare} style={styles.shareButton}>
                Share Result
              </Button>
            </Animated.View>
          )}

          {/* Result - Lost */}
          {isComplete && !isCorrect && (
            <Animated.View
              entering={FadeIn.delay(200).duration(400)}
              style={[
                styles.lossCard,
                {
                  backgroundColor: colors.card,
                  borderColor: colors.border,
                },
              ]}
            >
              <Text style={styles.lossEmoji}>😔</Text>
              <Text style={[styles.lossTitle, { color: colors.foreground }]}>
                Better luck tomorrow!
              </Text>
              <Text style={[styles.lossText, { color: colors.mutedForeground }]}>
                The answer was:
              </Text>
              <Text style={[styles.answerReveal, { color: colors.primary }]}>{puzzle.answer}</Text>
              {puzzle.explanation && (
                <Text style={[styles.explanationText, { color: colors.mutedForeground }]}>
                  {puzzle.explanation}
                </Text>
              )}

              <CountdownTimer
                targetDate={getNextPuzzleDate()}
                label="Next puzzle in"
              />

              <Button variant="outline" onPress={handleShare} style={styles.shareButton}>
                Share
              </Button>
            </Animated.View>
          )}
        </ScrollView>

        {/* Answer Input - Fixed at bottom when game is active */}
        {!isComplete && (
          <Animated.View
            entering={FadeIn.delay(300)}
            style={[styles.inputWrapper, { borderTopColor: colors.border }]}
          >
            <AnswerInput
              value={guess}
              onChangeText={setGuess}
              onSubmit={handleSubmit}
              disabled={submitting}
              showShake={showShake}
              onShakeComplete={handleShakeComplete}
              helperText={`${maxAttempts - attempts} attempts remaining`}
            />
          </Animated.View>
        )}
      </KeyboardAvoidingView>

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
  keyboardAvoid: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 16,
    paddingBottom: 24,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  loadingText: {
    fontSize: 15,
    fontWeight: '500',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    gap: 12,
  },
  errorEmoji: {
    fontSize: 56,
    marginBottom: 8,
  },
  errorTitle: {
    fontSize: 24,
    fontWeight: '700',
  },
  errorText: {
    fontSize: 15,
    textAlign: 'center',
    marginBottom: 8,
  },
  hintButtonContainer: {
    alignItems: 'center',
    marginBottom: 16,
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
    textAlign: 'center',
  },
  inputWrapper: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 16,
    borderTopWidth: 1,
  },
  successHeader: {
    alignItems: 'center',
    marginBottom: 20,
  },
  successEmoji: {
    fontSize: 64,
    marginBottom: 12,
  },
  successTitle: {
    fontSize: 28,
    fontWeight: '800',
  },
  successSubtitle: {
    fontSize: 16,
    marginTop: 4,
  },
  lossCard: {
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.08,
        shadowRadius: 12,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  lossEmoji: {
    fontSize: 56,
    marginBottom: 16,
  },
  lossTitle: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 8,
  },
  lossText: {
    fontSize: 15,
    marginBottom: 8,
  },
  answerReveal: {
    fontSize: 24,
    fontWeight: '800',
    marginBottom: 12,
  },
  explanationText: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
  },
  shareButton: {
    alignSelf: 'center',
    minWidth: 140,
  },
});
