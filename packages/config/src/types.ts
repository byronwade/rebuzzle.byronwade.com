/**
 * Shared Types for Rebuzzle
 *
 * Platform-agnostic type definitions used across all apps.
 */

/** Difficulty levels for puzzles */
export type Difficulty = "easy" | "medium" | "hard";

/** Numeric difficulty scale (1-10) */
export type DifficultyLevel = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10;

/** All supported puzzle types */
export type PuzzleType =
  | "rebus"
  | "logic-grid"
  | "cryptic-crossword"
  | "word-puzzle"
  | "riddle"
  | "trivia"
  | "pattern-recognition"
  | "number-sequence"
  | "caesar-cipher";

export interface LeaderboardEntry {
  name: string;
  correctAnswers: number[];
}

export interface PuzzleMetadata {
  topic?: string;
  keyword?: string;
  category?: string;
  relevanceScore?: number;
  generatedAt?: string;
  version?: string;
  hints?: string[];
  seoMetadata?: {
    title?: string;
    description?: string;
    keywords?: string[];
  };
  qualityScore?: number;
}

export interface BlogPostReference {
  title?: string;
  slug?: string;
  publishedAt?: Date;
}

export interface GameData {
  /** Unique puzzle identifier */
  id: string;
  /** Puzzle content to display (supports all puzzle types) */
  puzzle: string;
  /** Type of puzzle for rendering and validation */
  puzzleType?: PuzzleType;
  /** Correct answer to the puzzle */
  answer: string;
  /** Explanation shown after solving */
  explanation: string;
  /** Difficulty level (1-10 scale) */
  difficulty: DifficultyLevel | number;
  /** Leaderboard entries for this puzzle */
  leaderboard: LeaderboardEntry[];
  /** Progressive hints */
  hints?: string[];
  /** Additional puzzle metadata */
  metadata?: PuzzleMetadata & {
    publishedAt?: string;
  };
  /** Whether the user has completed this puzzle */
  isCompleted?: boolean;
  /** Whether to redirect (e.g., already completed) */
  shouldRedirect?: boolean;
  /** Associated blog post */
  blogPost?: BlogPostReference | null;
  /**
   * @deprecated Use `puzzle` field instead
   */
  rebusPuzzle?: string;
  /**
   * @deprecated Use metadata.publishedAt instead
   */
  publishedAt?: string;
}

/** User profile data */
export interface UserProfile {
  id: string;
  email: string;
  name: string;
  avatarUrl?: string;
  totalPoints: number;
  level: number;
  currentStreak: number;
  longestStreak: number;
  puzzlesSolved: number;
  createdAt: Date;
  updatedAt: Date;
}

/** Game state for the current session */
export interface GameState {
  puzzleId: string;
  attempts: number;
  hintsUsed: number;
  startTime: number;
  isComplete: boolean;
  isCorrect: boolean;
  guesses: string[];
}

/** Achievement definition */
export interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  unlockedAt?: Date;
  progress?: number;
  target?: number;
}
