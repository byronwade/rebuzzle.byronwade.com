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
  isGuest?: boolean; // True for anonymous guest accounts
  guestToken?: string; // Unique token for guest identification
  convertedFromGuestId?: string; // If converted from guest, stores original guest ID
  // Avatar preferences
  avatarColorIndex?: number; // Index into avatar color palette (0-9)
  avatarCustomInitials?: string; // Custom initials (1-2 characters)
  // IP-bound guest identification
  ipHash?: string; // SHA-256 hash of IP for privacy
  deviceId?: string; // For desktop/mobile app identification
  lastSeenIp?: string; // Last IP hash seen
  lastSeenAt?: Date; // When last seen
}

export interface UserStats {
  _id?: string;
  id: string;
  userId: string;
  points: number;
  streak: number;
  maxStreak: number; // Highest streak ever achieved
  totalGames: number;
  wins: number;
  level: number;
  dailyChallengeStreak: number;
  lastPlayDate?: Date;
  // Achievement tracking fields
  perfectSolves: number; // First attempt wins
  clutchSolves: number; // Last attempt wins
  speedSolves: number; // Under 30 second wins
  fastestSolveSeconds?: number; // Best time ever
  totalTimePlayed: number; // Total seconds played
  noHintStreak: number; // Current consecutive no-hint solves
  maxNoHintStreak: number; // Best no-hint streak
  consecutivePerfect: number; // Current consecutive perfect solves
  maxConsecutivePerfect: number; // Best perfect streak
  weekendSolves: number; // Weekend puzzle completions
  easyPuzzlesSolved: number;
  mediumPuzzlesSolved: number;
  hardPuzzlesSolved: number;
  sharedResults: number; // Times user shared results
  createdAt: Date;
  updatedAt: Date;
  // Streak protection fields (psychological engagement)
  streakFreezes: number; // Available streak freezes
  streakShields: number; // Earned streak shields from achievements
  lastFreezeUsed?: Date; // When last freeze was used
  streakFreezeWeekStart?: Date; // Start of current week for freeze reset
  // Lucky solve tracking
  lastLuckySolve?: Date; // When last lucky solve occurred
  luckySolveCount: number; // Total lucky solves earned
  // Bonus multiplier tracking
  lastBonusMultiplier?: number; // Last bonus multiplier received
  lastBonusDate?: Date; // Date of last bonus
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
  // Achievement tracking fields
  attemptNumber?: number; // Which attempt this was (1, 2, 3, etc.)
  maxAttempts?: number; // Total attempts allowed
  difficulty?: "easy" | "medium" | "hard"; // Puzzle difficulty category
  difficultyLevel?: number; // Numeric difficulty (1-10)
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

// Blog post FAQ item for structured data
export interface BlogFAQItem {
  question: string;
  answer: string;
}

// Blog post statistics from puzzle performance
export interface BlogPostStatistics {
  solveRate?: number; // Percentage of users who solved
  avgSolveTime?: number; // Average solve time in seconds
  totalAttempts?: number; // Total attempts across all users
  hintsUsedAvg?: number; // Average hints used
}

// Blog post structured sections for SEO
export interface BlogPostSections {
  introduction?: string; // 150-200 words
  puzzleAnalysis?: string; // 200-300 words
  solvingStrategy?: string; // 300-400 words
  puzzleHistory?: string; // 150-200 words
  statistics?: BlogPostStatistics;
  faq?: BlogFAQItem[]; // 3-5 Q&As for schema markup
}

// Blog post SEO metadata
export interface BlogPostSEOMetadata {
  focusKeyword: string;
  secondaryKeywords: string[];
  metaDescription: string;
  readingTime: number; // Minutes
  wordCount: number;
}

// Blog post puzzle origin/history
export interface BlogPostPuzzleOrigin {
  type: "classic" | "ai-generated" | "user-submitted" | "themed";
  inspiration?: string;
  history?: string;
  culturalContext?: string;
  creatorNotes?: string;
}

// Archive date helper for efficient timeline navigation
export interface BlogArchiveDate {
  year: number;
  month: number;
  day: number;
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
  // NEW: Structured content sections for SEO
  sections?: BlogPostSections;
  // NEW: SEO metadata
  seoMetadata?: BlogPostSEOMetadata;
  // NEW: Puzzle origin/history
  puzzleOrigin?: BlogPostPuzzleOrigin;
  // NEW: Archive navigation helpers
  archiveDate?: BlogArchiveDate;
  // NEW: Puzzle type for filtering (denormalized from puzzle)
  puzzleType?: string;
}

export interface Achievement {
  _id?: string;
  id: string;
  name: string;
  description: string;
  hint: string;
  icon: string;
  category: string;
  rarity: "common" | "uncommon" | "rare" | "epic" | "legendary";
  pointsAwarded: number;
  order: number;
  secret?: boolean;
  createdAt: Date;
}

export interface UserAchievement {
  _id?: string;
  id: string;
  userId: string;
  achievementId: string;
  unlockedAt: Date;
  notifiedByEmail: boolean;
  // Context about how it was earned
  context?: {
    puzzleId?: string;
    score?: number;
    streak?: number;
    timeTaken?: number;
    attempts?: number;
  };
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
  isGuest?: boolean;
  guestToken?: string;
  convertedFromGuestId?: string;
  // IP-bound guest identification
  ipHash?: string;
  deviceId?: string;
  lastSeenIp?: string;
  lastSeenAt?: Date;
}

export interface NewUserStats {
  id: string;
  userId: string;
  points: number;
  streak: number;
  maxStreak: number;
  totalGames: number;
  wins: number;
  level: number;
  dailyChallengeStreak: number;
  lastPlayDate?: Date;
  perfectSolves: number;
  clutchSolves: number;
  speedSolves: number;
  fastestSolveSeconds?: number;
  totalTimePlayed: number;
  noHintStreak: number;
  maxNoHintStreak: number;
  consecutivePerfect: number;
  maxConsecutivePerfect: number;
  weekendSolves: number;
  easyPuzzlesSolved: number;
  mediumPuzzlesSolved: number;
  hardPuzzlesSolved: number;
  sharedResults: number;
  createdAt: Date;
  updatedAt: Date;
  // Streak protection fields (psychological engagement)
  streakFreezes: number;
  streakShields: number;
  lastFreezeUsed?: Date;
  streakFreezeWeekStart?: Date;
  // Lucky solve tracking
  lastLuckySolve?: Date;
  luckySolveCount: number;
  // Bonus multiplier tracking
  lastBonusMultiplier?: number;
  lastBonusDate?: Date;
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
  // Achievement tracking fields
  attemptNumber?: number; // Which attempt this was (1, 2, 3, etc.)
  maxAttempts?: number; // Total attempts allowed
  difficulty?: "easy" | "medium" | "hard"; // Puzzle difficulty category
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
  // NEW: Structured content sections for SEO
  sections?: BlogPostSections;
  // NEW: SEO metadata
  seoMetadata?: BlogPostSEOMetadata;
  // NEW: Puzzle origin/history
  puzzleOrigin?: BlogPostPuzzleOrigin;
  // NEW: Archive navigation helpers
  archiveDate?: BlogArchiveDate;
  // NEW: Puzzle type for filtering
  puzzleType?: string;
}

export interface NewAchievement {
  id: string;
  name: string;
  description: string;
  hint: string;
  icon: string;
  category: string;
  rarity: "common" | "uncommon" | "rare" | "epic" | "legendary";
  pointsAwarded: number;
  order: number;
  secret?: boolean;
  createdAt: Date;
}

export interface NewUserAchievement {
  id: string;
  userId: string;
  achievementId: string;
  unlockedAt: Date;
  notifiedByEmail: boolean;
  context?: {
    puzzleId?: string;
    score?: number;
    streak?: number;
    timeTaken?: number;
    attempts?: number;
  };
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

// ============================================================================
// AI LEARNING SYSTEM MODELS
// ============================================================================

/**
 * Chain of Thought step in AI reasoning
 */
export interface AIChainOfThoughtStep {
  stepNumber: number;
  stepType: string; // 'concept', 'strategy', 'generation', 'validation', 'refinement'
  description: string;
  reasoning: string;
  metadata?: Record<string, unknown>;
  durationMs?: number;
}

/**
 * Quality metrics for AI-generated content
 */
export interface AIQualityMetrics {
  score: number; // 0-100
  verdict: "publish" | "revise" | "reject";
  strengths: string[];
  weaknesses: string[];
  improvements: string[];
  adversarialResults?: {
    attacks: Array<{
      attackType: string;
      issue: string;
      severity: "critical" | "major" | "minor";
    }>;
    robustnessScore: number;
    passed: boolean;
  };
}

/**
 * Difficulty calibration profile
 */
export interface AIDifficultyProfile {
  visualAmbiguity: number; // 1-10
  cognitiveSteps: number; // 1-10
  culturalKnowledge: number; // 1-10
  vocabularyLevel: number; // 1-10
  patternNovelty: number; // 1-10
}

/**
 * AI Decision - stores every AI decision with full context
 */
export interface AIDecision {
  _id?: string;
  id: string;

