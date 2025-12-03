/**
 * Offline Storage Module
 * Manages puzzle caching, pending attempts queue, and offline state
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import type {
  Puzzle,
  PuzzleAttempt,
  CachedPuzzle,
  PendingAttempt,
  OfflineGameState,
  UserStats,
  AchievementsResponse,
  CachedData,
} from '../types';

const STORAGE_KEYS = {
  CACHED_PUZZLE: 'rebuzzle_cached_puzzle',
  PENDING_ATTEMPTS: 'rebuzzle_pending_attempts',
  OFFLINE_GAME_STATE: 'rebuzzle_offline_game_state',
  LAST_SYNC_TIME: 'rebuzzle_last_sync',
  USER_STATS_CACHE: 'rebuzzle_user_stats_cache',
  ACHIEVEMENTS_CACHE: 'rebuzzle_achievements_cache',
} as const;

// ============================================
// PUZZLE CACHING
// ============================================

/**
 * Cache today's puzzle for offline play
 */
export async function cachePuzzle(puzzle: Puzzle): Promise<void> {
  const cached: CachedPuzzle = {
    ...puzzle,
    cachedAt: new Date().toISOString(),
    syncedToServer: false,
  };
  await AsyncStorage.setItem(STORAGE_KEYS.CACHED_PUZZLE, JSON.stringify(cached));
}

/**
 * Get cached puzzle (only returns if it's from today)
 */
export async function getCachedPuzzle(): Promise<CachedPuzzle | null> {
  try {
    const data = await AsyncStorage.getItem(STORAGE_KEYS.CACHED_PUZZLE);
    if (!data) return null;

    const cached: CachedPuzzle = JSON.parse(data);

    // Check if puzzle is from today
    const today = new Date().toISOString().split('T')[0];
    const cachedDate = cached.cachedAt.split('T')[0];

    if (cachedDate !== today) {
      // Expired - remove it
      await AsyncStorage.removeItem(STORAGE_KEYS.CACHED_PUZZLE);
      return null;
    }

    return cached;
  } catch (error) {
    console.error('Error getting cached puzzle:', error);
    return null;
  }
}

/**
 * Clear cached puzzle
 */
export async function clearCachedPuzzle(): Promise<void> {
  await AsyncStorage.removeItem(STORAGE_KEYS.CACHED_PUZZLE);
}

// ============================================
// PENDING ATTEMPTS QUEUE
// ============================================

/**
 * Generate a unique local ID for pending attempts
 */
