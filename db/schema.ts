/**
 * Drizzle ORM Schema Definition
 *
 * This schema provides:
 * - Type-safe database operations
 * - Proper indexing for performance
 * - Clear relationships between entities
 * - Optimized for PostgreSQL
 */

import {
  pgTable,
  uuid,
  text,
  timestamp,
  integer,
  boolean,
  jsonb,
  index,
  uniqueIndex,
  foreignKey,
  primaryKey
} from "drizzle-orm/pg-core"
import { relations } from "drizzle-orm"
import { sql } from "drizzle-orm"

// ============================================================================
// USER MANAGEMENT
// ============================================================================

export const users = pgTable("users", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  lastLogin: timestamp("last_login", { withTimezone: true }),
}, (table) => ({
  // Indexes for common queries
  emailIdx: index("users_email_idx").on(table.email),
  usernameIdx: index("users_username_idx").on(table.username),
  createdAtIdx: index("users_created_at_idx").on(table.createdAt),
}))

export const userStats = pgTable("user_stats", {
  userId: uuid("user_id").primaryKey().references(() => users.id, { onDelete: "cascade" }),
  points: integer("points").notNull().default(0),
  streak: integer("streak").notNull().default(0),
  totalGames: integer("total_games").notNull().default(0),
  wins: integer("wins").notNull().default(0),
  level: integer("level").notNull().default(1),
  dailyChallengeStreak: integer("daily_challenge_streak").notNull().default(0),
  lastPlayDate: timestamp("last_play_date", { withTimezone: true }),
}, (table) => ({
  // Indexes for leaderboard queries
  pointsIdx: index("user_stats_points_idx").on(table.points),
  streakIdx: index("user_stats_streak_idx").on(table.streak),
  levelIdx: index("user_stats_level_idx").on(table.level),
}))

// ============================================================================
// PUZZLES
// ============================================================================

export const puzzles = pgTable("puzzles", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  rebusPuzzle: text("rebus_puzzle").notNull(),
  answer: text("answer").notNull(),
  explanation: text("explanation").notNull(),
  difficulty: integer("difficulty").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  scheduledFor: timestamp("scheduled_for", { withTimezone: true }).notNull().unique(),
  metadata: jsonb("metadata").$type<{
    hints?: string[]
    topic?: string
    keyword?: string
    category?: string
    seoMetadata?: {
      keywords: string[]
      description: string
      ogTitle: string
      ogDescription: string
    }
  }>(),
}, (table) => ({
  // Critical index for finding today's puzzle
  scheduledForIdx: uniqueIndex("puzzles_scheduled_for_idx").on(table.scheduledFor),
  // Index for finding puzzles by difficulty
  difficultyIdx: index("puzzles_difficulty_idx").on(table.difficulty),
  // Index for chronological queries
  createdAtIdx: index("puzzles_created_at_idx").on(table.createdAt),
}))

export const puzzleAttempts = pgTable("puzzle_attempts", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  puzzleId: uuid("puzzle_id").notNull().references(() => puzzles.id, { onDelete: "cascade" }),
  answer: text("answer").notNull(),
  correct: boolean("correct").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  // Composite index for user puzzle history
  userPuzzleIdx: index("puzzle_attempts_user_puzzle_idx").on(table.userId, table.puzzleId),
  // Index for finding recent attempts
  createdAtIdx: index("puzzle_attempts_created_at_idx").on(table.createdAt),
  // Index for correct answers analytics
  correctIdx: index("puzzle_attempts_correct_idx").on(table.correct),
}))

// ============================================================================
// GAME SESSIONS
// ============================================================================

export const gameSessions = pgTable("game_sessions", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  puzzleId: uuid("puzzle_id").notNull().references(() => puzzles.id, { onDelete: "cascade" }),
  startTime: timestamp("start_time", { withTimezone: true }).notNull().defaultNow(),
  endTime: timestamp("end_time", { withTimezone: true }),
  attempts: integer("attempts").notNull().default(0),
  isSolved: boolean("is_solved").notNull().default(false),
}, (table) => ({
  // Composite index for user sessions
  userPuzzleIdx: index("game_sessions_user_puzzle_idx").on(table.userId, table.puzzleId),
  // Index for active sessions
  endTimeIdx: index("game_sessions_end_time_idx").on(table.endTime),
  // Index for analytics
  solvedIdx: index("game_sessions_is_solved_idx").on(table.isSolved),
}))

// ============================================================================
// ACHIEVEMENTS
// ============================================================================

export const achievements = pgTable("achievements", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description").notNull(),
  threshold: integer("threshold").notNull(),
}, (table) => ({
  thresholdIdx: index("achievements_threshold_idx").on(table.threshold),
}))

export const userAchievements = pgTable("user_achievements", {
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  achievementId: text("achievement_id").notNull().references(() => achievements.id, { onDelete: "cascade" }),
  unlockedAt: timestamp("unlocked_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  pk: primaryKey({ columns: [table.userId, table.achievementId] }),
  // Index for user achievement queries
  userIdx: index("user_achievements_user_idx").on(table.userId),
  // Index for achievement distribution analytics
  achievementIdx: index("user_achievements_achievement_idx").on(table.achievementId),
}))

// ============================================================================
// BLOG POSTS
// ============================================================================

