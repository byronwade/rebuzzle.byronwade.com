/**
 * Signup Screen
 * Redesigned registration form with animations and consistent styling
 */

import { useState, useRef } from 'react';
import {
  StyleSheet,
  Text,
  TextInput,
  View,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, Link, Stack } from 'expo-router';
import Animated, { FadeIn, FadeInDown, FadeInUp } from 'react-native-reanimated';
import { User, Mail, Lock, UserPlus, LogIn, Check, X } from 'lucide-react-native';
import { useAuth } from '../src/contexts/AuthContext';
import { useTheme } from '../src/contexts/ThemeContext';
import { hexToRgba } from '../src/lib/theme';
import { Button } from '../src/components/ui/Button';

export default function SignupScreen() {
  const router = useRouter();
  const { signUp } = useAuth();
  const { theme } = useTheme();
  const colors = theme.colors;

  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const emailRef = useRef<TextInput>(null);
  const passwordRef = useRef<TextInput>(null);
  const confirmRef = useRef<TextInput>(null);

  // Password validation
  const passwordChecks = {
    length: password.length >= 6,
    match: password === confirmPassword && confirmPassword.length > 0,
  };

  const validateForm = (): string | null => {
    if (!username.trim()) {
      return 'Username is required';
    }
    if (username.trim().length < 3) {
      return 'Username must be at least 3 characters';
    }
    if (!email.trim()) {
      return 'Email is required';
    }
    if (!email.includes('@') || !email.includes('.')) {
      return 'Please enter a valid email';
    }
    if (!password) {
      return 'Password is required';
    }
    if (password.length < 6) {
      return 'Password must be at least 6 characters';
    }
    if (password !== confirmPassword) {
      return 'Passwords do not match';
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
        router.replace('/');
      } else {
        setError(result.error || 'Signup failed');
      }
    } catch {
      setError('Signup failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['bottom']}>
      <Stack.Screen
        options={{
          title: 'Sign Up',
          headerShown: false,
        }}
      />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.content}>
            {/* Logo/Brand Section */}
            <Animated.View entering={FadeIn.delay(100).duration(400)} style={styles.brandSection}>
              <View style={[styles.logoContainer, { backgroundColor: colors.primary }]}>
                <Text style={styles.logoText}>R</Text>
              </View>
              <Text style={[styles.brandName, { color: colors.foreground }]}>Rebuzzle</Text>
            </Animated.View>

            {/* Header */}
            <Animated.View entering={FadeInDown.delay(200).duration(400)} style={styles.header}>
              <Text style={[styles.title, { color: colors.foreground }]}>Create Account</Text>
              <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
                Join Rebuzzle and start solving daily puzzles
              </Text>
            </Animated.View>

            {/* Form Card */}
            <Animated.View
              entering={FadeInDown.delay(300).duration(400)}
              style={[styles.form, { backgroundColor: colors.card, borderColor: colors.border }]}
            >
              {/* Username Input */}
              <View style={styles.inputGroup}>
                <Text style={[styles.label, { color: colors.foreground }]}>Username</Text>
                <View
                  style={[
                    styles.inputContainer,
                    {
                      backgroundColor: colors.secondary,
                      borderColor: colors.border,
                    },
                  ]}
                >
                  <User size={18} color={colors.mutedForeground} strokeWidth={2} />
                  <TextInput
                    style={[styles.input, { color: colors.foreground }]}
                    value={username}
                    onChangeText={setUsername}
                    placeholder="Choose a username"
                    placeholderTextColor={colors.mutedForeground}
                    autoCapitalize="none"
                    autoCorrect={false}
                    textContentType="username"
                    autoComplete="username"
                    editable={!isLoading}
                    returnKeyType="next"
                    onSubmitEditing={() => emailRef.current?.focus()}
                  />
                </View>
              </View>

              {/* Email Input */}
              <View style={styles.inputGroup}>
                <Text style={[styles.label, { color: colors.foreground }]}>Email</Text>
                <View
                  style={[
                    styles.inputContainer,
                    {
                      backgroundColor: colors.secondary,
                      borderColor: colors.border,
                    },
                  ]}
                >
                  <Mail size={18} color={colors.mutedForeground} strokeWidth={2} />
                  <TextInput
                    ref={emailRef}
                    style={[styles.input, { color: colors.foreground }]}
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
                    returnKeyType="next"
                    onSubmitEditing={() => passwordRef.current?.focus()}
                  />
                </View>
              </View>

              {/* Password Input */}
              <View style={styles.inputGroup}>
                <Text style={[styles.label, { color: colors.foreground }]}>Password</Text>
                <View
                  style={[
                    styles.inputContainer,
                    {
                      backgroundColor: colors.secondary,
                      borderColor: colors.border,
                    },
                  ]}
                >
                  <Lock size={18} color={colors.mutedForeground} strokeWidth={2} />
                  <TextInput
                    ref={passwordRef}
                    style={[styles.input, { color: colors.foreground }]}
                    value={password}
                    onChangeText={setPassword}
                    placeholder="At least 6 characters"
                    placeholderTextColor={colors.mutedForeground}
                    secureTextEntry
                    textContentType="newPassword"
                    autoComplete="password-new"
                    editable={!isLoading}
                    returnKeyType="next"
                    onSubmitEditing={() => confirmRef.current?.focus()}
                  />
                </View>
              </View>

              {/* Confirm Password Input */}
              <View style={styles.inputGroup}>
                <Text style={[styles.label, { color: colors.foreground }]}>Confirm Password</Text>
                <View
                  style={[
                    styles.inputContainer,
                    {
                      backgroundColor: colors.secondary,
                      borderColor: colors.border,
                    },
                  ]}
                >
                  <Lock size={18} color={colors.mutedForeground} strokeWidth={2} />
                  <TextInput
                    ref={confirmRef}
                    style={[styles.input, { color: colors.foreground }]}
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    placeholder="Confirm your password"
                    placeholderTextColor={colors.mutedForeground}
                    secureTextEntry
                    textContentType="newPassword"
                    editable={!isLoading}
                    returnKeyType="done"
                    onSubmitEditing={handleSignup}
                  />
                </View>
              </View>

              {/* Password Requirements */}
              {password.length > 0 && (
                <Animated.View entering={FadeIn.duration(200)} style={styles.requirements}>
                  <View style={styles.requirementRow}>
                    {passwordChecks.length ? (
                      <Check size={14} color="#22c55e" strokeWidth={2.5} />
                    ) : (
                      <X size={14} color={colors.mutedForeground} strokeWidth={2} />
                    )}
                    <Text
                      style={[
                        styles.requirementText,
                        { color: passwordChecks.length ? '#22c55e' : colors.mutedForeground },
                      ]}
                    >
                      At least 6 characters
                    </Text>
                  </View>
                  {confirmPassword.length > 0 && (
                    <View style={styles.requirementRow}>
                      {passwordChecks.match ? (
                        <Check size={14} color="#22c55e" strokeWidth={2.5} />
                      ) : (
                        <X size={14} color={colors.destructive} strokeWidth={2} />
                      )}
                      <Text
                        style={[
                          styles.requirementText,
                          { color: passwordChecks.match ? '#22c55e' : colors.destructive },
                        ]}
                      >
                        Passwords match
                      </Text>
                    </View>
                  )}
                </Animated.View>
              )}

              {/* Error Message */}
              {error && (
                <Animated.View
                  entering={FadeIn.duration(200)}
                  style={[
                    styles.errorContainer,
                    {
                      backgroundColor: hexToRgba(colors.destructive, 0.1),
                      borderColor: hexToRgba(colors.destructive, 0.3),
                    },
                  ]}
                >
                  <Text style={[styles.errorText, { color: colors.destructive }]}>{error}</Text>
                </Animated.View>
              )}

              {/* Create Account Button */}
              <Button
                variant="default"
                size="lg"
                onPress={handleSignup}
                loading={isLoading}
                disabled={isLoading}
                icon={<UserPlus size={18} color={colors.primaryForeground} strokeWidth={2} />}
                style={styles.mainButton}
              >
                Create Account
              </Button>
            </Animated.View>

            {/* Sign In Link */}
            <Animated.View entering={FadeInUp.delay(400).duration(400)} style={styles.footer}>
              <Text style={[styles.footerText, { color: colors.mutedForeground }]}>
                Already have an account?
              </Text>
              <Link href="/login" asChild>
                <Pressable disabled={isLoading} style={styles.linkButton}>
                  <LogIn size={14} color={colors.primary} strokeWidth={2} />
                  <Text style={[styles.linkText, { color: colors.primary }]}>Sign in</Text>
                </Pressable>
              </Link>
            </Animated.View>

            {/* Terms Notice */}
            <Animated.View entering={FadeIn.delay(500).duration(400)} style={styles.termsContainer}>
              <Text style={[styles.termsText, { color: colors.mutedForeground }]}>
                By creating an account, you agree to our Terms of Service and Privacy Policy
              </Text>
            </Animated.View>
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
    justifyContent: 'center',
  },
  brandSection: {
    alignItems: 'center',
    marginBottom: 24,
  },
  logoContainer: {
    width: 64,
    height: 64,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  logoText: {
    fontSize: 32,
    fontWeight: '800',
    color: '#ffffff',
  },
  brandName: {
    fontSize: 24,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  header: {
    marginBottom: 24,
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
  },
  form: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    gap: 10,
  },
  input: {
    flex: 1,
    fontSize: 16,
    paddingVertical: 14,
  },
  requirements: {
    marginBottom: 16,
    gap: 6,
  },
  requirementRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  requirementText: {
    fontSize: 13,
    fontWeight: '500',
  },
  errorContainer: {
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
  },
  errorText: {
    fontSize: 14,
    textAlign: 'center',
    fontWeight: '500',
  },
  mainButton: {
    height: 48,
    borderRadius: 12,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  footerText: {
    fontSize: 14,
  },
  linkButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  linkText: {
    fontSize: 14,
    fontWeight: '600',
  },
  termsContainer: {
    paddingHorizontal: 16,
  },
  termsText: {
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 18,
  },
});
