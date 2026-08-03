/**
 * Strip solution fields from puzzle payloads before sending to clients.
 */

type LoosePuzzle = Record<string, unknown>;

const SECRET_KEYS = new Set([
  "answer",
  "explanation",
  "keyword",
  "seoMetadata",
  "embedding",
  "fallbackReason",
]);

/** Public shape safe for an active (unsolved) daily board. */
export function toPublicPuzzle<T extends LoosePuzzle>(
  puzzle: T
): Omit<T, "answer" | "explanation" | "keyword" | "seoMetadata" | "embedding" | "fallbackReason"> {
  const {
    answer: _a,
    explanation: _e,
    keyword: _k,
    seoMetadata: _s,
    embedding: _emb,
    fallbackReason: _f,
    ...rest
  } = puzzle;

  const publicRest: LoosePuzzle = { ...rest };

  // Nested metadata may still carry keyword/seo
  if (
    publicRest.metadata &&
    typeof publicRest.metadata === "object" &&
    publicRest.metadata !== null
  ) {
    const meta = { ...(publicRest.metadata as LoosePuzzle) };
    const { keyword: _keyword, seoMetadata: _seo, answer: _answer, ...safeMeta } = meta;
    publicRest.metadata = safeMeta;
  }

  return publicRest as Omit<
    T,
    "answer" | "explanation" | "keyword" | "seoMetadata" | "embedding" | "fallbackReason"
  >;
}

export function stripPuzzleAnswersFromList<T extends LoosePuzzle>(
  items: Array<{ puzzle: T; [key: string]: unknown }>
): Array<{ puzzle: ReturnType<typeof toPublicPuzzle<T>>; [key: string]: unknown }> {
  return items.map((item) => ({
    ...item,
    puzzle: toPublicPuzzle(item.puzzle),
  }));
}

export function hasSecretPuzzleFields(value: unknown): boolean {
  if (!value || typeof value !== "object") return false;
  return Object.keys(value as LoosePuzzle).some((k) => SECRET_KEYS.has(k));
}
