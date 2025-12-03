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
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter, Link } from "expo-router";
import { useAuth } from "../src/contexts/AuthContext";
import { useTheme } from "../src/contexts/ThemeContext";
import { hexToRgba } from "../src/lib/theme";

export default function LoginScreen() {
  const router = useRouter();
  const { login, continueAsGuest } = useAuth();
  const { theme } = useTheme();
  const colors = theme.colors;

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async () => {
    if (!email.trim() || !password) {
      setError("Please enter your email and password");
      return;
    }

    setError(null);
    setIsLoading(true);

    try {
      const result = await login(email.trim(), password);

      if (result.success) {
        router.replace("/");
      } else {
        setError(result.error || "Invalid email or password");
      }
    } catch {
      setError("Login failed. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleGuest = async () => {
    setIsLoading(true);
    try {
      const result = await continueAsGuest();
      if (result.success) {
        router.replace("/");
      } else {
        setError(result.error || "Failed to continue as guest");
      }
    } catch {
      setError("Failed to continue as guest");
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
        <View style={styles.content}>
          <View style={styles.header}>
            <Text style={[styles.title, { color: colors.foreground }]}>Welcome Back</Text>
            <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
              Sign in to track your progress
            </Text>
          </View>

          <View style={[styles.form, { backgroundColor: colors.card, borderColor: colors.border }]}>
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
                placeholder="Enter your password"
                placeholderTextColor={colors.mutedForeground}
                secureTextEntry
                textContentType="password"
                autoComplete="password"
                editable={!isLoading}
                onSubmitEditing={handleLogin}
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
              onPress={handleLogin}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color={colors.accentForeground} />
              ) : (
                <Text style={[styles.buttonText, { color: colors.accentForeground }]}>Sign In</Text>
              )}
            </Pressable>
          </View>

          <View style={styles.footer}>
            <Text style={[styles.footerText, { color: colors.mutedForeground }]}>
              Don't have an account?
            </Text>
            <Link href="/signup" asChild>
              <Pressable disabled={isLoading}>
                <Text style={[styles.linkText, { color: colors.accent }]}>Sign up</Text>
              </Pressable>
            </Link>
          </View>

          <View style={styles.divider}>
            <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
            <Text style={[styles.dividerText, { color: colors.mutedForeground }]}>or</Text>
            <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
          </View>

          <Pressable
            style={[
              styles.ghostButton,
              { borderColor: colors.border },
              isLoading && styles.buttonDisabled,
            ]}
            onPress={handleGuest}
            disabled={isLoading}
          >
            <Text style={[styles.ghostButtonText, { color: colors.mutedForeground }]}>
              Continue as Guest
            </Text>
          </Pressable>
        </View>
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
    marginBottom: 24,
  },
  footerText: {
    fontSize: 14,
  },
  linkText: {
    fontSize: 14,
    fontWeight: "600",
  },
  divider: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 24,
  },
  dividerLine: {
    flex: 1,
    height: 1,
  },
  dividerText: {
    fontSize: 14,
    marginHorizontal: 16,
  },
  ghostButton: {
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
    borderWidth: 1,
  },
  ghostButtonText: {
    fontSize: 16,
    fontWeight: "600",
  },
});
