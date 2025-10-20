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
  rebusPuzzle: string;
  answer: string;
  difficulty: 'easy' | 'medium' | 'hard';
  category?: string;
  explanation?: string;
  hints?: string[];
  publishedAt: Date;
  createdAt: Date;
  active: boolean;
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
  };
}

export interface PuzzleAttempt {
  _id?: string;
  id: string;
  userId: string;
  puzzleId: string;
  attemptedAnswer: string;
  isCorrect: boolean;
  attemptedAt: Date;
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
  rebusPuzzle: string;
  answer: string;
  difficulty: 'easy' | 'medium' | 'hard';
  category?: string;
  explanation?: string;
  hints?: string[];
  publishedAt: Date;
  createdAt: Date;
  active: boolean;
  metadata?: Record<string, any>;
}

export interface NewPuzzleAttempt {
  id: string;
  userId: string;
  puzzleId: string;
  attemptedAnswer: string;
  isCorrect: boolean;
  attemptedAt: Date;
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
