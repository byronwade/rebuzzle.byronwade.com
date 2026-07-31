/**
 * TypeScript Types for Mobile App
 */

// User types
export interface User {
  id: string;
  username: string;
  email: string;
  avatarColorIndex?: number;
  avatarCustomInitials?: string;
  isGuest?: boolean;
}

export interface UserStats {
  points: number;
  streak: number;
  maxStreak: number;
  totalGames: number;
  wins: number;
  level: number;
  dailyChallengeStreak: number;
  perfectSolves: number;
  fastestSolveSeconds?: number;
  lastPlayDate?: string;
}

// Puzzle types
export interface Puzzle {
  id: string;
  puzzle: string;
  puzzleType: string;
  answer: string;
  difficulty: string | number;
  category?: string;
  explanation?: string;
  hints?: string[];
  publishedAt: string;
}

// Game state types
export interface GameState {
  puzzle: Puzzle | null;
  attempts: number;
  maxAttempts: number;
  guesses: string[];
  isComplete: boolean;
  isCorrect: boolean;
  startTime: number;
  elapsedTime: number;
  hintsUsed: number;
  score: number | null;
}

// Auth state types
export interface AuthState {
  isAuthenticated: boolean;
  isLoading: boolean;
  user: User | null;
  token: string | null;
}

// Leaderboard types
export interface LeaderboardEntry {
  rank: number;
  user: {
    id: string;
    username: string;
    avatarColorIndex?: number;
    avatarCustomInitials?: string;
  };
  stats: {
    points: number;
    streak?: number;
    wins: number;
    level: number;
  };
}

// API Response types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface LoginResponse {
  success: boolean;
  user: User;
  token: string;
}

export interface SignupResponse {
  success: boolean;
  user: User;
  token: string;
  convertedFromGuest?: boolean;
  message: string;
}

export interface SessionResponse {
  user: User | null;
  authenticated: boolean;
}

export interface PuzzleResponse {
  success: boolean;
  puzzle: Puzzle;
  cached?: boolean;
  generatedAt?: string;
  serverTime?: string;
  nextPuzzleTime?: string;
}

export interface StatsResponse {
  success: boolean;
  user: User;
  stats: UserStats;
  rank: number;
}

export interface LeaderboardResponse {
  success: boolean;
  leaderboard: LeaderboardEntry[];
  sortBy: string;
}

// Puzzle attempt
export interface PuzzleAttempt {
  puzzleId: string;
  attemptedAnswer: string;
  isCorrect: boolean;
  abandoned?: boolean;
  attemptNumber: number;
  maxAttempts: number;
  timeSpentSeconds: number;
  difficulty?: string;
  hintsUsed?: number;
}

// ============================================
// ACHIEVEMENT TYPES
// ============================================

export type AchievementRarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';

export type AchievementCategory =
  | 'beginner'
  | 'solving'
  | 'speed'
  | 'streaks'
  | 'mastery'
  | 'social'
  | 'explorer'
  | 'collector'
  | 'elite'
  | 'legendary';

export interface Achievement {
  id: string;
  name: string;
  description: string;
  hint: string;
  icon: string;
  category: AchievementCategory;
  rarity: AchievementRarity;
  points: number;
  order: number;
  secret: boolean;
  unlocked: boolean;
  unlockedAt: string | null;
}

export interface AchievementProgress {
  total: number;
  unlocked: number;
  totalPoints: number;
  earnedPoints: number;
  percentage: number;
}

export interface AchievementCategoryInfo {
  name: string;
  description: string;
  icon: string;
}

export interface AchievementRarityInfo {
  name: string;
  color: string;
  bgColor: string;
}

export interface AchievementsResponse {
  success: boolean;
  achievements: Achievement[];
  progress: AchievementProgress | null;
  categories: Record<string, AchievementCategoryInfo>;
  rarities: Record<string, AchievementRarityInfo>;
}

export interface UserAchievementsResponse {
  success: boolean;
  progress: {
    unlocked: number;
    total: number;
  };
  recentUnlocks: {
    id: string;
    achievementId: string;
    unlockedAt: string;
    achievement: {
      name: string;
      description: string;
      icon: string;
      rarity: string;
      points: number;
      category: string;
    };
  }[];
}

export interface GameContext {
  puzzleId: string;
  attempts: number;
  maxAttempts?: number;
  isCorrect: boolean;
  timeTaken?: number;
  hintsUsed?: number;
  difficulty?: string;
  score?: number;
}

export interface NewlyUnlockedAchievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  rarity: string;
  points: number;
}

export interface CheckAchievementsResponse {
  success: boolean;
  newlyUnlocked: NewlyUnlockedAchievement[];
  totalNewPoints: number;
}

// ============================================
// AI VALIDATION TYPES
// ============================================

export interface AIValidationResult {
  isCorrect: boolean;
  confidence: number;
  reason?: string;
  feedback?: string;
}

export interface AIValidationResponse {
  success: boolean;
  result: AIValidationResult;
  metadata: {
    validationTimeMs: number;
  };
}

export interface AIValidationRequest {
  guess: string;
  correctAnswer: string;
  puzzleContext?: string;
  explanation?: string;
  useAI?: boolean;
  attemptsLeft?: number;
}

// ============================================
// PROFILE TYPES
// ============================================

export interface UserProfile {
  id: string;
  username: string;
  email: string;
  avatarColorIndex?: number;
  avatarCustomInitials?: string;
  createdAt: string;
  lastLogin: string;
}

export interface ProfileResponse {
  success: boolean;
  user: UserProfile;
  message?: string;
}

export interface ProfileUpdateRequest {
  username?: string;
  avatarColorIndex?: number;
  avatarCustomInitials?: string;
}

// ============================================
// PUZZLE STATS TYPES
// ============================================

export interface PuzzleStats {
  todaySolves: number;
  averageSolveTime: number;
  averageAttempts: number;
  solveTimeDistribution: number[];
}

export interface PuzzleStatsResponse {
  success: boolean;
  stats: PuzzleStats;
}

// ============================================
// OFFLINE/CACHE TYPES
// ============================================

export interface CachedPuzzle extends Puzzle {
  cachedAt: string;
  syncedToServer: boolean;
}

export interface PendingAttempt extends PuzzleAttempt {
  localId: string;
  createdAt: string;
  syncedToServer: boolean;
}

export interface OfflineGameState {
  puzzleId: string;
  attempts: number;
  guesses: string[];
  startTime: number;
  hintsUsed: number;
}

export interface CachedData<T> {
  data: T;
  cachedAt: string;
}
