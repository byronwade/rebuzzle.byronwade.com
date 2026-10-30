/** Strip solutions and internal review notes before sending puzzles to clients. */
type LoosePuzzle = Record<string, unknown>;

const SECRET_KEYS = [
  "answer",
  "explanation",
  "keyword",
  "seoMetadata",
  "embedding",
  "fallbackReason",
  "reasoningEvidence",
  "playabilityEvidence",
  "answerKey",
  "answerSeed",
  "answerResearch",
] as const;
type SecretKey = (typeof SECRET_KEYS)[number];

// Publication metadata is private by default: review evidence can contain the
// complete solution even when its field is not named "answer".
const PUBLIC_METADATA_KEYS = [
  "topic",
  "category",
  "puzzleType",
  "difficultyScore",
  "difficultyLevel",
  "visualStyleId",
  "aiGenerated",
  "source",
  "attribution",
  "communityPlayable",
  "likes",
  "dislikes",
] as const;

/** Public shape safe for an active (unsolved) daily board. */
export function toPublicPuzzle<T extends LoosePuzzle>(puzzle: T): Omit<T, SecretKey> {
  const publicPuzzle: LoosePuzzle = { ...puzzle };
  for (const key of SECRET_KEYS) delete publicPuzzle[key];
  if (publicPuzzle.metadata && typeof publicPuzzle.metadata === "object") {
    const metadata = publicPuzzle.metadata as LoosePuzzle;
    publicPuzzle.metadata = Object.fromEntries(
      PUBLIC_METADATA_KEYS.filter((key) => key in metadata).map((key) => [key, metadata[key]])
    );
  }
  return publicPuzzle as Omit<T, SecretKey>;
}