  // Core identification
  decisionType:
    | "puzzle_generation"
    | "hint_generation"
    | "quality_evaluation"
    | "difficulty_calibration"
    | "user_recommendation"
    | "answer_validation"
    | "blog_generation";
  operationId: string; // Groups related decisions (e.g., all steps in puzzle generation)
  sessionId?: string; // Links to user session if applicable
  userId?: string; // User who triggered this (admin or end user)

  // Timing
  timestamp: Date;
  durationMs: number;

  // Model details
  provider: string; // 'gateway', 'google', 'groq', etc.
  model: string; // 'google/gemini-2.0-flash', etc.
  modelType: "fast" | "smart" | "creative";

  // Input/Output
  input: {
    prompt: string;
    systemPrompt?: string;
    parameters: Record<string, unknown>; // temperature, schema, etc.
    context?: Record<string, unknown>; // user profile, puzzle context, etc.
  };
  output: {
    success: boolean;
    result?: unknown; // The actual AI output
    error?: string;
    errorCode?: string;
  };

  // Chain of Thought
  chainOfThought?: {
    steps: AIChainOfThoughtStep[];
    thinking?: unknown; // Raw thinking from generateWithChainOfThought
    layers?: string[]; // Multi-layer reasoning
    challengeElements?: string[];
  };

