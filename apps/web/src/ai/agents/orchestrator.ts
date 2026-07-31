/**
 * Legacy multi-agent orchestrator — superseded by Eve ToolLoopAgent.
 * Kept as a thin re-export so older imports keep working.
 */

import { generateMasterPuzzle } from "../services/master-puzzle-orchestrator";

/**
 * @deprecated Prefer `generateMasterPuzzle` (Eve tool agent + AI Gateway).
 */
export async function orchestratePuzzleGeneration(params: {
  targetDifficulty: number;
  category?: string;
  theme?: string;
  puzzleType?: string;
  requireNovelty?: boolean;
  userId?: string;
}) {
  const result = await generateMasterPuzzle(params);
  return {
    puzzle: result.puzzle,
    qualityScore: result.metadata.qualityMetrics.scores.overall,
    reasoning: result.metadata.qualityMetrics.detailedFeedback,
    suggestions: result.recommendations,
    metadata: {
      fingerprint: result.metadata.fingerprint,
      uniquenessScore: result.metadata.uniquenessScore,
      difficultyProfile: result.metadata.difficultyProfile,
      calibratedDifficulty: result.metadata.calibratedDifficulty,
      qualityMetrics: result.metadata.qualityMetrics,
      aiThinking: result.metadata.aiThinking,
    },
    isUnique: result.metadata.uniquenessScore > 0,
  };
}
