/**
 * Game-domain helpers: daily lock, public puzzle shape, persist, results.
 */

export { buildWordResults, type WordResult } from "./build-word-results";
export {
  ARCHIVE_POINTS_MULTIPLIER,
  clampAttempts,
  clampHints,
  clampTimeSpent,
  getArchiveLockKey,
  getNextUtcMidnight,
  getUtcDayBounds,
  getUtcPuzzleDate,
  isArchiveLockKey,
  msUntilNextUtcMidnight,
} from "./daily-lock";
export { persistDailyPuzzle, type PersistDailyPuzzleInput } from "./persist-daily-puzzle";
export {
  type CanonicalDifficultyLevel,
  type PublishedPuzzlePayload,
  toLegacyDifficultyLabel,
} from "./published-puzzle";
export {
  hasSecretPuzzleFields,
  stripPuzzleAnswersFromList,
  toPublicPuzzle,
} from "./public-puzzle";
export {
  buildGuessReaction,
  getReactionTier,
  REACTION_TONE,
  type GuessReaction,
  type ReactionTier,
} from "./reactions";
export { getStreakTease } from "./streak-tease";
export {
  getLastPlayDay,
  getPlayDayCount,
  isComebackVisit,
  recordPlayDay,
  shouldPromptGuestSave,
} from "./play-days";
