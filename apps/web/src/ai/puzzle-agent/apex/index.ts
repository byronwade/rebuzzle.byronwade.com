/**
 * Apex — next-gen puzzle generation engine.
 */

export { buildGenerationBrief } from "./curriculum";
export { critiqueCandidate } from "./critique";
export { loadDiversitySnapshot } from "./diversity-memory";
export { runApexGeneration } from "./engine";
export { loadLearningDigest } from "./learning-context";
export { phraseBankSize, samplePhraseBank } from "./phrase-bank";
export { applyPlayerSimHeuristics, simulatePlayerSolve } from "./player-sim";
export { candidateNeedsVisualPolish } from "./polish-gates";
export { polishCandidateVisuals } from "./polish-visuals";
export { scoreRubric, tournamentScore } from "./rubric";
export { pickWinner, rankCandidates } from "./tournament";
export type {
  ApexCandidate,
  ApexEngineResult,
  CritiqueResult,
  DiversitySnapshot,
  GenerationBrief,
  LearningDigest,
  PhraseBankEntry,
  PlayerSimResult,
  RubricScores,
} from "./types";