export const blogPosts = pgTable("blog_posts", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  slug: text("slug").notNull().unique(),
  title: text("title").notNull(),
  content: text("content").notNull(),
  excerpt: text("excerpt").notNull(),
  authorId: uuid("author_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  publishedAt: timestamp("published_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  metadata: jsonb("metadata"),
  puzzleId: uuid("puzzle_id").notNull().unique().references(() => puzzles.id, { onDelete: "cascade" }),
}, (table) => ({
  slugIdx: uniqueIndex("blog_posts_slug_idx").on(table.slug),
  authorIdx: index("blog_posts_author_idx").on(table.authorId),
  publishedAtIdx: index("blog_posts_published_at_idx").on(table.publishedAt),
  puzzleIdx: uniqueIndex("blog_posts_puzzle_idx").on(table.puzzleId),
}))

// ============================================================================
// LEVELS
// ============================================================================

export const levels = pgTable("levels", {
  level: integer("level").primaryKey(),
  name: text("name").notNull(),
  threshold: integer("threshold").notNull(),
}, (table) => ({
  thresholdIdx: index("levels_threshold_idx").on(table.threshold),
}))

// ============================================================================
// PUSH NOTIFICATIONS
// ============================================================================

export const pushSubscriptions = pgTable("push_subscriptions", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  // Changed from String to UUID for consistency and potential future foreign key
  userId: text("user_id").notNull(),
  endpoint: text("endpoint").notNull(),
  auth: text("auth").notNull(),
  p256dh: text("p256dh").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  // Composite unique constraint for user + endpoint
  userEndpointIdx: uniqueIndex("push_subscriptions_user_endpoint_idx").on(table.userId, table.endpoint),
  // Index for finding user subscriptions
  userIdx: index("push_subscriptions_user_idx").on(table.userId),
  // Index for cleanup of old subscriptions
  updatedAtIdx: index("push_subscriptions_updated_at_idx").on(table.updatedAt),
}))

// ============================================================================
// RELATIONS (for Drizzle Query API)
// ============================================================================

export const usersRelations = relations(users, ({ one, many }) => ({
  stats: one(userStats, {
    fields: [users.id],
    references: [userStats.userId],
  }),
  achievements: many(userAchievements),
  gameSessions: many(gameSessions),
  puzzleAttempts: many(puzzleAttempts),
  blogPosts: many(blogPosts),
}))

export const userStatsRelations = relations(userStats, ({ one }) => ({
  user: one(users, {
    fields: [userStats.userId],
    references: [users.id],
  }),
}))

export const puzzlesRelations = relations(puzzles, ({ one, many }) => ({
  blogPost: one(blogPosts, {
    fields: [puzzles.id],
    references: [blogPosts.puzzleId],
  }),
  gameSessions: many(gameSessions),
  attempts: many(puzzleAttempts),
}))

export const puzzleAttemptsRelations = relations(puzzleAttempts, ({ one }) => ({
  user: one(users, {
    fields: [puzzleAttempts.userId],
    references: [users.id],
  }),
  puzzle: one(puzzles, {
    fields: [puzzleAttempts.puzzleId],
    references: [puzzles.id],
  }),
}))

export const gameSessionsRelations = relations(gameSessions, ({ one }) => ({
  user: one(users, {
    fields: [gameSessions.userId],
    references: [users.id],
  }),
  puzzle: one(puzzles, {
    fields: [gameSessions.puzzleId],
    references: [puzzles.id],
  }),
}))

export const achievementsRelations = relations(achievements, ({ many }) => ({
  users: many(userAchievements),
}))

export const userAchievementsRelations = relations(userAchievements, ({ one }) => ({
  user: one(users, {
    fields: [userAchievements.userId],
    references: [users.id],
  }),
  achievement: one(achievements, {
    fields: [userAchievements.achievementId],
    references: [achievements.id],
  }),
}))

export const blogPostsRelations = relations(blogPosts, ({ one }) => ({
  author: one(users, {
    fields: [blogPosts.authorId],
    references: [users.id],
  }),
  puzzle: one(puzzles, {
    fields: [blogPosts.puzzleId],
    references: [puzzles.id],
  }),
}))

// ============================================================================
// TYPE EXPORTS
// ============================================================================

export type User = typeof users.$inferSelect
export type NewUser = typeof users.$inferInsert

export type UserStats = typeof userStats.$inferSelect
export type NewUserStats = typeof userStats.$inferInsert

export type Puzzle = typeof puzzles.$inferSelect
export type NewPuzzle = typeof puzzles.$inferInsert

export type PuzzleAttempt = typeof puzzleAttempts.$inferSelect
export type NewPuzzleAttempt = typeof puzzleAttempts.$inferInsert

export type GameSession = typeof gameSessions.$inferSelect
export type NewGameSession = typeof gameSessions.$inferInsert

export type Achievement = typeof achievements.$inferSelect
export type NewAchievement = typeof achievements.$inferInsert

export type UserAchievement = typeof userAchievements.$inferSelect
export type NewUserAchievement = typeof userAchievements.$inferInsert

export type BlogPost = typeof blogPosts.$inferSelect
export type NewBlogPost = typeof blogPosts.$inferInsert

export type Level = typeof levels.$inferSelect
export type NewLevel = typeof levels.$inferInsert

export type PushSubscription = typeof pushSubscriptions.$inferSelect
export type NewPushSubscription = typeof pushSubscriptions.$inferInsert
