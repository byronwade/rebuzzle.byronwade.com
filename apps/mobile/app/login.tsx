/**
 * Login Screen
 * Redesigned authentication form with animations and consistent styling
 */

import { useState, useRef } from 'react';
import {
  StyleSheet,
  Text,
  TextInput,
  View,
  KeyboardAvoidingView,
  Platform,
  Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, Link, Stack } from 'expo-router';
import Animated, { FadeIn, FadeInDown, FadeInUp } from 'react-native-reanimated';
import { Mail, Lock, LogIn, UserPlus, Sparkles } from 'lucide-react-native';
import { useAuth } from '../src/contexts/AuthContext';
import { useTheme } from '../src/contexts/ThemeContext';
import { hexToRgba } from '../src/lib/theme';
import { Button } from '../src/components/ui/Button';

export default function LoginScreen() {
  const router = useRouter();
  const { login, continueAsGuest } = useAuth();
  const { theme } = useTheme();
  const colors = theme.colors;

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isGuestLoading, setIsGuestLoading] = useState(false);

  const passwordRef = useRef<TextInput>(null);

  const handleLogin = async () => {
    if (!email.trim() || !password) {
      setError('Please enter your email and password');
      return;
    }

    setError(null);
    setIsLoading(true);

    try {
      const result = await login(email.trim(), password);

      if (result.success) {
        router.replace('/');
      } else {
        setError(result.error || 'Invalid email or password');
      }
    } catch {
      setError('Login failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGuest = async () => {
    setIsGuestLoading(true);
    try {
      const result = await continueAsGuest();
      if (result.success) {
        router.replace('/');
      } else {
        setError(result.error || 'Failed to continue as guest');
      }
    } catch {
      setError('Failed to continue as guest');
    } finally {
      setIsGuestLoading(false);
    }
  };

  const anyLoading = isLoading || isGuestLoading;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['bottom']}>
      <Stack.Screen
        options={{
          title: 'Sign In',
          headerShown: false,
        }}
      />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
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
            <Text style={[styles.title, { color: colors.foreground }]}>Welcome Back</Text>
            <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
              Sign in to track your progress and compete on leaderboards
            </Text>
          </Animated.View>

          {/* Form Card */}
          <Animated.View
            entering={FadeInDown.delay(300).duration(400)}
            style={[styles.form, { backgroundColor: colors.card, borderColor: colors.border }]}
          >
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
                  editable={!anyLoading}
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
                  placeholder="Enter your password"
                  placeholderTextColor={colors.mutedForeground}
                  secureTextEntry
                  textContentType="password"
                  autoComplete="password"
                  editable={!anyLoading}
                  returnKeyType="done"
                  onSubmitEditing={handleLogin}
                />
              </View>
            </View>

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

            {/* Sign In Button */}
            <Button
              variant="default"
              size="lg"
              onPress={handleLogin}
              loading={isLoading}
              disabled={anyLoading}
              icon={<LogIn size={18} color={colors.primaryForeground} strokeWidth={2} />}
              style={styles.mainButton}
            >
              Sign In
            </Button>
          </Animated.View>

          {/* Sign Up Link */}
          <Animated.View entering={FadeInUp.delay(400).duration(400)} style={styles.footer}>
            <Text style={[styles.footerText, { color: colors.mutedForeground }]}>
              Don't have an account?
            </Text>
            <Link href="/signup" asChild>
              <Pressable disabled={anyLoading} style={styles.linkButton}>
                <UserPlus size={14} color={colors.primary} strokeWidth={2} />
                <Text style={[styles.linkText, { color: colors.primary }]}>Sign up</Text>
              </Pressable>
            </Link>
          </Animated.View>

          {/* Divider */}
          <Animated.View entering={FadeIn.delay(500).duration(400)} style={styles.divider}>
            <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
            <Text style={[styles.dividerText, { color: colors.mutedForeground }]}>or</Text>
            <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
          </Animated.View>

          {/* Guest Button */}
          <Animated.View entering={FadeInUp.delay(600).duration(400)}>
            <Button
              variant="outline"
              size="lg"
              onPress={handleGuest}
              loading={isGuestLoading}
              disabled={anyLoading}
              icon={<Sparkles size={18} color={colors.foreground} strokeWidth={2} />}
              style={styles.guestButton}
            >
              Continue as Guest
            </Button>
            <Text style={[styles.guestHint, { color: colors.mutedForeground }]}>
              Play without saving progress
            </Text>
          </Animated.View>
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
    marginBottom: 20,
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
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  dividerLine: {
    flex: 1,
    height: 1,
  },
  dividerText: {
    fontSize: 13,
    marginHorizontal: 16,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  guestButton: {
    height: 48,
    borderRadius: 12,
  },
  guestHint: {
    fontSize: 12,
    textAlign: 'center',
    marginTop: 8,
  },
});
