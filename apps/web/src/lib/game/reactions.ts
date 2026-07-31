/**
 * Guess reactions.
 *
 * Eve reacts to every guess the moment it lands. The reaction is computed
 * server-side from the similarity score the validator already produces, so the
 * client never needs the answer to know how badly it missed.
 *
 * These lines are the floor, not the ceiling: /api/puzzles/quip streams a
 * written-fresh line over the top when the model is available. If it isn't,
 * these stand on their own and nobody can tell the difference.
 */

export type ReactionTier = "correct" | "close" | "warm" | "cold" | "out";

export interface GuessReaction {
  tier: ReactionTier;
  line: string;
}

interface ReactionInput {
  correct: boolean;
  /** 0–100 similarity from the answer validator. */
  similarity: number;
  attemptsLeft: number;
  guess: string;
}

/**
 * Snark pools. Playful at the guess, never at the player — the joke is always
 * about the distance, and the last-attempt lines ease off entirely.
 */
const LINES: Record<ReactionTier, readonly string[]> = {
  correct: [
    "That's it. Filed under 'annoyingly obvious in hindsight'.",
    "Correct. You made that look easier than it was.",
    "Got it. I'll go design something meaner for tomorrow.",
    "That's the one. Well solved.",
    "Correct — and faster than I'd like to admit.",
  ],
  close: [
    "So close I almost gave it to you. Almost.",
    "You're circling it. One word off, maybe less.",
    "Warm enough to burn. Adjust and go again.",
    "That's nearly the shape of it. Nearly.",
    "Right neighbourhood, wrong door.",
  ],
  warm: [
    "Something in there is on the right track. Not all of it.",
    "Half a thought in the right direction.",
    "You're onto part of it. Keep pulling that thread.",
    "Getting warmer, and I do mean slightly.",
    "There's a real idea in there. It's just not the one.",
  ],
  cold: [
    "Not even close. I mean that with affection.",
    "Bold. Wrong, but bold.",
    "That's a confident no.",
    "Nope. Try reading it out loud — it usually helps.",
    "Cold. Genuinely, impressively cold.",
    "I admire the swing. It was a swing at nothing.",
  ],
  out: [
    "That's the last one. Let's see what you were up against.",
    "Out of guesses — here's what it was.",
    "Time's up on this one. The reveal's below.",
    "No attempts left. Tomorrow's a new puzzle.",
  ],
};

/** Stable small hash so the same guess always gets the same line. */
function hash(input: string): number {
  let h = 0;
  for (let i = 0; i < input.length; i++) {
    h = (h << 5) - h + input.charCodeAt(i);
    h |= 0;
  }
  return Math.abs(h);
}

export function getReactionTier({
  correct,
  similarity,
  attemptsLeft,
}: Omit<ReactionInput, "guess">): ReactionTier {
  if (correct) return "correct";
  if (attemptsLeft <= 0) return "out";
  if (similarity >= 70) return "close";
  if (similarity >= 40) return "warm";
  return "cold";
}

export function buildGuessReaction(input: ReactionInput): GuessReaction {
  const tier = getReactionTier(input);
  const pool = LINES[tier];
  const line = pool[hash(input.guess.toLowerCase()) % pool.length] ?? pool[0];
  return { tier, line: line as string };
}

/** Tone mapping for the thread UI — the four bands the surface knows about. */
export const REACTION_TONE: Record<ReactionTier, "positive" | "warning" | "neutral" | "negative"> =
  {
    correct: "positive",
    close: "warning",
    warm: "warning",
    cold: "neutral",
    out: "negative",
  };
