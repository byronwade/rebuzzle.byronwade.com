/**
 * Database Schema Types
 * 
 * This file defines TypeScript types for MongoDB collections
 * without using Drizzle ORM (since MongoDB support is incomplete)
 */

// Base types for MongoDB documents
export interface User {
  id: string
  username: string
  email: string
  passwordHash: string
  createdAt: Date
  lastLogin?: Date
}

export interface UserStats {
  id: string
  userId: string
  points: number
  streak: number
  totalGames: number
  wins: number
  level: number
  dailyChallengeStreak: number
  lastPlayDate?: Date
  createdAt: Date
  updatedAt: Date
}

export interface Puzzle {
  id: string
  rebusPuzzle: string
  answer: string
  difficulty: string
  category?: string
  publishedAt: Date
  createdAt: Date
  active: boolean
}

export interface PuzzleAttempt {
  id: string
  userId: string
  puzzleId: string
  attemptedAnswer: string
  isCorrect: boolean
  attemptedAt: Date
}

export interface GameSession {
  id: string
  userId: string
  puzzleId: string
  startTime: Date
  endTime?: Date
  score: number
  completed: boolean
  hintsUsed: number
}

export interface BlogPost {
  id: string
  title: string
  slug: string
  content: string
  excerpt?: string
  authorId: string
  puzzleId: string
  publishedAt: Date
  createdAt: Date
  updatedAt: Date
}

export interface Achievement {
  id: string
  name: string
  description: string
  icon?: string
  pointsAwarded: number
  createdAt: Date
}

export interface UserAchievement {
  id: string
  userId: string
  achievementId: string
  unlockedAt: Date
}

export interface Level {
  id: string
  levelNumber: number
  pointsRequired: number
  createdAt: Date
}

export interface PushSubscription {
  id: string
  userId?: string
  endpoint: string
  p256dh: string
  auth: string
  userAgent?: string
  createdAt: Date
}

// New document types for creation
export interface NewUser {
  id: string
  username: string
  email: string
  passwordHash: string
  createdAt: Date
  lastLogin?: Date
}

export interface NewUserStats {
  userId: string
  points: number
  streak: number
  totalGames: number
  wins: number
  level: number
  dailyChallengeStreak: number
  lastPlayDate?: Date
  createdAt: Date
  updatedAt: Date
}

export interface NewPuzzle {
  rebusPuzzle: string
  answer: string
  difficulty: string
  category?: string
  publishedAt: Date
  createdAt: Date
  active: boolean
}

export interface NewPuzzleAttempt {
  userId: string
  puzzleId: string
  attemptedAnswer: string
  isCorrect: boolean
  attemptedAt: Date
}

export interface NewGameSession {
  userId: string
  puzzleId: string
  startTime: Date
  endTime?: Date
  score: number
  completed: boolean
  hintsUsed: number
}

export interface NewBlogPost {
  title: string
  slug: string
  content: string
  excerpt?: string
  authorId: string
  puzzleId: string
  publishedAt: Date
  createdAt: Date
  updatedAt: Date
}

export interface NewAchievement {
  name: string
  description: string
  icon?: string
  pointsAwarded: number
  createdAt: Date
}

export interface NewUserAchievement {
  userId: string
  achievementId: string
  unlockedAt: Date
}

export interface NewLevel {
  levelNumber: number
  pointsRequired: number
  createdAt: Date
}

export interface NewPushSubscription {
  userId?: string
  endpoint: string
  p256dh: string
  auth: string
  userAgent?: string
  createdAt: Date
}