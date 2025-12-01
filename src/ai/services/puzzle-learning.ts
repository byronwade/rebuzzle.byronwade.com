/**
 * Puzzle Learning Service
 *
 * Analyzes user attempts and feedback to improve puzzle quality
 * and calibrate difficulty ratings
 */

import { z } from "zod";
import type { Puzzle, PuzzleAttempt } from "@/db/models";
import { getCollection } from "@/db/mongodb";
import { puzzleOps } from "@/db/operations";
import { generateAIObject } from "../client";

/**
 * Analyze puzzle performance based on user attempts
 * @param puzzleId Puzzle ID to analyze
 * @returns Performance metrics and insights
 */
export async function analyzePuzzlePerformance(puzzleId: string): Promise<{
  puzzleId: string;
  totalAttempts: number;
  solveRate: number;
  averageTimeToSolve: number;
  averageHintsUsed: number;
  abandonmentRate: number;
  difficultyRating: number;
  userSatisfaction: number;
  issues: string[];
  strengths: string[];
}> {
  const puzzle = await puzzleOps.findById(puzzleId);
  if (!puzzle) {
    throw new Error(`Puzzle not found: ${puzzleId}`);
  }

  const collection = getCollection<PuzzleAttempt>("puzzleAttempts");
  const attempts = await collection
    .find({ puzzleId })
    .sort({ attemptedAt: -1 })
    .toArray();

  if (attempts.length === 0) {
    return {
      puzzleId,
      totalAttempts: 0,
      solveRate: 0,
      averageTimeToSolve: 0,
      averageHintsUsed: 0,
      abandonmentRate: 0,
      difficultyRating: 0,
      userSatisfaction: 0,
      issues: ["No attempts recorded yet"],
      strengths: [],
    };
  }

  // Calculate metrics
  const totalAttempts = attempts.length;
  const solvedAttempts = attempts.filter((a) => a.isCorrect);
  const solveRate = solvedAttempts.length / totalAttempts;

  // Time metrics (only for solved puzzles)
  const solvedWithTime = solvedAttempts.filter(
    (a) => a.timeSpentSeconds && a.timeSpentSeconds > 0
  );
  const averageTimeToSolve =
    solvedWithTime.length > 0
      ? solvedWithTime.reduce((sum, a) => sum + (a.timeSpentSeconds || 0), 0) /
        solvedWithTime.length
      : 0;

  // Hints metrics
  const attemptsWithHints = attempts.filter(
    (a) => a.hintsUsed !== undefined && a.hintsUsed > 0
  );
  const averageHintsUsed =
    attemptsWithHints.length > 0
      ? attemptsWithHints.reduce((sum, a) => sum + (a.hintsUsed || 0), 0) /
        attemptsWithHints.length
      : 0;

  // Abandonment rate
  const abandoned = attempts.filter((a) => a.abandoned === true);
  const abandonmentRate = abandoned.length / totalAttempts;

  // Difficulty perception (average of user ratings)
  const attemptsWithDifficulty = attempts.filter(
    (a) => a.difficultyPerception !== undefined
  );
  const difficultyRating =
    attemptsWithDifficulty.length > 0
      ? attemptsWithDifficulty.reduce(
          (sum, a) => sum + (a.difficultyPerception || 0),
          0
        ) / attemptsWithDifficulty.length
      : 0;

  // User satisfaction
  const attemptsWithSatisfaction = attempts.filter(
    (a) => a.userSatisfaction !== undefined
  );
  const userSatisfaction =
    attemptsWithSatisfaction.length > 0
      ? attemptsWithSatisfaction.reduce(
          (sum, a) => sum + (a.userSatisfaction || 0),
          0
        ) / attemptsWithSatisfaction.length
      : 0;

  // Identify issues and strengths using AI
  const { issues, strengths } = await generatePerformanceInsights({
    puzzle,
    metrics: {
      solveRate,
      averageTimeToSolve,
      averageHintsUsed,
      abandonmentRate,
      difficultyRating,
      userSatisfaction,
      totalAttempts,
    },
    attempts: attempts.slice(0, 20), // Analyze recent attempts
  });

  return {
    puzzleId,
    totalAttempts,
    solveRate,
    averageTimeToSolve,
    averageHintsUsed,
    abandonmentRate,
    difficultyRating,
    userSatisfaction,
    issues,
    strengths,
  };
}

