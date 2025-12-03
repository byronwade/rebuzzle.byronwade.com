/**
 * Profile Screen
 * User profile with stats, achievements progress, and settings
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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, Link } from 'expo-router';
import { useAuth } from '../src/contexts/AuthContext';
import { useAchievements } from '../src/contexts/AchievementsContext';
import { useTheme } from '../src/contexts/ThemeContext';
import { AvatarCircle, AVATAR_COLORS } from '../src/components/AvatarCircle';
import { api } from '../src/lib/api';
import { hexToRgba } from '../src/lib/theme';

export default function ProfileScreen() {
  const router = useRouter();
  const { isAuthenticated, user, stats, logout, refreshStats } = useAuth();
  const { progress } = useAchievements();
  const { theme } = useTheme();
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
          <ActivityIndicator size="large" color={colors.accent} />
        </View>
      </SafeAreaView>
    );
  }

  const achievementPercentage = progress
    ? Math.round((progress.unlocked / progress.total) * 100)
    : 0;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['bottom']}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Profile Header */}
        <View style={styles.header}>
          <AvatarCircle
            username={user.username}
            customInitials={user.avatarCustomInitials}
            colorIndex={user.avatarColorIndex}
            size={80}
          />
          <Text style={[styles.username, { color: colors.foreground }]}>
            {user.isGuest ? 'Guest' : user.username}
          </Text>
          <Text style={[styles.email, { color: colors.mutedForeground }]}>{user.email}</Text>
          {user.isGuest && (
            <View style={[styles.guestBadge, { backgroundColor: hexToRgba(colors.accent, 0.15) }]}>
              <Text style={[styles.guestBadgeText, { color: colors.accent }]}>Guest Account</Text>
            </View>
          )}
        </View>

        {/* Stats Card */}
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.cardTitle, { color: colors.accent }]}>Your Stats</Text>
          <View style={styles.statsGrid}>
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: colors.accent }]}>{stats?.level || 1}</Text>
              <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>Level</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: colors.accent }]}>{stats?.streak || 0}</Text>
              <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>Streak</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: colors.accent }]}>{stats?.points || 0}</Text>
              <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>Points</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: colors.accent }]}>{stats?.totalGames || 0}</Text>
              <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>Games</Text>
            </View>
          </View>
          <View style={[styles.statsRow, { borderTopColor: colors.border }]}>
            <View style={styles.statRowItem}>
              <Text style={[styles.statRowLabel, { color: colors.mutedForeground }]}>Win Rate</Text>
              <Text style={[styles.statRowValue, { color: colors.foreground }]}>
                {stats?.totalGames
                  ? Math.round((stats.wins / stats.totalGames) * 100)
                  : 0}%
              </Text>
            </View>
            <View style={styles.statRowItem}>
              <Text style={[styles.statRowLabel, { color: colors.mutedForeground }]}>Max Streak</Text>
              <Text style={[styles.statRowValue, { color: colors.foreground }]}>{stats?.maxStreak || 0}</Text>
            </View>
            <View style={styles.statRowItem}>
              <Text style={[styles.statRowLabel, { color: colors.mutedForeground }]}>Perfect Solves</Text>
              <Text style={[styles.statRowValue, { color: colors.foreground }]}>{stats?.perfectSolves || 0}</Text>
            </View>
          </View>
        </View>

        {/* Achievements Card */}
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.cardHeader}>
            <Text style={[styles.cardTitle, { color: colors.accent }]}>Achievements</Text>
            <Link href="/achievements" asChild>
              <Pressable>
                <Text style={[styles.viewAllLink, { color: colors.mutedForeground }]}>View All</Text>
              </Pressable>
            </Link>
          </View>
          {progress ? (
            <>
              <View style={styles.progressContainer}>
                <View style={[styles.progressBar, { backgroundColor: colors.muted }]}>
                  <View
                    style={[styles.progressFill, { width: `${achievementPercentage}%`, backgroundColor: colors.accent }]}
                  />
                </View>
                <Text style={[styles.progressText, { color: colors.mutedForeground }]}>
                  {progress.unlocked}/{progress.total} unlocked
                </Text>
              </View>
              <View style={[styles.achievementStats, { borderTopColor: colors.border }]}>
                <Text style={[styles.achievementPointsLabel, { color: colors.mutedForeground }]}>Points Earned</Text>
                <Text style={[styles.achievementPoints, { color: colors.foreground }]}>
                  {progress.earnedPoints}/{progress.totalPoints}
                </Text>
              </View>
            </>
          ) : (
            <Text style={[styles.noData, { color: colors.mutedForeground }]}>No achievements yet</Text>
          )}
        </View>

        {/* Actions */}
        <View style={styles.actions}>
          {!user.isGuest && (
            <Pressable
              style={[
                styles.editButton,
                {
                  backgroundColor: hexToRgba(colors.accent, 0.15),
                  borderColor: hexToRgba(colors.accent, 0.3),
                },
              ]}
              onPress={() => setIsEditing(true)}
            >
              <Text style={[styles.editButtonText, { color: colors.accent }]}>Edit Profile</Text>
            </Pressable>
          )}

          {user.isGuest && (
            <Link href="/signup" asChild>
              <Pressable style={[styles.upgradeButton, { backgroundColor: colors.accent }]}>
                <Text style={[styles.upgradeButtonText, { color: colors.accentForeground }]}>Create Account</Text>
              </Pressable>
            </Link>
          )}

          <Pressable
            style={[styles.logoutButton, { borderColor: hexToRgba(colors.destructive, 0.3) }]}
            onPress={handleLogout}
          >
            <Text style={[styles.logoutButtonText, { color: colors.destructive }]}>Logout</Text>
          </Pressable>
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
                <ActivityIndicator size="small" color={colors.accent} />
              ) : (
                <Text style={[styles.modalSave, { color: colors.accent }]}>Save</Text>
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
                    backgroundColor: colors.secondary,
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
                    backgroundColor: colors.secondary,
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
                    onPress={() => setEditColorIndex(index)}
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
    paddingVertical: 32,
    paddingHorizontal: 24,
  },
  username: {
    fontSize: 24,
    fontWeight: 'bold',
    marginTop: 16,
  },
  email: {
    fontSize: 14,
    marginTop: 4,
  },
  guestBadge: {
    marginTop: 12,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  guestBadgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  card: {
    borderRadius: 16,
    padding: 20,
    marginHorizontal: 16,
    marginBottom: 16,
    borderWidth: 1,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  viewAllLink: {
    fontSize: 14,
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 20,
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 28,
    fontWeight: 'bold',
  },
  statLabel: {
    fontSize: 12,
    marginTop: 4,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 16,
    borderTopWidth: 1,
  },
  statRowItem: {
    alignItems: 'center',
  },
  statRowLabel: {
    fontSize: 11,
    marginBottom: 4,
  },
  statRowValue: {
    fontSize: 16,
    fontWeight: '600',
  },
  progressContainer: {
    marginBottom: 12,
  },
  progressBar: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  progressText: {
    fontSize: 13,
    textAlign: 'center',
  },
  achievementStats: {
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
  },
  achievementPointsLabel: {
    fontSize: 12,
    marginBottom: 4,
  },
  achievementPoints: {
    fontSize: 18,
    fontWeight: '600',
  },
  noData: {
    fontSize: 14,
    textAlign: 'center',
  },
  actions: {
    padding: 16,
    gap: 12,
  },
  editButton: {
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
  },
  editButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  upgradeButton: {
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  upgradeButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  logoutButton: {
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
  },
  logoutButtonText: {
    fontSize: 16,
    fontWeight: '600',
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
