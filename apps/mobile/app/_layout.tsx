/**
 * Root Layout
 * App-wide providers and navigation configuration
 */

import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, View, ActivityIndicator } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider, useAuth } from '../src/contexts/AuthContext';
import { GameProvider } from '../src/contexts/GameContext';
import { OfflineProvider } from '../src/contexts/OfflineContext';
import { AchievementsProvider } from '../src/contexts/AchievementsContext';

function AppContent() {
  const { isLoading } = useAuth();

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#facc15" />
      </View>
    );
  }

  return (
    <Stack
      screenOptions={{
        headerStyle: {
          backgroundColor: '#1a1a2e',
        },
        headerTintColor: '#fff',
        headerTitleStyle: {
          fontWeight: 'bold',
        },
        contentStyle: {
          backgroundColor: '#1a1a2e',
        },
      }}
    >
      <Stack.Screen
        name="index"
        options={{
          title: 'Rebuzzle',
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="game"
        options={{
          title: 'Daily Puzzle',
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
        name="profile"
        options={{
          title: 'Profile',
        }}
      />
      <Stack.Screen
        name="leaderboard"
        options={{
          title: 'Leaderboard',
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

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <OfflineProvider>
        <AuthProvider>
          <AchievementsProvider>
            <GameProvider>
              <View style={styles.container}>
                <StatusBar style="light" />
                <AppContent />
              </View>
            </GameProvider>
          </AchievementsProvider>
        </AuthProvider>
      </OfflineProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a2e',
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#1a1a2e',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
