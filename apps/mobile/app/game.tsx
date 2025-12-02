import { useState } from "react";
import {
  StyleSheet,
  Text,
  TextInput,
  View,
  Pressable,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";

// Example puzzle - in production this comes from the API
const SAMPLE_PUZZLE = {
  id: "sample-1",
  clue: "What has hands but can't clap?",
  answer: "clock",
  difficulty: 5,
};

export default function GameScreen() {
  const [guess, setGuess] = useState("");
  const [attempts, setAttempts] = useState<string[]>([]);
  const [solved, setSolved] = useState(false);
  const maxAttempts = 3;

  const handleSubmit = async () => {
    if (!guess.trim()) return;

    const normalizedGuess = guess.toLowerCase().trim();
    const normalizedAnswer = SAMPLE_PUZZLE.answer.toLowerCase().trim();

    if (normalizedGuess === normalizedAnswer) {
      // Correct!
      setSolved(true);
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert("Correct!", "You solved today's puzzle!", [{ text: "OK" }]);
    } else {
      // Wrong
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setAttempts([...attempts, guess]);

      if (attempts.length + 1 >= maxAttempts) {
        Alert.alert(
          "Game Over",
          `The answer was: ${SAMPLE_PUZZLE.answer}`,
          [{ text: "OK" }]
        );
      }
    }

    setGuess("");
  };

  const attemptsLeft = maxAttempts - attempts.length;
  const isGameOver = solved || attemptsLeft === 0;

  return (
    <SafeAreaView style={styles.container} edges={["bottom"]}>
      <View style={styles.content}>
        {/* Puzzle Card */}
        <View style={styles.puzzleCard}>
          <Text style={styles.puzzleLabel}>Today's Puzzle</Text>
          <Text style={styles.puzzleClue}>{SAMPLE_PUZZLE.clue}</Text>
        </View>

        {/* Attempts Display */}
        <View style={styles.attemptsSection}>
          <Text style={styles.attemptsTitle}>
            Attempts: {attempts.length}/{maxAttempts}
          </Text>
          {attempts.map((attempt, index) => (
            <View key={index} style={styles.attemptRow}>
              <Text style={styles.attemptText}>{attempt}</Text>
              <Text style={styles.attemptWrong}>✗</Text>
            </View>
          ))}
        </View>

        {/* Input */}
        {!isGameOver && (
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
            />
            <Pressable
              style={[
                styles.submitButton,
                !guess.trim() && styles.submitButtonDisabled,
              ]}
              onPress={handleSubmit}
              disabled={!guess.trim()}
            >
              <Text style={styles.submitButtonText}>Submit</Text>
            </Pressable>
          </View>
        )}

        {/* Result */}
        {solved && (
          <View style={styles.resultCard}>
            <Text style={styles.resultEmoji}>🎉</Text>
            <Text style={styles.resultTitle}>Congratulations!</Text>
            <Text style={styles.resultText}>
              You solved it in {attempts.length + 1} attempt
              {attempts.length > 0 ? "s" : ""}!
            </Text>
          </View>
        )}

        {isGameOver && !solved && (
          <View style={styles.resultCard}>
            <Text style={styles.resultEmoji}>😔</Text>
            <Text style={styles.resultTitle}>Better luck tomorrow!</Text>
            <Text style={styles.resultText}>
              The answer was: {SAMPLE_PUZZLE.answer}
            </Text>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#1a1a2e",
  },
  content: {
    flex: 1,
    padding: 16,
  },
  puzzleCard: {
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    borderRadius: 16,
    padding: 24,
    marginBottom: 24,
  },
  puzzleLabel: {
    fontSize: 12,
    color: "#facc15",
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 12,
  },
  puzzleClue: {
    fontSize: 24,
    color: "#fff",
    fontWeight: "600",
    lineHeight: 32,
  },
  attemptsSection: {
    marginBottom: 24,
  },
  attemptsTitle: {
    fontSize: 14,
    color: "#94a3b8",
    marginBottom: 12,
  },
  attemptRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "rgba(239, 68, 68, 0.1)",
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  attemptText: {
    color: "#ef4444",
    fontSize: 16,
  },
  attemptWrong: {
    color: "#ef4444",
    fontSize: 18,
  },
  inputSection: {
    gap: 12,
  },
  input: {
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    borderRadius: 12,
    padding: 16,
    fontSize: 18,
    color: "#fff",
    borderWidth: 2,
    borderColor: "transparent",
  },
  submitButton: {
    backgroundColor: "#facc15",
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
  },
  submitButtonDisabled: {
    opacity: 0.5,
  },
  submitButtonText: {
    color: "#1a1a2e",
    fontSize: 18,
    fontWeight: "bold",
  },
  resultCard: {
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    borderRadius: 16,
    padding: 32,
    alignItems: "center",
    marginTop: 24,
  },
  resultEmoji: {
    fontSize: 48,
    marginBottom: 16,
  },
  resultTitle: {
    fontSize: 24,
    color: "#fff",
    fontWeight: "bold",
    marginBottom: 8,
  },
  resultText: {
    fontSize: 16,
    color: "#94a3b8",
    textAlign: "center",
  },
});
