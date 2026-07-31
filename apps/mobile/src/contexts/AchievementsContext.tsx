/**
 * Achievements Context
 * Manages achievement state, notifications, and syncing
 */

import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  ReactNode,
  useEffect,
} from 'react';
import { api } from '../lib/api';
import { useAuth } from './AuthContext';
import { cacheAchievements, getCachedAchievements } from '../lib/offline-storage';
import type {
  Achievement,
  AchievementProgress,
  AchievementsResponse,
  CheckAchievementsResponse,
  NewlyUnlockedAchievement,
  GameContext,
  AchievementCategoryInfo,
  AchievementRarityInfo,
} from '../types';

interface AchievementsContextType {
  /** All achievements with unlock status */
  achievements: Achievement[];
  /** Overall progress stats */
  progress: AchievementProgress | null;
  /** Achievement categories metadata */
  categories: Record<string, AchievementCategoryInfo>;
  /** Achievement rarities metadata */
  rarities: Record<string, AchievementRarityInfo>;
  /** Loading state */
  isLoading: boolean;
  /** Error message if any */
  error: string | null;
  /** Newly unlocked achievements (for modal display) */
  newlyUnlocked: NewlyUnlockedAchievement[];
  /** Total points from newly unlocked achievements */
  newlyUnlockedPoints: number;
  /** Load achievements from server */
  loadAchievements: (options?: { category?: string; rarity?: string }) => Promise<void>;
  /** Check and award achievements after game completion */
  checkAchievementsAfterGame: (gameContext: GameContext) => Promise<CheckAchievementsResponse | null>;
  /** Dismiss newly unlocked achievements notification */
  dismissNewAchievements: () => void;
  /** Manually award an achievement (e.g., share_result) */
  awardManualAchievement: (achievementId: string) => Promise<boolean>;
  /** Get achievements by category */
  getAchievementsByCategory: (category: string) => Achievement[];
  /** Get unlocked achievements count */
  getUnlockedCount: () => number;
}

const AchievementsContext = createContext<AchievementsContextType | undefined>(undefined);

interface AchievementsProviderProps {
  children: ReactNode;
}

export function AchievementsProvider({ children }: AchievementsProviderProps) {
  const { isAuthenticated } = useAuth();

  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [progress, setProgress] = useState<AchievementProgress | null>(null);
  const [categories, setCategories] = useState<Record<string, AchievementCategoryInfo>>({});
  const [rarities, setRarities] = useState<Record<string, AchievementRarityInfo>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [newlyUnlocked, setNewlyUnlocked] = useState<NewlyUnlockedAchievement[]>([]);
  const [newlyUnlockedPoints, setNewlyUnlockedPoints] = useState(0);

  /**
   * Load achievements from server with cache fallback
   */
  const loadAchievements = useCallback(
    async (options?: { category?: string; rarity?: string }) => {
      setIsLoading(true);
      setError(null);

      try {
        const response = await api.getAchievements(options);

        if (response?.success) {
          setAchievements(response.achievements);
          setProgress(response.progress);
          setCategories(response.categories || {});
          setRarities(response.rarities || {});
          // Cache for offline use
          await cacheAchievements(response);
        } else {
          // Try to load from cache
          const cached = await getCachedAchievements();
          if (cached) {
            setAchievements(cached.data.achievements);
            setProgress(cached.data.progress);
            setCategories(cached.data.categories || {});
            setRarities(cached.data.rarities || {});
          } else {
            setError('Failed to load achievements');
          }
        }
      } catch (err) {
        console.error('Failed to load achievements:', err);
        setError('Failed to load achievements');

        // Try cache on error
        const cached = await getCachedAchievements();
        if (cached) {
          setAchievements(cached.data.achievements);
          setProgress(cached.data.progress);
          setCategories(cached.data.categories || {});
          setRarities(cached.data.rarities || {});
        }
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  /**
   * Check and award achievements after game completion
   */
  const checkAchievementsAfterGame = useCallback(
    async (gameContext: GameContext): Promise<CheckAchievementsResponse | null> => {
      if (!isAuthenticated) return null;

      try {
        const response = await api.checkAchievements(gameContext);

        if (response?.success && response.newlyUnlocked.length > 0) {
          setNewlyUnlocked(response.newlyUnlocked);
          setNewlyUnlockedPoints(response.totalNewPoints);
          // Refresh achievements list to get updated unlock status
          await loadAchievements();
        }

        return response;
      } catch (err) {
        console.error('Failed to check achievements:', err);
        return null;
      }
    },
    [isAuthenticated, loadAchievements]
  );

  /**
   * Dismiss the newly unlocked achievements notification
   */
  const dismissNewAchievements = useCallback(() => {
    setNewlyUnlocked([]);
    setNewlyUnlockedPoints(0);
  }, []);

  /**
   * Manually award an achievement (e.g., for sharing results)
   */
  const awardManualAchievement = useCallback(
    async (achievementId: string): Promise<boolean> => {
      try {
        const result = await api.awardAchievement(achievementId);
        if (result.awarded) {
          // Refresh achievements to show newly unlocked
          await loadAchievements();
        }
        return result.awarded;
      } catch (err) {
        console.error('Failed to award achievement:', err);
        return false;
      }
    },
    [loadAchievements]
  );

  /**
   * Get achievements filtered by category
   */
  const getAchievementsByCategory = useCallback(
    (category: string): Achievement[] => {
      return achievements.filter((a) => a.category === category);
    },
    [achievements]
  );

  /**
   * Get count of unlocked achievements
   */
  const getUnlockedCount = useCallback((): number => {
    return achievements.filter((a) => a.unlocked).length;
  }, [achievements]);

  // Load achievements when authenticated
  useEffect(() => {
    if (isAuthenticated) {
      loadAchievements();
    } else {
      // Clear achievements when logged out
      setAchievements([]);
      setProgress(null);
      setNewlyUnlocked([]);
      setNewlyUnlockedPoints(0);
    }
  }, [isAuthenticated, loadAchievements]);

  const value: AchievementsContextType = {
    achievements,
    progress,
    categories,
    rarities,
    isLoading,
    error,
    newlyUnlocked,
    newlyUnlockedPoints,
    loadAchievements,
    checkAchievementsAfterGame,
    dismissNewAchievements,
    awardManualAchievement,
    getAchievementsByCategory,
    getUnlockedCount,
  };

  return (
    <AchievementsContext.Provider value={value}>{children}</AchievementsContext.Provider>
  );
}

/**
 * Hook to use achievements context
 */
export function useAchievements(): AchievementsContextType {
  const context = useContext(AchievementsContext);
  if (context === undefined) {
    throw new Error('useAchievements must be used within an AchievementsProvider');
  }
  return context;
}
