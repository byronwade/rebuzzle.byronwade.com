/**
 * Slugs served by /puzzles/[type]. Shared with the proxy so unknown types
 * return a real 404 status: with Cache Components, notFound() inside the
 * page streams after a 200 has already been sent.
 */
export const PUZZLE_TYPE_SLUGS = [
  "rebus",
  "logic-grid",
  "cryptic-crossword",
  "number-sequence",
  "pattern-recognition",
  "caesar-cipher",
  "trivia",
] as const;

export type PuzzleTypeSlug = (typeof PUZZLE_TYPE_SLUGS)[number];

export function isPuzzleTypeSlug(value: string): value is PuzzleTypeSlug {
  return (PUZZLE_TYPE_SLUGS as readonly string[]).includes(value);
}
