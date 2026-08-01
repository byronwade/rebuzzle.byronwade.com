/**
 * Outcome-weighted prefer/avoid signals from live play + quality votes.
 * Hard-consumed by curriculum (not prompt-only).
 */

import { getCollection } from "@/db/mongodb";
import { loadQualityVoteAggregate } from "./puzzle-quality-vote";

export type TechniqueOutcome = {
  techniqueId: string;
  puzzleCount: number;
  finals: number;
  solveRate: number;
  medianSolveSeconds: number | null;
  avgHints: number | null;
  likeRate: number | null;
  /** Higher = healthier for daily invent */
  score: number;
};

export type OutcomeWeights = {
  preferTechniques: string[];
  avoidTechniques: string[];
  preferAnswerPatterns: string[];
  avoidAnswerPatterns: string[];
  preferThemes: string[];
  avoidThemes: string[];
  notes: string[];
  techniques: TechniqueOutcome[];
  samplePuzzles: number;
  sampleFinals: number;
};

type PuzzleRow = {
  id?: string;
  answer?: string;
  category?: string;
  metadata?: {
    techniqueId?: string;
    liveSolveRate?: number;
    liveMedianSolveSeconds?: number;
    liveFinals?: number;
  };
};

type FinalRow = {
  puzzleId?: string;
  isCorrect?: boolean;
  timeSpentSeconds?: number;
  hintsUsed?: number;
};

function median(values: number[]): number | null {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[mid - 1]! + sorted[mid]!) / 2
    : sorted[mid]!;
}

