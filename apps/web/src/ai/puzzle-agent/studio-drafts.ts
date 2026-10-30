import type { ApexCandidate } from "./apex/types";
import { isKnownTechniqueId } from "./quality";
import type { PuzzleAgentResult } from "./schemas";
import type { TechniqueId } from "./technique-library";

/** Convert a successful Studio generation into the candidate shape used by rendered qualification. */
export function toStudioApexCandidate(result: PuzzleAgentResult, slot: number): ApexCandidate {
  const puzzle = result.puzzle;
  const techniqueId = isKnownTechniqueId(puzzle.techniqueId)
    ? (puzzle.techniqueId as TechniqueId)
    : ("simple_compound" as TechniqueId);

  return {
    id: `studio-candidate-${slot}`,
    rebusPuzzle: puzzle.rebusPuzzle,
    answer: puzzle.answer,
    difficulty: puzzle.difficulty,
    difficultyLevel: puzzle.difficultyLevel,
    explanation: puzzle.explanation,
    category: puzzle.category,
    hints: puzzle.hints,
    techniqueId,
    visual: puzzle.visual,
    fingerprint: result.metadata.fingerprint,
    uniquenessScore: result.metadata.uniquenessScore,
    noveltyEvidence: result.metadata.noveltyEvidence,
    calibratedDifficulty: result.metadata.calibratedDifficulty,
    inBand: true,
    isUnique: result.metadata.uniquenessScore >= 50,
    solvable: true,
    qualityOverall: result.metadata.qualityScore,
    funScore: result.metadata.funScore ?? 0,
    answerSeed: result.metadata.answerSeed,
    answerSeedCuePlan: result.metadata.answerSeedCuePlan,
    boardRecognitionConfidence: result.metadata.boardRecognitionConfidence,
    boardRecognitionModels: result.metadata.boardRecognitionModels,
    boardConceptVotes: result.metadata.boardConceptVotes,
    boardTextVotes: result.metadata.boardTextVotes,
    boardOperatorVotes: result.metadata.boardOperatorVotes,
    boardRecognitionProfiles: result.metadata.boardRecognitionProfiles,
    publishable: result.metadata.qualityVerdict !== "reject",
    rejectReasons: [],
  };
}
