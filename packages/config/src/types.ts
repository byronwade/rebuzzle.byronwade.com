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
  techniqueId?: string;
  visualStyleId?: string;
  funScore?: number;
  /** Player-authored rebus credit (Studio / community). */
  attribution?: {
    userId: string;
    username: string;
    submissionId: string;
    profilePath: string;
  };
  source?: string;
  communityPlayable?: boolean;
}

/** Free-canvas center as % of artboard (0–100). */
type LayerPositionFields = {
  x?: number;
  y?: number;
};

/** Generative board (custom pictograms / text / optional images). */
export type PuzzleVisualLayer =
  | ({
      kind: "pictogram";
      concept: string;
      role?: string;
      svg?: string;
      emojiFallback: string;
    } & LayerPositionFields)
  | ({
      kind: "text";
      content: string;
      emphasis?: "normal" | "large" | "small" | "strike" | "stacked" | "tiny";
    } & LayerPositionFields)
  | ({
      kind: "operator";
      symbol: string;
    } & LayerPositionFields)
  | ({
      kind: "image";
      prompt: string;
      alt: string;
      src?: string;
      concept?: string;
    } & LayerPositionFields);

export interface PuzzleVisual {
  styleId: "ink-pictogram-v1";
  mode: "composed" | "unicode" | "hybrid";
  layout: "row" | "stack" | "grid" | "overlay" | "free";
  layers: PuzzleVisualLayer[];
  unicodeFallback: string;
  caption?: string;
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
  /**
   * Correct answer — only present after the day is locked (game over)
   * or for trusted server-side consumers. Never send to an active board.
   */
  answer?: string;
  /** Explanation shown after solving */
  explanation: string;
  /** Difficulty level (1-10 scale) */
  difficulty: DifficultyLevel | number;
  /** Leaderboard entries for this puzzle */
  leaderboard: LeaderboardEntry[];
  /** Progressive hints */
  hints?: string[];
  /** Generative composed visual when Eve built a custom board */
  visual?: PuzzleVisual;
  /** Additional puzzle metadata */
  metadata?: PuzzleMetadata & {
    publishedAt?: string;
  };
  /** Whether the user has completed this puzzle */
  isCompleted?: boolean;
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