function avg(values: number[]): number | null {
  if (!values.length) return null;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

function answerPattern(answer: string): string {
  const words = answer.trim().split(/\s+/).filter(Boolean);
  if (answer.includes("-")) return "hyphen";
  if (words.length >= 3) return "multi_word_3plus";
  if (words.length === 2) return "multi_word_2";
  return "single_word";
}

function scoreTechnique(input: {
  solveRate: number;
  medianSolveSeconds: number | null;
  avgHints: number | null;
  likeRate: number | null;
  finals: number;
}): number {
  let score = 50;
  const { solveRate, medianSolveSeconds, avgHints, likeRate, finals } = input;

  // Sweet spot: challenging but fair
  if (solveRate >= 0.35 && solveRate <= 0.75) score += 18;
  else if (solveRate > 0.85) score -= 22;
  else if (solveRate < 0.25) score -= 20;

  if (medianSolveSeconds !== null) {
    if (medianSolveSeconds >= 45 && medianSolveSeconds <= 200) score += 14;
    else if (medianSolveSeconds < 35) score -= 18;
    else if (medianSolveSeconds > 300) score -= 8;
  }

  if (avgHints !== null) {
    if (avgHints >= 0.5 && avgHints <= 2.5) score += 8;
    else if (avgHints < 0.2) score -= 10;
    else if (avgHints > 3.2) score -= 8;
  }

  if (likeRate !== null) {
    if (likeRate >= 0.65) score += 12;
    else if (likeRate <= 0.35) score -= 16;
  }

  if (finals < 6) score -= 6;
  return Math.max(0, Math.min(100, Math.round(score)));
}

/**
 * Aggregate recent puzzles' live outcomes into hard invent weights.
 */
export async function loadOutcomeWeights(input?: {
  lookbackDays?: number;
  minFinalsPerTechnique?: number;
}): Promise<OutcomeWeights> {
  const lookbackDays = input?.lookbackDays ?? 21;
  const minFinals = input?.minFinalsPerTechnique ?? 5;
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - lookbackDays);

  const empty: OutcomeWeights = {
    preferTechniques: [],
    avoidTechniques: [],
    preferAnswerPatterns: [],
    avoidAnswerPatterns: [],
    preferThemes: [],
    avoidThemes: [],
    notes: ["Insufficient outcome data — keep diversity defaults"],
    techniques: [],
    samplePuzzles: 0,
    sampleFinals: 0,
  };

  try {
    const [puzzles, finals, quality] = await Promise.all([
      getCollection("puzzles")
        .find({
          createdAt: { $gte: cutoff },
          $or: [{ "metadata.lab": { $ne: true } }, { "metadata.lab": { $exists: false } }],
        })
        .project({
          id: 1,
          answer: 1,
          category: 1,
          "metadata.techniqueId": 1,
          "metadata.liveSolveRate": 1,
          "metadata.liveMedianSolveSeconds": 1,
          "metadata.liveFinals": 1,
        })
        .sort({ createdAt: -1 })
        .limit(120)
        .toArray() as Promise<PuzzleRow[]>,
      getCollection("puzzleAttempts")
        .find({
          isFinal: true,
          attemptedAt: { $gte: cutoff },
          puzzleDate: { $not: { $regex: /^archive:/ } },
        })
        .project({
          puzzleId: 1,
          isCorrect: 1,
          timeSpentSeconds: 1,
          hintsUsed: 1,
        })
        .limit(8000)
        .toArray() as Promise<FinalRow[]>,
      loadQualityVoteAggregate({ lookbackDays: Math.max(lookbackDays, 14) }),
    ]);

    if (!puzzles.length) return empty;

    const finalsByPuzzle = new Map<string, FinalRow[]>();
    for (const f of finals) {
      if (!f.puzzleId) continue;
      const list = finalsByPuzzle.get(f.puzzleId) ?? [];
      list.push(f);
      finalsByPuzzle.set(f.puzzleId, list);
    }

    const likeByTechnique = new Map<string, { likes: number; total: number }>();
    // Quality aggregate already has liked/disliked technique tops — fold in
    for (const id of quality.likedTechniques) {
      const cur = likeByTechnique.get(id) ?? { likes: 0, total: 0 };
      cur.likes += 3;
      cur.total += 3;
      likeByTechnique.set(id, cur);
    }
    for (const id of quality.dislikedTechniques) {
      const cur = likeByTechnique.get(id) ?? { likes: 0, total: 0 };
      cur.total += 3;
      likeByTechnique.set(id, cur);
    }

    type Acc = {
      finals: FinalRow[];
      puzzleCount: number;
      patterns: Map<string, { good: number; bad: number }>;
      themes: Map<string, { good: number; bad: number }>;
    };
    const byTech = new Map<string, Acc>();

    for (const puzzle of puzzles) {
      const tech = puzzle.metadata?.techniqueId;
      if (!tech || !puzzle.id) continue;
      const rows = finalsByPuzzle.get(puzzle.id) ?? [];
      const acc = byTech.get(tech) ?? {
        finals: [],
        puzzleCount: 0,
        patterns: new Map(),
        themes: new Map(),
      };
      acc.puzzleCount += 1;
      acc.finals.push(...rows);

      const solves = rows.filter((r) => r.isCorrect);
      const solveRate = rows.length ? solves.length / rows.length : puzzle.metadata?.liveSolveRate ?? 0.5;
      const times = solves
        .map((r) => r.timeSpentSeconds)
        .filter((t): t is number => typeof t === "number" && t > 0 && t < 3600);
      const med = median(times) ?? puzzle.metadata?.liveMedianSolveSeconds ?? null;
      const healthy =
        solveRate >= 0.35 &&
        solveRate <= 0.8 &&
        (med === null || (med >= 40 && med <= 240));
      const tooEasy = solveRate > 0.85 && med !== null && med < 40;
      const tooHard = solveRate < 0.25;

      const pattern = answerPattern(String(puzzle.answer || ""));
      const theme = (puzzle.category || "general").toLowerCase().split(/[^a-z]+/)[0] || "general";
      const bump = (map: Map<string, { good: number; bad: number }>, key: string) => {
        const cur = map.get(key) ?? { good: 0, bad: 0 };
        if (healthy) cur.good += 1;
        if (tooEasy || tooHard) cur.bad += 1;
        map.set(key, cur);
      };
      bump(acc.patterns, pattern);
      bump(acc.themes, theme);
      byTech.set(tech, acc);
    }

    const patternTotals = new Map<string, { good: number; bad: number }>();
    const themeTotals = new Map<string, { good: number; bad: number }>();
    const techniques: TechniqueOutcome[] = [];

    for (const [techniqueId, acc] of byTech) {
      const rows = acc.finals;
      const solves = rows.filter((r) => r.isCorrect);
      const solveRate = rows.length ? solves.length / rows.length : 0;
      const times = solves
        .map((r) => r.timeSpentSeconds)
        .filter((t): t is number => typeof t === "number" && t > 0 && t < 3600);
      const hints = rows
        .map((r) => r.hintsUsed)
        .filter((n): n is number => typeof n === "number" && n >= 0);
      const like = likeByTechnique.get(techniqueId);
      const likeRate = like && like.total > 0 ? like.likes / like.total : null;

      techniques.push({
        techniqueId,
        puzzleCount: acc.puzzleCount,
        finals: rows.length,
        solveRate,
        medianSolveSeconds: median(times),
        avgHints: avg(hints),
        likeRate,
        score: scoreTechnique({
          solveRate,
          medianSolveSeconds: median(times),
          avgHints: avg(hints),
          likeRate,
          finals: rows.length,
        }),
      });

      for (const [k, v] of acc.patterns) {
        const cur = patternTotals.get(k) ?? { good: 0, bad: 0 };
        cur.good += v.good;
        cur.bad += v.bad;
        patternTotals.set(k, cur);
      }
      for (const [k, v] of acc.themes) {
        const cur = themeTotals.get(k) ?? { good: 0, bad: 0 };
        cur.good += v.good;
        cur.bad += v.bad;
        themeTotals.set(k, cur);
      }
    }

    const ranked = techniques
      .filter((t) => t.finals >= minFinals || t.puzzleCount >= 2)
      .sort((a, b) => b.score - a.score);

    const preferTechniques = ranked.filter((t) => t.score >= 62).slice(0, 5).map((t) => t.techniqueId);
    const avoidTechniques = ranked
      .filter((t) => t.score <= 38)
      .slice(-5)
      .map((t) => t.techniqueId);

    // Also fold quality vote technique lists
    for (const id of quality.likedTechniques) {
      if (!preferTechniques.includes(id)) preferTechniques.unshift(id);
    }
    for (const id of quality.dislikedTechniques) {
      if (!avoidTechniques.includes(id)) avoidTechniques.push(id);
    }

    const preferAnswerPatterns = [...patternTotals.entries()]
      .filter(([, v]) => v.good > v.bad && v.good >= 2)
      .sort((a, b) => b[1].good - a[1].good)
      .slice(0, 4)
      .map(([k]) => k);
    const avoidAnswerPatterns = [...patternTotals.entries()]
      .filter(([, v]) => v.bad > v.good && v.bad >= 2)
      .sort((a, b) => b[1].bad - a[1].bad)
      .slice(0, 4)
      .map(([k]) => k);

    const preferThemes = [...themeTotals.entries()]
      .filter(([, v]) => v.good > v.bad)
      .sort((a, b) => b[1].good - a[1].good)
      .slice(0, 4)
      .map(([k]) => k);
    const avoidThemes = [...themeTotals.entries()]
      .filter(([, v]) => v.bad > v.good)
      .sort((a, b) => b[1].bad - a[1].bad)
      .slice(0, 3)
      .map(([k]) => k);

    // Default healthy uniqueness bias when data is thin
    if (!preferAnswerPatterns.length) {
      preferAnswerPatterns.push("multi_word_2", "multi_word_3plus");
    }
    if (!avoidAnswerPatterns.length && ranked.some((t) => t.score <= 40)) {
      avoidAnswerPatterns.push("single_word");
    }

    const notes: string[] = [];
    if (preferTechniques.length) {
      notes.push(`Outcome-prefer techniques: ${preferTechniques.slice(0, 3).join(", ")}`);
    }
    if (avoidTechniques.length) {
      notes.push(`Outcome-avoid techniques: ${avoidTechniques.slice(0, 3).join(", ")}`);
    }
    if (preferAnswerPatterns.length) {
      notes.push(`Prefer answer shapes: ${preferAnswerPatterns.join(", ")}`);
    }
    if (!notes.length) notes.push(...empty.notes);

    return {
      preferTechniques: preferTechniques.slice(0, 6),
      avoidTechniques: avoidTechniques.slice(0, 6),
      preferAnswerPatterns,
      avoidAnswerPatterns,
      preferThemes,
      avoidThemes,
      notes,
      techniques: ranked,
      samplePuzzles: puzzles.length,
      sampleFinals: finals.length,
    };
  } catch {
    return empty;
  }
}
