/**
 * Explicit player difficulty perception — closes the loop beyond solve-time heuristics.
 */

export type DifficultyPerceptionChoice = "too_easy" | "just_right" | "too_hard";

export type PerceptionMapping = {
  choice: DifficultyPerceptionChoice;
  /** 1–10 perceived difficulty */
  difficultyPerception: number;
  /** 1–5 satisfaction proxy */
  satisfaction: number;
  /** 1–5 star rating */
  rating: number;
  metrics: {
    tooEasy?: boolean;
    tooHard?: boolean;
  };
  /** Suggested generation delta from this single vote (−1…+1) */
  learningDeltaHint: number;
};

/**
 * Map a 3-way player vote into schema fields used by AIFeedback + puzzleAttempts.
 */
export function mapDifficultyPerception(choice: DifficultyPerceptionChoice): PerceptionMapping {
  switch (choice) {
    case "too_easy":
      return {
        choice,
        difficultyPerception: 3,
        satisfaction: 3,
        rating: 3,
        metrics: { tooEasy: true },
        learningDeltaHint: 1,
      };
    case "too_hard":
      return {
        choice,
        difficultyPerception: 9,
        satisfaction: 2,
        rating: 2,
        metrics: { tooHard: true },
        learningDeltaHint: -1,
      };
    default:
      return {
        choice: "just_right",
        difficultyPerception: 6,
        satisfaction: 5,
        rating: 5,
        metrics: {},
        learningDeltaHint: 0,
      };
  }
}

export function isDifficultyPerceptionChoice(value: unknown): value is DifficultyPerceptionChoice {
  return value === "too_easy" || value === "just_right" || value === "too_hard";
}

/**
 * Aggregate perception votes into a soft difficulty delta (−2…+2).
 */
export function aggregatePerceptionDelta(votes: {
  tooEasy: number;
  justRight: number;
  tooHard: number;
}): { delta: number; notes: string[] } {
  const total = votes.tooEasy + votes.justRight + votes.tooHard;
  if (total < 5) {
    return { delta: 0, notes: [`Perception sample too small (${total})`] };
  }
  const easyShare = votes.tooEasy / total;
  const hardShare = votes.tooHard / total;
  const notes: string[] = [];
  let delta = 0;
  if (easyShare >= 0.45) {
    delta = easyShare >= 0.65 ? 2 : 1;
    notes.push(`${Math.round(easyShare * 100)}% said too easy`);
  } else if (hardShare >= 0.4) {
    delta = hardShare >= 0.6 ? -2 : -1;
    notes.push(`${Math.round(hardShare * 100)}% said too hard`);
  } else {
    notes.push("Perception votes balanced around just-right");
  }
  return { delta, notes };
}