/**
 * Calculate actual difficulty based on user performance
 * @param puzzleId Puzzle ID
 * @returns Actual difficulty score (1-10)
 */
export async function calculateActualDifficulty(
  puzzleId: string
): Promise<number> {
  const performance = await analyzePuzzlePerformance(puzzleId);

  if (performance.totalAttempts < 5) {
    // Not enough data - return current difficulty or default
    const puzzle = await puzzleOps.findById(puzzleId);
    if (!puzzle) return 5;

    const numDifficulty =
      typeof puzzle.difficulty === "number"
        ? puzzle.difficulty
        : puzzle.difficulty === "easy"
          ? 3
          : puzzle.difficulty === "medium"
            ? 5
            : 7;
    return numDifficulty;
  }

  // Calculate actual difficulty based on metrics
  // Factors:
  // - Solve rate (lower = harder)
  // - Average time (longer = harder)
  // - Hints used (more = harder)
  // - Abandonment rate (higher = harder)
  // - User difficulty perception

  const solveRateFactor = (1 - performance.solveRate) * 5; // 0-5 scale
  const timeFactor = Math.min(performance.averageTimeToSolve / 120, 3); // 0-3 scale (120s = max)
  const hintsFactor = Math.min(performance.averageHintsUsed * 0.5, 2); // 0-2 scale
  const abandonmentFactor = performance.abandonmentRate * 2; // 0-2 scale
  const perceptionFactor = performance.difficultyRating || 0; // 0-10 scale

  // Weighted average
  const actualDifficulty =
    solveRateFactor * 0.2 +
    timeFactor * 0.15 +
    hintsFactor * 0.15 +
    abandonmentFactor * 0.1 +
    (perceptionFactor / 10) * 5 * 0.4; // Normalize perception to 0-5, then weight

  // Clamp to 1-10 range
  return Math.max(1, Math.min(10, Math.round(actualDifficulty * 2) / 2));
}

/**
 * Identify problematic puzzles that need improvement
 * @param minAttempts Minimum number of attempts to consider (default: 5)
 * @returns Array of problematic puzzles with issues
 */
export async function identifyProblematicPuzzles(minAttempts = 5): Promise<
  Array<{
    puzzleId: string;
    puzzle: Puzzle;
    issues: string[];
    severity: "low" | "medium" | "high";
  }>
> {
  const collection = getCollection<PuzzleAttempt>("puzzleAttempts");

  // Get puzzles with enough attempts
  const attemptCounts = await collection
    .aggregate([
      {
        $group: {
          _id: "$puzzleId",
          count: { $sum: 1 },
        },
      },
      {
        $match: {
          count: { $gte: minAttempts },
        },
      },
    ])
    .toArray();

  const problematicPuzzles: Array<{
    puzzleId: string;
    puzzle: Puzzle;
    issues: string[];
    severity: "low" | "medium" | "high";
  }> = [];

  for (const countDoc of attemptCounts) {
    const puzzleId = countDoc._id as string;
    const performance = await analyzePuzzlePerformance(puzzleId);
    const puzzle = await puzzleOps.findById(puzzleId);

    if (!puzzle || performance.issues.length === 0) continue;

    // Determine severity
    let severity: "low" | "medium" | "high" = "low";
    if (
      performance.solveRate < 0.3 ||
      performance.abandonmentRate > 0.5 ||
      performance.userSatisfaction < 2
    ) {
      severity = "high";
    } else if (
      performance.solveRate < 0.5 ||
      performance.abandonmentRate > 0.3 ||
      performance.userSatisfaction < 3
    ) {
      severity = "medium";
    }

    problematicPuzzles.push({
      puzzleId,
      puzzle,
      issues: performance.issues,
      severity,
    });
  }

  return problematicPuzzles.sort((a, b) => {
    const severityOrder = { high: 3, medium: 2, low: 1 };
    return severityOrder[b.severity] - severityOrder[a.severity];
  });
}

/**
 * Generate AI-powered improvement suggestions for a puzzle
 * @param puzzleId Puzzle ID
 * @returns Improvement suggestions
 */
