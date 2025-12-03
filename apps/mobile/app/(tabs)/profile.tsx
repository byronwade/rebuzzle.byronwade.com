/**
 * Profile Screen
 * Redesigned user profile with stats, achievements progress, and settings
 */

import { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  Pressable,
  ScrollView,
  TextInput,
  Modal,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, Link } from 'expo-router';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { Edit3, LogOut, ChevronRight, Award, UserPlus } from 'lucide-react-native';
import { useAuth } from '../../src/contexts/AuthContext';
import { useAchievements } from '../../src/contexts/AchievementsContext';
import { useTheme } from '../../src/contexts/ThemeContext';
import { AvatarCircle, AVATAR_COLORS } from '../../src/components/AvatarCircle';
import { Button } from '../../src/components/ui/Button';
import { api } from '../../src/lib/api';
import { hexToRgba } from '../../src/lib/theme';

// New profile components
import { LevelProgress, StatsGrid, PerformanceCard } from '../../src/components/profile';

export default function ProfileScreen() {
  const router = useRouter();
  const { isAuthenticated, user, stats, logout, refreshStats } = useAuth();
  const { progress } = useAchievements();
  const { theme, isDark } = useTheme();
  const colors = theme.colors;

  const [isEditing, setIsEditing] = useState(false);
  const [editUsername, setEditUsername] = useState('');
  const [editColorIndex, setEditColorIndex] = useState(0);
  const [editInitials, setEditInitials] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Initialize edit form when user changes
  useEffect(() => {
    if (user) {
      setEditUsername(user.username);
      setEditColorIndex(user.avatarColorIndex || 0);
      setEditInitials(user.avatarCustomInitials || '');
    }
  }, [user]);

  // Redirect if not authenticated
  useEffect(() => {
    if (!isAuthenticated) {
      router.replace('/login');
    }
  }, [isAuthenticated, router]);

  const handleLogout = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            await logout();
            router.replace('/');
          },
        },
      ]
    );
  };

  const handleSaveProfile = async () => {
    if (!editUsername.trim()) {
      setSaveError('Username is required');
      return;
    }

    setIsSaving(true);
    setSaveError(null);

    try {
      const result = await api.updateUserProfile({
        username: editUsername.trim(),
        avatarColorIndex: editColorIndex,
        avatarCustomInitials: editInitials.trim() || undefined,
      });

      if (result?.success) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        setIsEditing(false);
        await refreshStats();
      } else {
        setSaveError('Failed to update profile');
      }
    } catch (error) {
      setSaveError('Failed to update profile');
    } finally {
      setIsSaving(false);
    }
  };

  if (!user) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['bottom']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  const achievementPercentage = progress
    ? Math.round((progress.unlocked / progress.total) * 100)
    : 0;

  // Calculate level tier based on level
  const getTier = (level: number): 'bronze' | 'silver' | 'gold' | 'platinum' | 'diamond' => {
    if (level >= 50) return 'diamond';
    if (level >= 30) return 'platinum';
    if (level >= 20) return 'gold';
    if (level >= 10) return 'silver';
    return 'bronze';
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['bottom']}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Profile Header */}
        <Animated.View entering={FadeIn.duration(300)} style={styles.header}>
          <View
            style={[
              styles.avatarContainer,
              Platform.select({
                ios: {
                  shadowColor: colors.primary,
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: 0.2,
                  shadowRadius: 12,
                },
                android: {
                  elevation: 6,
                },
              }),
            ]}
          >
            <AvatarCircle
              username={user.username}
              customInitials={user.avatarCustomInitials}
              colorIndex={user.avatarColorIndex}
              size={88}
            />
          </View>
          <Text style={[styles.username, { color: colors.foreground }]}>
            {user.isGuest ? 'Guest' : user.username}
          </Text>
          <View style={styles.userMeta}>
            <Text style={[styles.levelBadge, { color: colors.primary }]}>
              Level {stats?.level || 1}
            </Text>
            <Text style={[styles.metaSeparator, { color: colors.mutedForeground }]}>•</Text>
            <Text style={[styles.email, { color: colors.mutedForeground }]}>{user.email}</Text>
          </View>
          {user.isGuest && (
            <View style={[styles.guestBadge, { backgroundColor: hexToRgba(colors.warning, 0.15) }]}>
              <Text style={[styles.guestBadgeText, { color: colors.warning }]}>Guest Account</Text>
            </View>
          )}
        </Animated.View>

        <View style={styles.content}>
          {/* Level Progress */}
          <Animated.View entering={FadeInDown.delay(100).duration(300)}>
            <LevelProgress
              level={stats?.level || 1}
              currentXP={stats?.xp || 0}
              requiredXP={stats?.nextLevelXP || 1000}
              tier={getTier(stats?.level || 1)}
            />
          </Animated.View>

          {/* Stats Grid */}
          <Animated.View entering={FadeInDown.delay(150).duration(300)}>
            <StatsGrid
              totalPoints={stats?.points || 0}
              currentStreak={stats?.streak || 0}
              puzzlesSolved={stats?.wins || 0}
              bestStreak={stats?.maxStreak || 0}
            />
          </Animated.View>

          {/* Performance Card */}
          <Animated.View entering={FadeInDown.delay(200).duration(300)}>
            <PerformanceCard
              perfectGames={stats?.perfectSolves || 0}
              fastestTime={stats?.fastestTime || 0}
              totalGames={stats?.totalGames || 0}
              winRate={stats?.totalGames ? Math.round((stats.wins / stats.totalGames) * 100) : 0}
              averageTime={stats?.averageTime}
            />
          </Animated.View>

          {/* Achievements Card */}
          <Animated.View entering={FadeInDown.delay(250).duration(300)}>
            <Link href="/achievements" asChild>
              <Pressable
                style={[
                  styles.achievementsCard,
                  { backgroundColor: colors.card, borderColor: colors.border },
                ]}
              >
                <View style={styles.achievementsHeader}>
                  <View style={[styles.achievementsIcon, { backgroundColor: hexToRgba(colors.primary, 0.12) }]}>
                    <Award size={20} color={colors.primary} strokeWidth={2} />
                  </View>
                  <View style={styles.achievementsInfo}>
                    <Text style={[styles.achievementsTitle, { color: colors.foreground }]}>
                      Achievements
                    </Text>
                    {progress && (
                      <Text style={[styles.achievementsSubtitle, { color: colors.mutedForeground }]}>
                        {progress.unlocked}/{progress.total} unlocked • {progress.earnedPoints.toLocaleString()} pts
                      </Text>
                    )}
                  </View>
                  <ChevronRight size={20} color={colors.mutedForeground} />
                </View>
                {progress && (
                  <View style={styles.achievementsProgress}>
                    <View style={[styles.progressTrack, { backgroundColor: hexToRgba(colors.foreground, 0.1) }]}>
                      <View
                        style={[
                          styles.progressFill,
                          { width: `${achievementPercentage}%`, backgroundColor: colors.primary },
                        ]}
                      />
                    </View>
                  </View>
                )}
              </Pressable>
            </Link>
          </Animated.View>

          {/* Actions */}
          <Animated.View entering={FadeInDown.delay(300).duration(300)} style={styles.actions}>
            {!user.isGuest && (
              <Button
                variant="outline"
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setIsEditing(true);
                }}
                icon={<Edit3 size={16} color={colors.foreground} />}
              >
                Edit Profile
              </Button>
            )}

            {user.isGuest && (
              <Link href="/signup" asChild>
                <Button
                  variant="default"
                  icon={<UserPlus size={16} color={colors.primaryForeground} />}
                >
                  Create Account
                </Button>
              </Link>
            )}

            <Button
              variant="ghost"
              onPress={handleLogout}
              icon={<LogOut size={16} color={colors.destructive} />}
              textStyle={{ color: colors.destructive }}
            >
              Logout
            </Button>
          </Animated.View>
        </View>
      </ScrollView>

      {/* Edit Profile Modal */}
      <Modal
        visible={isEditing}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setIsEditing(false)}
      >
        <SafeAreaView style={[styles.modalContainer, { backgroundColor: colors.background }]}>
          <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
            <Pressable onPress={() => setIsEditing(false)}>
              <Text style={[styles.modalCancel, { color: colors.mutedForeground }]}>Cancel</Text>
            </Pressable>
            <Text style={[styles.modalTitle, { color: colors.foreground }]}>Edit Profile</Text>
            <Pressable onPress={handleSaveProfile} disabled={isSaving}>
              {isSaving ? (
                <ActivityIndicator size="small" color={colors.primary} />
              ) : (
                <Text style={[styles.modalSave, { color: colors.primary }]}>Save</Text>
              )}
            </Pressable>
          </View>

          <ScrollView style={styles.modalContent}>
            {/* Avatar Preview */}
            <View style={styles.avatarPreview}>
              <AvatarCircle
                username={editUsername}
                customInitials={editInitials}
                colorIndex={editColorIndex}
                size={100}
              />
            </View>

            {/* Username */}
            <View style={styles.formGroup}>
              <Text style={[styles.formLabel, { color: colors.foreground }]}>Username</Text>
              <TextInput
                style={[
                  styles.formInput,
                  {
                    backgroundColor: colors.card,
                    color: colors.foreground,
                    borderColor: colors.border,
                  },
                ]}
                value={editUsername}
                onChangeText={setEditUsername}
                placeholder="Enter username"
                placeholderTextColor={colors.mutedForeground}
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>

            {/* Custom Initials */}
            <View style={styles.formGroup}>
              <Text style={[styles.formLabel, { color: colors.foreground }]}>Avatar Initials (optional)</Text>
              <TextInput
                style={[
                  styles.formInput,
                  {
                    backgroundColor: colors.card,
                    color: colors.foreground,
                    borderColor: colors.border,
                  },
                ]}
                value={editInitials}
                onChangeText={(text) => setEditInitials(text.slice(0, 2).toUpperCase())}
                placeholder="e.g. JD"
                placeholderTextColor={colors.mutedForeground}
                autoCapitalize="characters"
                maxLength={2}
              />
              <Text style={[styles.formHint, { color: colors.mutedForeground }]}>
                Leave empty to use username initials
              </Text>
            </View>

            {/* Color Picker */}
            <View style={styles.formGroup}>
              <Text style={[styles.formLabel, { color: colors.foreground }]}>Avatar Color</Text>
              <View style={styles.colorPicker}>
                {AVATAR_COLORS.map((color, index) => (
                  <Pressable
                    key={index}
                    style={[
                      styles.colorOption,
                      { backgroundColor: color },
                      editColorIndex === index && [styles.colorOptionSelected, { borderColor: colors.foreground }],
                    ]}
                    onPress={() => {
                      Haptics.selectionAsync();
                      setEditColorIndex(index);
                    }}
                  />
                ))}
              </View>
            </View>

            {saveError && (
              <View style={[styles.errorContainer, { backgroundColor: hexToRgba(colors.destructive, 0.1) }]}>
                <Text style={[styles.errorText, { color: colors.destructive }]}>{saveError}</Text>
              </View>
            )}
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
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
  scrollView: {
    flex: 1,
  },
  header: {
    alignItems: 'center',
    paddingTop: 24,
    paddingBottom: 20,
    paddingHorizontal: 24,
  },
  avatarContainer: {
    borderRadius: 44,
    marginBottom: 16,
  },
  username: {
    fontSize: 26,
    fontWeight: '800',
    marginBottom: 4,
  },
  userMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  levelBadge: {
    fontSize: 14,
    fontWeight: '600',
  },
  metaSeparator: {
    fontSize: 12,
  },
  email: {
    fontSize: 14,
  },
  guestBadge: {
    marginTop: 12,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  guestBadgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  content: {
    padding: 16,
  },
  achievementsCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    marginBottom: 16,
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
  achievementsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  achievementsIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  achievementsInfo: {
    flex: 1,
  },
  achievementsTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 2,
  },
  achievementsSubtitle: {
    fontSize: 13,
  },
  achievementsProgress: {
    marginTop: 12,
  },
  progressTrack: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  actions: {
    gap: 12,
    marginTop: 8,
  },
  // Modal styles
  modalContainer: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
  },
  modalCancel: {
    fontSize: 16,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '600',
  },
  modalSave: {
    fontSize: 16,
    fontWeight: '600',
  },
  modalContent: {
    flex: 1,
    padding: 24,
  },
  avatarPreview: {
    alignItems: 'center',
    marginBottom: 32,
  },
  formGroup: {
    marginBottom: 24,
  },
  formLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  formInput: {
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    borderWidth: 1,
  },
  formHint: {
    fontSize: 12,
    marginTop: 6,
  },
  colorPicker: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  colorOption: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 3,
    borderColor: 'transparent',
  },
  colorOptionSelected: {
    borderWidth: 3,
  },
  errorContainer: {
    borderRadius: 8,
    padding: 12,
    marginTop: 16,
  },
  errorText: {
    fontSize: 14,
    textAlign: 'center',
  },
});
