/**
 * Database Models
 *
 * Clean TypeScript interfaces for MongoDB documents
 */

export interface User {
  _id?: string;
  id: string;
  username: string;
  email: string;
  passwordHash: string;
  createdAt: Date;
  lastLogin?: Date;
  resetToken?: string;
  resetTokenExpiry?: Date;
  isAdmin?: boolean; // Admin permission flag
  // Avatar preferences
  avatarColorIndex?: number; // Index into avatar color palette (0-9)
  avatarCustomInitials?: string; // Custom initials (1-2 characters)
}

export interface UserStats {
  _id?: string;
  id: string;
  userId: string;
  points: number;
  streak: number;
  totalGames: number;
  wins: number;
  level: number;
  dailyChallengeStreak: number;
  lastPlayDate?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface Puzzle {
  _id?: string;
  id: string;
  puzzle: string; // Generic puzzle display field (was rebusPuzzle, now works for all types)
  puzzleType?: string; // Type of puzzle (e.g., "rebus", "word-puzzle")
  answer: string;
  difficulty: "easy" | "medium" | "hard" | number; // Support both string and number
  category?: string;
  explanation?: string;
  hints?: string[];
  publishedAt: Date;
  createdAt: Date;
  active: boolean;
  embedding?: number[]; // Vector embedding for semantic search
  metadata?: {
    topic?: string;
    keyword?: string;
    category?: string;
    seoMetadata?: {
      keywords: string[];
      description: string;
      ogTitle: string;
      ogDescription: string;
    };
    aiGenerated?: boolean;
    qualityScore?: number;
    uniquenessScore?: number;
    generatedAt?: string;
    hints?: string[];
    puzzleType?: string; // Store puzzle type in metadata too
  };
  // Legacy field for backward compatibility (will be populated from puzzle field)
  rebusPuzzle?: string;
}

export interface PuzzleAttempt {
  _id?: string;
  id: string;
  userId: string;
  puzzleId: string;
  attemptedAnswer: string;
  isCorrect: boolean;
  attemptedAt: Date;
  // Enhanced tracking for learning system
  timeSpentSeconds?: number; // Time spent before solving/abandoning
  hintsUsed?: number; // Number of hints used
  difficultyPerception?: number; // User-perceived difficulty (1-10, if collected)
  userSatisfaction?: number; // User satisfaction rating (1-5, if collected)
  abandoned?: boolean; // Whether user abandoned the puzzle
  completedAt?: Date; // When puzzle was completed (if solved)
}

export interface GameSession {
  _id?: string;
  id: string;
  userId: string;
  puzzleId: string;
  startTime: Date;
  endTime?: Date;
  score: number;
  completed: boolean;
  hintsUsed: number;
}

export interface BlogPost {
  _id?: string;
  id: string;
  title: string;
  slug: string;
  content: string;
  excerpt?: string;
  authorId: string;
  puzzleId: string;
  publishedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface Achievement {
  _id?: string;
  id: string;
  name: string;
  description: string;
  icon?: string;
  pointsAwarded: number;
  createdAt: Date;
}

export interface UserAchievement {
  _id?: string;
  id: string;
  userId: string;
  achievementId: string;
  unlockedAt: Date;
}

export interface Level {
  _id?: string;
  id: string;
  levelNumber: number;
  pointsRequired: number;
  createdAt: Date;
}

// Email subscription (replaces push subscription)
export interface EmailSubscription {
  _id?: string;
  id: string;
  userId?: string;
  email: string;
  enabled: boolean;
  lastSentAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

// In-app notification
export interface InAppNotification {
  _id?: string;
  id: string;
  userId: string;
  type: "puzzle_ready" | "streak_milestone" | "achievement" | "general";
  title: string;
  message: string;
  link?: string;
  read: boolean;
  createdAt: Date;
  readAt?: Date;
}

// Legacy push subscription (kept for migration)
export interface PushSubscription {
  _id?: string;
  id: string;
  userId?: string;
  endpoint: string;
  p256dh: string;
  auth: string;
  userAgent?: string;
  email?: string;
  sendWelcomeEmail?: boolean;
  createdAt: Date;
}

// New document types for creation
export interface NewUser {
  id: string;
  username: string;
  email: string;
  passwordHash: string;
  createdAt: Date;
  lastLogin?: Date;
}

export interface NewUserStats {
  id: string;
  userId: string;
  points: number;
  streak: number;
  totalGames: number;
  wins: number;
  level: number;
  dailyChallengeStreak: number;
  lastPlayDate?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface NewPuzzle {
  id: string;
  puzzle: string; // Generic puzzle field (was rebusPuzzle)
  puzzleType?: string; // Type of puzzle
  answer: string;
  difficulty: "easy" | "medium" | "hard" | number; // Support both string and number
  category?: string;
  explanation?: string;
  hints?: string[];
  publishedAt: Date;
  createdAt: Date;
  active: boolean;
  embedding?: number[]; // Vector embedding for semantic search
  metadata?: Record<string, unknown>;
  // Legacy field for backward compatibility
  rebusPuzzle?: string;
}

export interface NewPuzzleAttempt {
  id: string;
  userId: string;
  puzzleId: string;
  attemptedAnswer: string;
  isCorrect: boolean;
  attemptedAt: Date;
  // Enhanced tracking for learning system
  timeSpentSeconds?: number;
  hintsUsed?: number;
  difficultyPerception?: number;
  userSatisfaction?: number;
  abandoned?: boolean;
  completedAt?: Date;
}

export interface NewGameSession {
  id: string;
  userId: string;
  puzzleId: string;
  startTime: Date;
  endTime?: Date;
  score: number;
  completed: boolean;
  hintsUsed: number;
}

export interface NewBlogPost {
  id: string;
  title: string;
  slug: string;
  content: string;
  excerpt?: string;
  authorId: string;
  puzzleId: string;
  publishedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface NewAchievement {
  id: string;
  name: string;
  description: string;
  icon?: string;
  pointsAwarded: number;
  createdAt: Date;
}

export interface NewUserAchievement {
  id: string;
  userId: string;
  achievementId: string;
  unlockedAt: Date;
}

export interface NewLevel {
  id: string;
  levelNumber: number;
  pointsRequired: number;
  createdAt: Date;
}

export interface NewEmailSubscription {
  id: string;
  userId?: string;
  email: string;
  enabled: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface NewInAppNotification {
  id: string;
  userId: string;
  type: "puzzle_ready" | "streak_milestone" | "achievement" | "general";
  title: string;
  message: string;
  link?: string;
  read: boolean;
  createdAt: Date;
}

export interface NewPushSubscription {
  id: string;
  userId?: string;
  endpoint: string;
  p256dh: string;
  auth: string;
  userAgent?: string;
  email?: string;
  sendWelcomeEmail?: boolean;
  createdAt: Date;
}

// ============================================================================
// ANALYTICS MODELS
// ============================================================================

export interface AnalyticsEvent {
  _id?: string;
  id: string;
  userId?: string;
  sessionId: string;
  eventType: string;
  timestamp: Date;
  metadata: {
    puzzleId?: string;
    puzzleType?: string;
    difficulty?: string;
    attempts?: number;
    hintsUsed?: number;
    completionTime?: number;
    score?: number;
    [key: string]: any;
  };
}

export interface UserSession {
  _id?: string;
  id: string;
  userId?: string;
  startTime: Date;
  endTime?: Date;
  duration?: number;
  isReturningUser: boolean;
  events: string[]; // Event IDs
  puzzleIds: string[]; // Puzzles viewed
  createdAt: Date;
  updatedAt: Date;
}

export interface NewAnalyticsEvent {
  id: string;
  userId?: string;
  sessionId: string;
  eventType: string;
  timestamp: Date;
  metadata: {
    puzzleId?: string;
    puzzleType?: string;
    difficulty?: string;
    attempts?: number;
    hintsUsed?: number;
    completionTime?: number;
    score?: number;
    [key: string]: any;
  };
}

export interface NewUserSession {
  id: string;
  userId?: string;
  startTime: Date;
  endTime?: Date;
  duration?: number;
  isReturningUser: boolean;
  events: string[];
  puzzleIds: string[];
  createdAt: Date;
  updatedAt: Date;
}