  // Token usage
  tokens: {
    prompt: number;
    completion: number;
    total: number;
    cost: number; // Calculated cost in USD
  };

  // Quality metrics (if applicable)
  qualityMetrics?: AIQualityMetrics;

  // Difficulty calibration (if applicable)
  difficultyCalibration?: {
    proposed: number;
    calculated: number;
    calibrated: number;
    profile: AIDifficultyProfile;
  };

  // Uniqueness metrics (if applicable)
  uniquenessMetrics?: {
    fingerprint: string;
    score: number;
    isUnique: boolean;
    similarPuzzles?: Array<{
      puzzleId: string;
      similarity: number;
    }>;
  };

  // Fallback tracking
  fallbackChain?: Array<{
    model: string;
    attempted: boolean;
    success: boolean;
    error?: string;
    durationMs?: number;
  }>;

  // Reference to created entity
  entityType?: "puzzle" | "hint" | "blogPost";
  entityId?: string;

  // For learning feedback
  feedbackReceived?: boolean;

  createdAt: Date;
}

/**
 * AI Error - dedicated error tracking for pattern analysis
 */
export interface AIError {
  _id?: string;
  id: string;

  // Error identification
  errorCode: string; // 'QUOTA_EXCEEDED', 'MODEL_NOT_FOUND', 'VALIDATION_FAILED', etc.
  errorType: "provider" | "validation" | "quality" | "generation" | "timeout" | "unknown";
  severity: "critical" | "major" | "minor" | "warning";

