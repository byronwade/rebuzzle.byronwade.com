/**
 * Extended Database Schema for Advanced Puzzle System
 *
 * Additional tables for tracking:
 * - Puzzle uniqueness fingerprints
 * - Component usage patterns
 * - Player performance analytics
 * - Difficulty calibration data
 * - Quality metrics
 */

import {
  pgTable,
  uuid,
  text,
  timestamp,
  integer,
  real,
  jsonb,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core"
import { sql } from "drizzle-orm"
import { puzzles, users } from "./schema"

// ============================================================================
// PUZZLE UNIQUENESS TRACKING
// ============================================================================

/**
 * Puzzle fingerprints for deduplication
 */
export const puzzleFingerprints = pgTable("puzzle_fingerprints", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  puzzleId: uuid("puzzle_id").references(() => puzzles.id, { onDelete: "cascade" }),
  fingerprint: text("fingerprint").notNull().unique(),
  answerNormalized: text("answer_normalized").notNull(),
  emojiSignature: text("emoji_signature").notNull(),
  patternType: text("pattern_type").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  fingerprintIdx: uniqueIndex("puzzle_fingerprints_fingerprint_idx").on(table.fingerprint),
  answerIdx: index("puzzle_fingerprints_answer_idx").on(table.answerNormalized),
  emojiIdx: index("puzzle_fingerprints_emoji_idx").on(table.emojiSignature),
  patternIdx: index("puzzle_fingerprints_pattern_idx").on(table.patternType),
}))

/**
 * Component usage tracking (emojis, patterns)
 */
export const puzzleComponents = pgTable("puzzle_components", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  puzzleId: uuid("puzzle_id").references(() => puzzles.id, { onDelete: "cascade" }),
  componentType: text("component_type").notNull(), // emoji, text, number, arrow
  componentValue: text("component_value").notNull(),
  position: integer("position").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  componentIdx: index("puzzle_components_component_idx").on(table.componentType, table.componentValue),
  puzzleIdx: index("puzzle_components_puzzle_idx").on(table.puzzleId),
}))

// ============================================================================
// PLAYER PERFORMANCE ANALYTICS
// ============================================================================

/**
 * Detailed player performance per puzzle
 */
export const puzzlePerformance = pgTable("puzzle_performance", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  puzzleId: uuid("puzzle_id").notNull().references(() => puzzles.id, { onDelete: "cascade" }),
  userId: text("user_id"), // Nullable for anonymous players
  solved: integer("solved").notNull().default(0), // boolean as int
  attempts: integer("attempts").notNull(),
  hintsUsed: integer("hints_used").notNull().default(0),
  solveTimeSeconds: integer("solve_time_seconds"),
  perceivedDifficulty: integer("perceived_difficulty"), // Player's rating 1-10
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  puzzleIdx: index("puzzle_performance_puzzle_idx").on(table.puzzleId),
  userIdx: index("puzzle_performance_user_idx").on(table.userId),
  solvedIdx: index("puzzle_performance_solved_idx").on(table.solved),
  difficultyIdx: index("puzzle_performance_difficulty_idx").on(table.perceivedDifficulty),
}))

/**
 * Aggregated puzzle statistics
 */
export const puzzleStats = pgTable("puzzle_stats", {
  puzzleId: uuid("puzzle_id").primaryKey().references(() => puzzles.id, { onDelete: "cascade" }),
  totalAttempts: integer("total_attempts").notNull().default(0),
  totalSolved: integer("total_solved").notNull().default(0),
  totalFailed: integer("total_failed").notNull().default(0),
  avgSolveTime: real("avg_solve_time"),
  avgAttempts: real("avg_attempts"),
  avgHintsUsed: real("avg_hints_used"),
  avgPerceivedDifficulty: real("avg_perceived_difficulty"),
  successRate: real("success_rate"),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  successRateIdx: index("puzzle_stats_success_rate_idx").on(table.successRate),
  avgDifficultyIdx: index("puzzle_stats_avg_difficulty_idx").on(table.avgPerceivedDifficulty),
}))

// ============================================================================
// DIFFICULTY CALIBRATION DATA
// ============================================================================

/**
 * Difficulty calibration history
 */
