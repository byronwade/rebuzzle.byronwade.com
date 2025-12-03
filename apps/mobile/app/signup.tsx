import { useState } from "react";
import {
  StyleSheet,
  Text,
  TextInput,
  View,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter, Link } from "expo-router";
import { useAuth } from "../src/contexts/AuthContext";
import { useTheme } from "../src/contexts/ThemeContext";
import { hexToRgba } from "../src/lib/theme";

export default function SignupScreen() {
  const router = useRouter();
  const { signUp } = useAuth();
  const { theme } = useTheme();
  const colors = theme.colors;

  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const validateForm = (): string | null => {
    if (!username.trim()) {
      return "Username is required";
    }
    if (username.trim().length < 3) {
      return "Username must be at least 3 characters";
    }
    if (!email.trim()) {
      return "Email is required";
    }
    if (!email.includes("@") || !email.includes(".")) {
      return "Please enter a valid email";
    }
    if (!password) {
      return "Password is required";
    }
    if (password.length < 6) {
      return "Password must be at least 6 characters";
    }
    if (password !== confirmPassword) {
      return "Passwords do not match";
    }
    return null;
  };

  const handleSignup = async () => {
    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }

    setError(null);
    setIsLoading(true);

    try {
      const result = await signUp(username.trim(), email.trim(), password);

      if (result.success) {
        router.replace("/");
      } else {
        setError(result.error || "Signup failed");
      }
    } catch {
      setError("Signup failed. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={["bottom"]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.content}>
            <View style={styles.header}>
              <Text style={[styles.title, { color: colors.foreground }]}>Create Account</Text>
              <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
                Join Rebuzzle and start solving puzzles
              </Text>
            </View>

            <View style={[styles.form, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={styles.inputGroup}>
                <Text style={[styles.label, { color: colors.foreground }]}>Username</Text>
                <TextInput
                  style={[
                    styles.input,
                    {
                      backgroundColor: colors.secondary,
                      color: colors.foreground,
                      borderColor: colors.border,
                    },
                  ]}
                  value={username}
                  onChangeText={setUsername}
                  placeholder="Choose a username"
                  placeholderTextColor={colors.mutedForeground}
                  autoCapitalize="none"
                  autoCorrect={false}
                  textContentType="username"
                  autoComplete="username"
                  editable={!isLoading}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={[styles.label, { color: colors.foreground }]}>Email</Text>
                <TextInput
                  style={[
                    styles.input,
                    {
                      backgroundColor: colors.secondary,
                      color: colors.foreground,
                      borderColor: colors.border,
                    },
                  ]}
                  value={email}
                  onChangeText={setEmail}
                  placeholder="you@example.com"
                  placeholderTextColor={colors.mutedForeground}
                  autoCapitalize="none"
                  autoCorrect={false}
                  keyboardType="email-address"
                  textContentType="emailAddress"
                  autoComplete="email"
                  editable={!isLoading}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={[styles.label, { color: colors.foreground }]}>Password</Text>
                <TextInput
                  style={[
                    styles.input,
                    {
                      backgroundColor: colors.secondary,
                      color: colors.foreground,
                      borderColor: colors.border,
                    },
                  ]}
                  value={password}
                  onChangeText={setPassword}
                  placeholder="At least 6 characters"
                  placeholderTextColor={colors.mutedForeground}
                  secureTextEntry
                  textContentType="newPassword"
                  autoComplete="password-new"
                  editable={!isLoading}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={[styles.label, { color: colors.foreground }]}>Confirm Password</Text>
                <TextInput
                  style={[
                    styles.input,
                    {
                      backgroundColor: colors.secondary,
                      color: colors.foreground,
                      borderColor: colors.border,
                    },
                  ]}
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  placeholder="Confirm your password"
                  placeholderTextColor={colors.mutedForeground}
                  secureTextEntry
                  textContentType="newPassword"
                  editable={!isLoading}
                  onSubmitEditing={handleSignup}
                />
              </View>

              {error && (
                <View
                  style={[
                    styles.errorContainer,
                    {
                      backgroundColor: hexToRgba(colors.destructive, 0.1),
                      borderColor: hexToRgba(colors.destructive, 0.3),
                    },
                  ]}
                >
                  <Text style={[styles.errorText, { color: colors.destructive }]}>{error}</Text>
                </View>
              )}

              <Pressable
                style={[
                  styles.button,
                  { backgroundColor: colors.accent },
                  isLoading && styles.buttonDisabled,
                ]}
                onPress={handleSignup}
                disabled={isLoading}
              >
                {isLoading ? (
                  <ActivityIndicator color={colors.accentForeground} />
                ) : (
                  <Text style={[styles.buttonText, { color: colors.accentForeground }]}>
                    Create Account
                  </Text>
                )}
              </Pressable>
            </View>

            <View style={styles.footer}>
              <Text style={[styles.footerText, { color: colors.mutedForeground }]}>
                Already have an account?
              </Text>
              <Link href="/login" asChild>
                <Pressable disabled={isLoading}>
                  <Text style={[styles.linkText, { color: colors.accent }]}>Sign in</Text>
                </Pressable>
              </Link>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  content: {
    flex: 1,
    padding: 24,
    justifyContent: "center",
  },
  header: {
    marginBottom: 32,
    alignItems: "center",
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    textAlign: "center",
  },
  form: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    borderWidth: 1,
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 8,
  },
  input: {
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    borderWidth: 1,
  },
  errorContainer: {
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
  },
  errorText: {
    fontSize: 14,
    textAlign: "center",
  },
  button: {
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    fontSize: 18,
    fontWeight: "bold",
  },
  footer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
  },
  footerText: {
    fontSize: 14,
  },
  linkText: {
    fontSize: 14,
    fontWeight: "600",
  },
});