  // Context
  decisionId?: string; // Link to aiDecisions
  operationId: string;
  decisionType: string;
  provider: string;
  model: string;

  // Error details
  message: string;
  stackTrace?: string;
  rawError?: unknown;

  // Input that caused the error
  input?: {
    prompt?: string;
    parameters?: Record<string, unknown>;
  };

  // Resolution
  resolved: boolean;
  resolution?: {
    action: "retry_succeeded" | "fallback_succeeded" | "manual_fix" | "ignored" | "config_changed";
    resolvedAt?: Date;
    notes?: string;
  };

  // Patterns
  tags: string[]; // For categorization: ['quota', 'rebus', 'high_difficulty']

  timestamp: Date;
  createdAt: Date;
}

/**
 * AI Feedback - user feedback on AI outputs
 */
export interface AIFeedback {
  _id?: string;
  id: string;

  // Links
  decisionId?: string; // Link to AI decision that created this
  puzzleId?: string;
  userId: string;

  // Feedback type
  feedbackType: "puzzle_quality" | "hint_helpfulness" | "difficulty_accuracy" | "answer_validation";

  // Ratings
  rating: number; // 1-5 stars
  satisfaction: number; // 1-5

  // Specific metrics
  metrics?: {
    tooEasy?: boolean;
    tooHard?: boolean;
    unclear?: boolean;
    unfair?: boolean;
    creative?: boolean;
    boring?: boolean;
    hintTooVague?: boolean;
    hintTooObvious?: boolean;
  };

  // Free text
  comment?: string;

  // User performance context
  context: {
    timeSpentSeconds: number;
    hintsUsed: number;
    attemptNumber: number;
    solved: boolean;
    difficultyPerception?: number; // User-perceived difficulty 1-10
  };

  // For learning
  processedForLearning: boolean;
  learningImpact?: {
    appliedAt?: Date;
    adjustmentType?: string;
    adjustmentValue?: number;
  };

  timestamp: Date;
  createdAt: Date;
}

/**
 * AI Configuration - versioned AI config with A/B testing
 */
export interface AIConfiguration {
  _id?: string;
  id: string;

  // Version info
  version: string; // Semantic versioning: '1.2.0'
  name: string; // Human-readable name
  description: string;

  // Configuration
  config: {
    // Model selection
    models: {
      fast: string;
      smart: string;
      creative: string;
    };
    fallbackChain: {
      fast: string[];
      smart: string[];
      creative: string[];
    };

    // Generation parameters
    generation: {
      temperature: {
        factual: number;
        balanced: number;
        creative: number;
      };
      maxTokens: {
        short: number;
        medium: number;
        long: number;
      };
    };

    // Quality thresholds
    quality: {
      publishThreshold: number;
      revisionThreshold: number;
      rejectThreshold: number;
      skipAdversarialBelow: number;
    };

    // Prompt templates
    prompts: {
      puzzleGeneration?: {
        system: string;
        user: string;
      };
      hintGeneration?: {
        system: string;
        user: string;
      };
      qualityEvaluation?: {
        system: string;
        user: string;
      };
    };

    // Feature flags
    features: {
      chainOfThought: boolean;
      agentOrchestration: boolean;
      semanticSearch: boolean;
      learningFeedback: boolean;
    };
  };

  // A/B Testing
  abTest?: {
    testId: string;
    testName: string;
    variant: "A" | "B" | "C";
    trafficPercentage: number;
    startDate: Date;
    endDate?: Date;
  };

  // Status
  status: "draft" | "active" | "testing" | "archived";
  isDefault: boolean;

  // Audit
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
  activatedAt?: Date;
  deactivatedAt?: Date;

