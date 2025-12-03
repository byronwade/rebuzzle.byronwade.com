/**
 * Root Layout
 * App-wide providers and navigation configuration with theme support
 */

import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, View, ActivityIndicator } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { AuthProvider, useAuth } from '../src/contexts/AuthContext';
import { GameProvider } from '../src/contexts/GameContext';
import { OfflineProvider } from '../src/contexts/OfflineContext';
import { AchievementsProvider } from '../src/contexts/AchievementsContext';
import { ThemeProvider, useTheme } from '../src/contexts/ThemeContext';
import { ToastProvider } from '../src/contexts/ToastContext';
import React from 'react';

function AppContent() {
  const { isLoading } = useAuth();
  const { theme, isDark } = useTheme();

  if (isLoading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: theme.colors.background }]}>
        <ActivityIndicator size="large" color={theme.colors.accent} />
      </View>
    );
  }

  return (
    <Stack
      screenOptions={{
        headerStyle: {
          backgroundColor: theme.colors.card,
        },
        headerTintColor: theme.colors.foreground,
        headerTitleStyle: {
          fontWeight: 'bold',
        },
        contentStyle: {
          backgroundColor: theme.colors.background,
        },
      }}
    >
      <Stack.Screen
        name="(tabs)"
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="login"
        options={{
          title: 'Sign In',
          presentation: 'modal',
        }}
      />
      <Stack.Screen
        name="signup"
        options={{
          title: 'Create Account',
          presentation: 'modal',
        }}
      />
      <Stack.Screen
        name="achievements"
        options={{
          title: 'Achievements',
        }}
      />
    </Stack>
  );
}

function ThemedApp() {
  const { theme, isDark } = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <AppContent />
    </View>
  );
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={styles.container}>
      <SafeAreaProvider>
        <ThemeProvider>
          <OfflineProvider>
            <AuthProvider>
              <AchievementsProvider>
                <GameProvider>
                  <ToastProvider>
                    <ThemedApp />
                  </ToastProvider>
                </GameProvider>
              </AchievementsProvider>
            </AuthProvider>
          </OfflineProvider>
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