function generateLocalId(): string {
  return `local_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Queue an attempt for later sync when offline
 */
export async function queuePendingAttempt(attempt: PuzzleAttempt): Promise<string> {
  const pending: PendingAttempt = {
    ...attempt,
    localId: generateLocalId(),
    createdAt: new Date().toISOString(),
    syncedToServer: false,
  };

  const existing = await getPendingAttempts();
  existing.push(pending);
  await AsyncStorage.setItem(STORAGE_KEYS.PENDING_ATTEMPTS, JSON.stringify(existing));

  return pending.localId;
}

/**
 * Get all pending attempts
 */
export async function getPendingAttempts(): Promise<PendingAttempt[]> {
  try {
    const data = await AsyncStorage.getItem(STORAGE_KEYS.PENDING_ATTEMPTS);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error('Error getting pending attempts:', error);
    return [];
  }
}

/**
 * Mark an attempt as synced (remove from queue)
 */
export async function markAttemptSynced(localId: string): Promise<void> {
  const attempts = await getPendingAttempts();
  const updated = attempts.filter((a) => a.localId !== localId);
  await AsyncStorage.setItem(STORAGE_KEYS.PENDING_ATTEMPTS, JSON.stringify(updated));
}

/**
 * Clear all pending attempts
 */
export async function clearPendingAttempts(): Promise<void> {
  await AsyncStorage.removeItem(STORAGE_KEYS.PENDING_ATTEMPTS);
}

// ============================================
// OFFLINE GAME STATE
// ============================================

/**
 * Save current game state for offline resume
 */
export async function saveOfflineGameState(state: OfflineGameState): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEYS.OFFLINE_GAME_STATE, JSON.stringify(state));
}

/**
 * Get saved offline game state
 */
export async function getOfflineGameState(): Promise<OfflineGameState | null> {
  try {
    const data = await AsyncStorage.getItem(STORAGE_KEYS.OFFLINE_GAME_STATE);
    return data ? JSON.parse(data) : null;
  } catch (error) {
    console.error('Error getting offline game state:', error);
    return null;
  }
}

/**
 * Clear offline game state
 */
export async function clearOfflineGameState(): Promise<void> {
  await AsyncStorage.removeItem(STORAGE_KEYS.OFFLINE_GAME_STATE);
}

// ============================================
// USER STATS CACHE
// ============================================

/**
 * Cache user stats for offline display
 */
export async function cacheUserStats(stats: UserStats): Promise<void> {
  const cached: CachedData<UserStats> = {
    data: stats,
    cachedAt: new Date().toISOString(),
  };
  await AsyncStorage.setItem(STORAGE_KEYS.USER_STATS_CACHE, JSON.stringify(cached));
}

/**
 * Get cached user stats
 */
export async function getCachedUserStats(): Promise<CachedData<UserStats> | null> {
  try {
    const data = await AsyncStorage.getItem(STORAGE_KEYS.USER_STATS_CACHE);
    return data ? JSON.parse(data) : null;
  } catch (error) {
    console.error('Error getting cached user stats:', error);
    return null;
  }
}

/**
 * Clear cached user stats
 */
export async function clearCachedUserStats(): Promise<void> {
  await AsyncStorage.removeItem(STORAGE_KEYS.USER_STATS_CACHE);
}

// ============================================
// ACHIEVEMENTS CACHE
// ============================================

/**
 * Cache achievements data for offline display
 */
export async function cacheAchievements(achievements: AchievementsResponse): Promise<void> {
  const cached: CachedData<AchievementsResponse> = {
    data: achievements,
    cachedAt: new Date().toISOString(),
  };
  await AsyncStorage.setItem(STORAGE_KEYS.ACHIEVEMENTS_CACHE, JSON.stringify(cached));
}

/**
 * Get cached achievements
 */
export async function getCachedAchievements(): Promise<CachedData<AchievementsResponse> | null> {
  try {
    const data = await AsyncStorage.getItem(STORAGE_KEYS.ACHIEVEMENTS_CACHE);
    return data ? JSON.parse(data) : null;
  } catch (error) {
    console.error('Error getting cached achievements:', error);
    return null;
  }
}

/**
 * Clear cached achievements
 */
export async function clearCachedAchievements(): Promise<void> {
  await AsyncStorage.removeItem(STORAGE_KEYS.ACHIEVEMENTS_CACHE);
}

// ============================================
// SYNC TRACKING
// ============================================

/**
 * Update the last sync timestamp
 */
export async function updateLastSyncTime(): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEYS.LAST_SYNC_TIME, new Date().toISOString());
}

/**
 * Get the last sync timestamp
 */
export async function getLastSyncTime(): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(STORAGE_KEYS.LAST_SYNC_TIME);
  } catch (error) {
    console.error('Error getting last sync time:', error);
    return null;
  }
}

// ============================================
// CLEAR ALL CACHE
// ============================================

/**
 * Clear all cached data (useful on logout)
 */
export async function clearAllCache(): Promise<void> {
  await Promise.all([
    clearCachedPuzzle(),
    clearPendingAttempts(),
    clearOfflineGameState(),
    clearCachedUserStats(),
    clearCachedAchievements(),
    AsyncStorage.removeItem(STORAGE_KEYS.LAST_SYNC_TIME),
  ]);
}