  // Performance metrics (aggregated)
  metrics?: {
    totalDecisions: number;
    successRate: number;
    avgQualityScore: number;
    avgTokensPerDecision: number;
    avgCost: number;
    avgLatencyMs: number;
    userSatisfaction: number;
  };
}

/**
 * AI Learning Event - tracks how feedback influences AI
 */
export interface AILearningEvent {
  _id?: string;
  id: string;

  // Learning type
  eventType:
    | "threshold_adjustment"
    | "prompt_optimization"
    | "model_selection"
    | "difficulty_calibration"
    | "pattern_learned";

  // Source
  feedbackIds: string[]; // Feedback that triggered this
  aggregationType: "single" | "batch" | "trend";

  // Change
  change: {
    parameter: string; // What was changed
    oldValue: unknown;
    newValue: unknown;
    reason: string;
    confidence: number; // 0-1 confidence in this change
  };

  // Impact
  expectedImpact: {
    qualityImprovement?: number;
    satisfactionImprovement?: number;
    costReduction?: number;
  };

  actualImpact?: {
    measurementPeriod: { start: Date; end: Date };
    qualityChange: number;
    satisfactionChange: number;
    costChange: number;
  };

  // Status
  status: "proposed" | "approved" | "applied" | "reverted";
  appliedToConfigId?: string;

  timestamp: Date;
  createdAt: Date;
}

// ============================================================================
// AI LEARNING SYSTEM - NEW DOCUMENT TYPES
// ============================================================================

export interface NewAIDecision {
  id: string;
  decisionType: AIDecision["decisionType"];
  operationId: string;
  sessionId?: string;
  userId?: string;
  timestamp: Date;
  durationMs: number;
  provider: string;
  model: string;
  modelType: AIDecision["modelType"];
  input: AIDecision["input"];
  output: AIDecision["output"];
  chainOfThought?: AIDecision["chainOfThought"];
  tokens: AIDecision["tokens"];
  qualityMetrics?: AIQualityMetrics;
  difficultyCalibration?: AIDecision["difficultyCalibration"];
  uniquenessMetrics?: AIDecision["uniquenessMetrics"];
  fallbackChain?: AIDecision["fallbackChain"];
  entityType?: AIDecision["entityType"];
  entityId?: string;
  feedbackReceived?: boolean;
  createdAt: Date;
}

export interface NewAIError {
  id: string;
  errorCode: string;
  errorType: AIError["errorType"];
  severity: AIError["severity"];
  decisionId?: string;
  operationId: string;
  decisionType: string;
  provider: string;
  model: string;
  message: string;
  stackTrace?: string;
  rawError?: unknown;
  input?: AIError["input"];
  resolved: boolean;
  resolution?: AIError["resolution"];
  tags: string[];
  timestamp: Date;
  createdAt: Date;
}

export interface NewAIFeedback {
  id: string;
  decisionId?: string;
  puzzleId?: string;
  userId: string;
  feedbackType: AIFeedback["feedbackType"];
  rating: number;
  satisfaction: number;
  metrics?: AIFeedback["metrics"];
  comment?: string;
  context: AIFeedback["context"];
  processedForLearning: boolean;
  learningImpact?: AIFeedback["learningImpact"];
  timestamp: Date;
  createdAt: Date;
}

export interface NewAIConfiguration {
  id: string;
  version: string;
  name: string;
  description: string;
  config: AIConfiguration["config"];
  abTest?: AIConfiguration["abTest"];
  status: AIConfiguration["status"];
  isDefault: boolean;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
  activatedAt?: Date;
  deactivatedAt?: Date;
  metrics?: AIConfiguration["metrics"];
}

export interface NewAILearningEvent {
  id: string;
  eventType: AILearningEvent["eventType"];
  feedbackIds: string[];
  aggregationType: AILearningEvent["aggregationType"];
  change: AILearningEvent["change"];
  expectedImpact: AILearningEvent["expectedImpact"];
  actualImpact?: AILearningEvent["actualImpact"];
  status: AILearningEvent["status"];
  appliedToConfigId?: string;
  timestamp: Date;
  createdAt: Date;
}
