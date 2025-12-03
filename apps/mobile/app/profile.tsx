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
import { AvatarCircle, AVATAR_COLORS } from '../src/components/AvatarCircle';
import { api } from '../src/lib/api';

export default function ProfileScreen() {
  const router = useRouter();
  const { isAuthenticated, user, stats, logout, refreshStats } = useAuth();
  const { progress } = useAchievements();

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
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#facc15" />
        </View>
      </SafeAreaView>
    );
  }

  const achievementPercentage = progress
    ? Math.round((progress.unlocked / progress.total) * 100)
    : 0;

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Profile Header */}
        <View style={styles.header}>
          <AvatarCircle
            username={user.username}
            customInitials={user.avatarCustomInitials}
            colorIndex={user.avatarColorIndex}
            size={80}
          />
          <Text style={styles.username}>
            {user.isGuest ? 'Guest' : user.username}
          </Text>
          <Text style={styles.email}>{user.email}</Text>
          {user.isGuest && (
            <View style={styles.guestBadge}>
              <Text style={styles.guestBadgeText}>Guest Account</Text>
            </View>
          )}
        </View>

        {/* Stats Card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Your Stats</Text>
          <View style={styles.statsGrid}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{stats?.level || 1}</Text>
              <Text style={styles.statLabel}>Level</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{stats?.streak || 0}</Text>
              <Text style={styles.statLabel}>Streak</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{stats?.points || 0}</Text>
              <Text style={styles.statLabel}>Points</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{stats?.totalGames || 0}</Text>
              <Text style={styles.statLabel}>Games</Text>
            </View>
          </View>
          <View style={styles.statsRow}>
            <View style={styles.statRowItem}>
              <Text style={styles.statRowLabel}>Win Rate</Text>
              <Text style={styles.statRowValue}>
                {stats?.totalGames
                  ? Math.round((stats.wins / stats.totalGames) * 100)
                  : 0}%
              </Text>
            </View>
            <View style={styles.statRowItem}>
              <Text style={styles.statRowLabel}>Max Streak</Text>
              <Text style={styles.statRowValue}>{stats?.maxStreak || 0}</Text>
            </View>
            <View style={styles.statRowItem}>
              <Text style={styles.statRowLabel}>Perfect Solves</Text>
              <Text style={styles.statRowValue}>{stats?.perfectSolves || 0}</Text>
            </View>
          </View>
        </View>

        {/* Achievements Card */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Achievements</Text>
            <Link href="/achievements" asChild>
              <Pressable>
                <Text style={styles.viewAllLink}>View All</Text>
              </Pressable>
            </Link>
          </View>
          {progress ? (
            <>
              <View style={styles.progressContainer}>
                <View style={styles.progressBar}>
                  <View
                    style={[styles.progressFill, { width: `${achievementPercentage}%` }]}
                  />
                </View>
                <Text style={styles.progressText}>
                  {progress.unlocked}/{progress.total} unlocked
                </Text>
              </View>
              <View style={styles.achievementStats}>
                <Text style={styles.achievementPointsLabel}>Points Earned</Text>
                <Text style={styles.achievementPoints}>
                  {progress.earnedPoints}/{progress.totalPoints}
                </Text>
              </View>
            </>
          ) : (
            <Text style={styles.noData}>No achievements yet</Text>
          )}
        </View>

        {/* Actions */}
        <View style={styles.actions}>
          {!user.isGuest && (
            <Pressable
              style={styles.editButton}
              onPress={() => setIsEditing(true)}
            >
              <Text style={styles.editButtonText}>Edit Profile</Text>
            </Pressable>
          )}

          {user.isGuest && (
            <Link href="/signup" asChild>
              <Pressable style={styles.upgradeButton}>
                <Text style={styles.upgradeButtonText}>Create Account</Text>
              </Pressable>
            </Link>
          )}

          <Pressable style={styles.logoutButton} onPress={handleLogout}>
            <Text style={styles.logoutButtonText}>Logout</Text>
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
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Pressable onPress={() => setIsEditing(false)}>
              <Text style={styles.modalCancel}>Cancel</Text>
            </Pressable>
            <Text style={styles.modalTitle}>Edit Profile</Text>
            <Pressable onPress={handleSaveProfile} disabled={isSaving}>
              {isSaving ? (
                <ActivityIndicator size="small" color="#facc15" />
              ) : (
                <Text style={styles.modalSave}>Save</Text>
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
              <Text style={styles.formLabel}>Username</Text>
              <TextInput
                style={styles.formInput}
                value={editUsername}
                onChangeText={setEditUsername}
                placeholder="Enter username"
                placeholderTextColor="#64748b"
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>

            {/* Custom Initials */}
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Avatar Initials (optional)</Text>
              <TextInput
                style={styles.formInput}
                value={editInitials}
                onChangeText={(text) => setEditInitials(text.slice(0, 2).toUpperCase())}
                placeholder="e.g. JD"
                placeholderTextColor="#64748b"
                autoCapitalize="characters"
                maxLength={2}
              />
              <Text style={styles.formHint}>
                Leave empty to use username initials
              </Text>
            </View>

            {/* Color Picker */}
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Avatar Color</Text>
              <View style={styles.colorPicker}>
                {AVATAR_COLORS.map((color, index) => (
                  <Pressable
                    key={index}
                    style={[
                      styles.colorOption,
                      { backgroundColor: color },
                      editColorIndex === index && styles.colorOptionSelected,
                    ]}
                    onPress={() => setEditColorIndex(index)}
                  />
                ))}
              </View>
            </View>

            {saveError && (
              <View style={styles.errorContainer}>
                <Text style={styles.errorText}>{saveError}</Text>
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
    backgroundColor: '#1a1a2e',
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
    color: '#fff',
    marginTop: 16,
  },
  email: {
    fontSize: 14,
    color: '#94a3b8',
    marginTop: 4,
  },
  guestBadge: {
    marginTop: 12,
    backgroundColor: 'rgba(250, 204, 21, 0.15)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  guestBadgeText: {
    fontSize: 12,
    color: '#facc15',
    fontWeight: '600',
  },
  card: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 16,
    padding: 20,
    marginHorizontal: 16,
    marginBottom: 16,
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
    color: '#facc15',
  },
  viewAllLink: {
    fontSize: 14,
    color: '#94a3b8',
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
    color: '#facc15',
  },
  statLabel: {
    fontSize: 12,
    color: '#94a3b8',
    marginTop: 4,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
  },
  statRowItem: {
    alignItems: 'center',
  },
  statRowLabel: {
    fontSize: 11,
    color: '#64748b',
    marginBottom: 4,
  },
  statRowValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#e2e8f0',
  },
  progressContainer: {
    marginBottom: 12,
  },
  progressBar: {
    height: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#facc15',
    borderRadius: 4,
  },
  progressText: {
    fontSize: 13,
    color: '#94a3b8',
    textAlign: 'center',
  },
  achievementStats: {
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
  },
  achievementPointsLabel: {
    fontSize: 12,
    color: '#64748b',
    marginBottom: 4,
  },
  achievementPoints: {
    fontSize: 18,
    fontWeight: '600',
    color: '#e2e8f0',
  },
  noData: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
  },
  actions: {
    padding: 16,
    gap: 12,
  },
  editButton: {
    backgroundColor: 'rgba(250, 204, 21, 0.15)',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(250, 204, 21, 0.3)',
  },
  editButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#facc15',
  },
  upgradeButton: {
    backgroundColor: '#facc15',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  upgradeButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1a1a2e',
  },
  logoutButton: {
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
  },
  logoutButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ef4444',
  },
  // Modal styles
  modalContainer: {
    flex: 1,
    backgroundColor: '#1a1a2e',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  modalCancel: {
    fontSize: 16,
    color: '#94a3b8',
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#fff',
  },
  modalSave: {
    fontSize: 16,
    fontWeight: '600',
    color: '#facc15',
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
    color: '#e2e8f0',
    marginBottom: 8,
  },
  formInput: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#fff',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  formHint: {
    fontSize: 12,
    color: '#64748b',
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
    borderColor: '#fff',
  },
  errorContainer: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderRadius: 8,
    padding: 12,
    marginTop: 16,
  },
  errorText: {
    color: '#ef4444',
    fontSize: 14,
    textAlign: 'center',
  },
});