export const difficultyCalibration = pgTable("difficulty_calibration", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  puzzleId: uuid("puzzle_id").references(() => puzzles.id, { onDelete: "cascade" }),
  proposedDifficulty: integer("proposed_difficulty").notNull(),
  calculatedDifficulty: integer("calculated_difficulty").notNull(),
  aiTestedDifficulty: integer("ai_tested_difficulty").notNull(),
  calibratedDifficulty: integer("calibrated_difficulty").notNull(),
  difficultyProfile: jsonb("difficulty_profile").$type<{
    visualAmbiguity: number
    cognitiveSteps: number
    culturalKnowledge: number
    vocabularyLevel: number
    patternNovelty: number
  }>(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  puzzleIdx: index("difficulty_calibration_puzzle_idx").on(table.puzzleId),
  calibratedIdx: index("difficulty_calibration_calibrated_idx").on(table.calibratedDifficulty),
}))

// ============================================================================
// QUALITY METRICS STORAGE
// ============================================================================

/**
 * Quality assurance results
 */
export const puzzleQualityMetrics = pgTable("puzzle_quality_metrics", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  puzzleId: uuid("puzzle_id").references(() => puzzles.id, { onDelete: "cascade" }),
  clarity: real("clarity").notNull(),
  creativity: real("creativity").notNull(),
  solvability: real("solvability").notNull(),
  appropriateness: real("appropriateness").notNull(),
  visualAppeal: real("visual_appeal").notNull(),
  educationalValue: real("educational_value").notNull(),
  funFactor: real("fun_factor").notNull(),
  overallScore: real("overall_score").notNull(),
  verdict: text("verdict").notNull(), // excellent, good, acceptable, needs_work, reject
  adversarialPassed: integer("adversarial_passed").notNull(), // boolean as int
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  puzzleIdx: index("puzzle_quality_metrics_puzzle_idx").on(table.puzzleId),
  overallIdx: index("puzzle_quality_metrics_overall_idx").on(table.overallScore),
  verdictIdx: index("puzzle_quality_metrics_verdict_idx").on(table.verdict),
}))

// ============================================================================
// GENERATION METADATA
// ============================================================================

/**
 * Track puzzle generation process
 */
export const puzzleGeneration = pgTable("puzzle_generation", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  puzzleId: uuid("puzzle_id").references(() => puzzles.id, { onDelete: "cascade" }),
  generationMethod: text("generation_method").notNull(), // chain_of_thought, ensemble, iterative, etc.
  iterationsNeeded: integer("iterations_needed").notNull().default(1),
  candidatesGenerated: integer("candidates_generated").notNull().default(1),
  finalQualityScore: real("final_quality_score").notNull(),
  uniquenessScore: real("uniqueness_score").notNull(),
  thinkingProcess: jsonb("thinking_process"),
  generationTimeMs: integer("generation_time_ms").notNull(),
  aiProvider: text("ai_provider").notNull(),
  aiModel: text("ai_model").notNull(),
  totalTokensUsed: integer("total_tokens_used"),
  estimatedCost: real("estimated_cost"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  puzzleIdx: index("puzzle_generation_puzzle_idx").on(table.puzzleId),
  methodIdx: index("puzzle_generation_method_idx").on(table.generationMethod),
  qualityIdx: index("puzzle_generation_quality_idx").on(table.finalQualityScore),
}))

// ============================================================================
// TYPE EXPORTS
// ============================================================================

export type PuzzleFingerprint = typeof puzzleFingerprints.$inferSelect
export type NewPuzzleFingerprint = typeof puzzleFingerprints.$inferInsert

export type PuzzleComponent = typeof puzzleComponents.$inferSelect
export type NewPuzzleComponent = typeof puzzleComponents.$inferInsert

export type PuzzlePerformance = typeof puzzlePerformance.$inferSelect
export type NewPuzzlePerformance = typeof puzzlePerformance.$inferInsert

export type PuzzleStats = typeof puzzleStats.$inferSelect
export type NewPuzzleStats = typeof puzzleStats.$inferInsert

export type DifficultyCalibration = typeof difficultyCalibration.$inferSelect
export type NewDifficultyCalibration = typeof difficultyCalibration.$inferInsert

export type PuzzleQualityMetrics = typeof puzzleQualityMetrics.$inferSelect
export type NewPuzzleQualityMetrics = typeof puzzleQualityMetrics.$inferInsert

export type PuzzleGeneration = typeof puzzleGeneration.$inferSelect
export type NewPuzzleGeneration = typeof puzzleGeneration.$inferInsert
