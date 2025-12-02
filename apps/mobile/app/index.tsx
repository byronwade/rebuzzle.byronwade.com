import { Link } from "expo-router";
import { StyleSheet, Text, View, Pressable } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function HomeScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Rebuzzle</Text>
        <Text style={styles.subtitle}>The Daily Puzzle Challenge</Text>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Welcome!</Text>
          <Text style={styles.cardText}>
            Rebuzzle is a daily word puzzle game that challenges your creativity
            and lateral thinking.
          </Text>
        </View>

        <Link href="/game" asChild>
          <Pressable style={styles.button}>
            <Text style={styles.buttonText}>Play Today's Puzzle</Text>
          </Pressable>
        </Link>

        <View style={styles.features}>
          <FeatureItem emoji="🧩" text="Daily puzzles" />
          <FeatureItem emoji="🔥" text="Build streaks" />
          <FeatureItem emoji="🏆" text="Earn achievements" />
          <FeatureItem emoji="📊" text="Track progress" />
        </View>
      </View>

      <Text style={styles.footer}>© 2024 Rebuzzle</Text>
    </SafeAreaView>
  );
}

function FeatureItem({ emoji, text }: { emoji: string; text: string }) {
  return (
    <View style={styles.featureItem}>
      <Text style={styles.featureEmoji}>{emoji}</Text>
      <Text style={styles.featureText}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#1a1a2e",
  },
  content: {
    flex: 1,
    padding: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontSize: 48,
    fontWeight: "bold",
    color: "#facc15",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 18,
    color: "#94a3b8",
    marginBottom: 32,
  },
  card: {
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    borderRadius: 16,
    padding: 24,
    marginBottom: 32,
    width: "100%",
  },
  cardTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#fff",
    marginBottom: 12,
  },
  cardText: {
    fontSize: 16,
    color: "#cbd5e1",
    lineHeight: 24,
  },
  button: {
    backgroundColor: "#facc15",
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 30,
    marginBottom: 32,
  },
  buttonText: {
    color: "#1a1a2e",
    fontSize: 18,
    fontWeight: "bold",
  },
  features: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: 16,
  },
  featureItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  featureEmoji: {
    fontSize: 16,
    marginRight: 8,
  },
  featureText: {
    color: "#94a3b8",
    fontSize: 14,
  },
  footer: {
    color: "#64748b",
    fontSize: 12,
    textAlign: "center",
    padding: 16,
  },
});
