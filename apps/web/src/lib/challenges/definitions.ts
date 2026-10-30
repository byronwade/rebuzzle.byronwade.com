/**
 * Native challenge ladder.
 *
 * Every line is derived from server-owned daily-progress entries, so every
 * tier is reachable at one scored daily puzzle per day. The 100-item web
 * achievement catalog in @rebuzzle/game-logic is separate and unchanged.
 */

export type ChallengeCategoryId = "devotion" | "precision" | "grit" | "rhythm" | "secrets";

export type ChallengeMeasure =
  | "dailies"
  | "streak"
  | "trails"
  | "perfect-weeks"
  | "first-guess"
  | "unassisted"
  | "solves"
  | "clutch"
  | "extended"
  | "early-bird"
  | "night-owl";

export type ChallengeLineDefinition = {
  id: ChallengeMeasure;
  category: Exclude<ChallengeCategoryId, "secrets">;
  title: string;
  description: string;
  thresholds: [number, number, number, number, number];
};

export type SecretLineDefinition = {
  id: string;
  title: string;
  description: string;
  /** Puzzle-date month and day, formatted MM-DD. */
  monthDay: string;
};

export const CHALLENGE_TIER_XP = [25, 50, 100, 200, 400] as const;
export const SECRET_XP = 100;

export const CHALLENGE_CATEGORIES: { id: ChallengeCategoryId; title: string }[] = [
  { id: "devotion", title: "Devotion" },
  { id: "precision", title: "Precision" },
  { id: "grit", title: "Grit" },
  { id: "rhythm", title: "Rhythm" },
  { id: "secrets", title: "Secrets" },
];

export const CHALLENGE_LINES: ChallengeLineDefinition[] = [
  {
    id: "dailies",
    category: "devotion",
    title: "Daily devotion",
    description: "Finish daily puzzles",
    thresholds: [1, 7, 30, 100, 365],
  },
  {
    id: "streak",
    category: "devotion",
    title: "Unbroken",
    description: "Finish puzzles on consecutive days",
    thresholds: [3, 7, 30, 100, 365],
  },
  {
    id: "trails",
    category: "devotion",
    title: "Trailblazer",
    description: "Finish 3 days in a Monday–Sunday week",
    thresholds: [1, 4, 12, 26, 52],
  },
  {
    id: "perfect-weeks",
    category: "devotion",
    title: "Perfect week",
    description: "Finish all 7 days of a week",
    thresholds: [1, 4, 12, 26, 52],
  },
  {
    id: "first-guess",
    category: "precision",
    title: "Mind reader",
    description: "Solve on your first guess",
    thresholds: [1, 5, 20, 60, 150],
  },
  {
    id: "unassisted",
    category: "precision",
    title: "No nudge needed",
    description: "Solve without asking Eve for a nudge",
    thresholds: [3, 15, 50, 150, 300],
  },
  {
    id: "solves",
    category: "grit",
    title: "Puzzle breaker",
    description: "Solve daily puzzles",
    thresholds: [1, 10, 50, 150, 300],
  },
  {
    id: "clutch",
    category: "grit",
    title: "Last word",
    description: "Solve on your third and final guess",
    thresholds: [1, 5, 15, 40, 100],
  },
  {
    id: "extended",
    category: "grit",
    title: "Never quit",
    description: "Solve after your three scored guesses",
    thresholds: [1, 5, 15, 40, 100],
  },
  {
    id: "early-bird",
    category: "rhythm",
    title: "Early bird",
    description: "Finish a puzzle before 8 a.m.",
    thresholds: [1, 5, 20, 50, 100],
  },
  {
    id: "night-owl",
    category: "rhythm",
    title: "Night owl",
    description: "Finish a puzzle after 10 p.m.",
    thresholds: [1, 5, 20, 50, 100],
  },
];

export const SECRET_LINES: SecretLineDefinition[] = [
  {
    id: "new-year",
    title: "Fresh start",
    description: "Finish the puzzle on New Year’s Day",
    monthDay: "01-01",
  },
  {
    id: "halloween",
    title: "Trick or treat",
    description: "Finish the puzzle on Halloween",
    monthDay: "10-31",
  },
  {
    id: "leap-day",
    title: "Once in four",
    description: "Finish the puzzle on February 29",
    monthDay: "02-29",
  },
];