export async function generateImprovementSuggestions(
  puzzleId: string
): Promise<{
  suggestions: Array<{
    category: string;
    suggestion: string;
    priority: "high" | "medium" | "low";
  }>;
  reasoning: string;
}> {
  const puzzle = await puzzleOps.findById(puzzleId);
  if (!puzzle) {
    throw new Error(`Puzzle not found: ${puzzleId}`);
  }

  const performance = await analyzePuzzlePerformance(puzzleId);

  const SuggestionSchema = z.object({
    suggestions: z.array(
      z.object({
        category: z.string(),
        suggestion: z.string(),
        priority: z.enum(["high", "medium", "low"]),
      })
    ),
    reasoning: z.string(),
  });

  const prompt = `Analyze this puzzle's performance and suggest improvements:

Puzzle: "${puzzle.puzzle}"
Answer: "${puzzle.answer}"
Category: "${puzzle.category || "general"}"
Difficulty: ${puzzle.difficulty}

Performance Metrics:
- Solve Rate: ${(performance.solveRate * 100).toFixed(1)}%
- Average Time to Solve: ${performance.averageTimeToSolve.toFixed(1)}s
- Average Hints Used: ${performance.averageHintsUsed.toFixed(1)}
- Abandonment Rate: ${(performance.abandonmentRate * 100).toFixed(1)}%
- User Difficulty Perception: ${performance.difficultyRating.toFixed(1)}/10
- User Satisfaction: ${performance.userSatisfaction.toFixed(1)}/5

Issues Identified:
${performance.issues.map((i) => `- ${i}`).join("\n")}

Strengths:
${performance.strengths.map((s) => `- ${s}`).join("\n")}

Provide specific, actionable suggestions to improve this puzzle. Focus on:
1. Difficulty calibration
2. Clarity and solvability
3. User engagement
4. Hint quality
5. Explanation improvements`;

  const result = await generateAIObject({
    prompt,
    system:
      "You are a puzzle quality expert. Analyze puzzle performance data and provide actionable improvement suggestions.",
    schema: SuggestionSchema,
    modelType: "smart",
  });

  return result;
}

/**
 * Generate performance insights using AI
 */
async function generatePerformanceInsights(params: {
  puzzle: Puzzle;
  metrics: {
    solveRate: number;
    averageTimeToSolve: number;
    averageHintsUsed: number;
    abandonmentRate: number;
    difficultyRating: number;
    userSatisfaction: number;
    totalAttempts: number;
  };
  attempts: PuzzleAttempt[];
}): Promise<{ issues: string[]; strengths: string[] }> {
  const InsightsSchema = z.object({
    issues: z.array(z.string()),
    strengths: z.array(z.string()),
  });

  const prompt = `Analyze puzzle performance and identify issues and strengths:

Puzzle: "${params.puzzle.puzzle}"
Answer: "${params.puzzle.answer}"
Category: "${params.puzzle.category || "general"}"

Metrics:
- Solve Rate: ${(params.metrics.solveRate * 100).toFixed(1)}%
- Average Time: ${params.metrics.averageTimeToSolve.toFixed(1)}s
- Average Hints: ${params.metrics.averageHintsUsed.toFixed(1)}
- Abandonment: ${(params.metrics.abandonmentRate * 100).toFixed(1)}%
- Difficulty Perception: ${params.metrics.difficultyRating.toFixed(1)}/10
- Satisfaction: ${params.metrics.userSatisfaction.toFixed(1)}/5
- Total Attempts: ${params.metrics.totalAttempts}

Recent Attempts Sample:
${params.attempts
  .slice(0, 10)
  .map(
    (a) =>
      `- ${a.isCorrect ? "Solved" : "Failed"} in ${a.timeSpentSeconds || "?"}s, ${a.hintsUsed || 0} hints`
  )
  .join("\n")}

Identify specific issues and strengths. Be concise and actionable.`;

  const result = await generateAIObject({
    prompt,
    system:
      "You are a puzzle analytics expert. Identify specific issues and strengths from performance data.",
    schema: InsightsSchema,
    modelType: "fast",
  });

  return result;
}

