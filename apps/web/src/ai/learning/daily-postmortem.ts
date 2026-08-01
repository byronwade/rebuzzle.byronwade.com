/**
 * Daily postmortem — yesterday's puzzle outcomes → hard rules for tomorrow's brief.
 */

import { getCollection } from "@/db/mongodb";
import { loadWrongGuessDigest } from "../puzzle-agent/workflow/wrong-guesses";
import { measurePuzzlePerformance } from "./performance-monitor";
import { loadQualityVoteAggregate } from "./puzzle-quality-vote";

export type DailyPostmortem = {
  date: string;
  puzzleId?: string;
  answer?: string;
  techniqueId?: string;
  category?: string;
  solveRate?: number;
  medianSolveSeconds?: number | null;
  finals?: number;
  likeRate?: number | null;
  topWrongGuesses: Array<{ guess: string; count: number }>;
  /** Hard rules injected into curriculum */
  rules: string[];
  preferTechniques: string[];
  avoidTechniques: string[];
  avoidAnswerKeys: string[];
  preferAnswerPatterns: string[];
  avoidAnswerPatterns: string[];
  promptBlock: string;
  verdict: "too_easy" | "too_hard" | "healthy" | "unknown";
};

function dateKeyUTC(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function answerPattern(answer: string): string {
  const words = answer.trim().split(/\s+/).filter(Boolean);
  if (answer.includes("-")) return "hyphen";
  if (words.length >= 3) return "multi_word_3plus";
  if (words.length === 2) return "multi_word_2";
  return "single_word";
}

/**
 * Build postmortem for a calendar day (defaults to yesterday UTC).
 */
export async function buildDailyPostmortem(input?: {
  date?: Date;
}): Promise<DailyPostmortem> {
  const base = input?.date ?? new Date();
  const day = new Date(base);
  day.setUTCDate(day.getUTCDate() - (input?.date ? 0 : 1));
  const key = dateKeyUTC(day);
  const start = new Date(`${key}T00:00:00.000Z`);
  const end = new Date(`${key}T23:59:59.999Z`);

  const empty: DailyPostmortem = {
    date: key,
    topWrongGuesses: [],
    rules: ["No puzzle postmortem available — keep answer-first + multi-word bias"],
    preferTechniques: [],
    avoidTechniques: [],
    avoidAnswerKeys: [],
    preferAnswerPatterns: ["multi_word_2", "multi_word_3plus"],
    avoidAnswerPatterns: [],
    promptBlock: "Postmortem unavailable — invent a fair multi-word phrase with one clear device.",
    verdict: "unknown",
  };

  try {
    const puzzle = (await getCollection("puzzles").findOne({
      publishedAt: { $gte: start, $lte: end },
      active: true,
    })) as {
      id?: string;
      answer?: string;
      category?: string;
      metadata?: { techniqueId?: string; answerKey?: string };
    } | null;

    if (!puzzle?.id) return empty;

    const [perf, wrong, quality] = await Promise.all([
      measurePuzzlePerformance(String(puzzle.id)),
      loadWrongGuessDigest({ lookbackDays: 3, limit: 8 }),
      loadQualityVoteAggregate({ lookbackDays: 3, limit: 200 }),
    ]);

    const techniqueId = puzzle.metadata?.techniqueId;
    const answer = String(puzzle.answer || "");
    const pattern = answerPattern(answer);
    const rules: string[] = [];
    const preferTechniques: string[] = [];
    const avoidTechniques: string[] = [];
    const preferAnswerPatterns: string[] = [];
    const avoidAnswerPatterns: string[] = [];
    const avoidAnswerKeys: string[] = [];

    if (answer) {
      avoidAnswerKeys.push(answer.toLowerCase().replace(/[^a-z0-9]+/g, ""));
    }

    let verdict: DailyPostmortem["verdict"] = "unknown";
    const solveRate = perf?.solveRate;
    const median = perf?.medianSolveSeconds ?? null;

    if (perf) {
      if (
        (solveRate !== undefined && solveRate > 0.85 && median !== null && median < 45) ||
        perf.perceivedTooEasy
      ) {
        verdict = "too_easy";
        rules.push("Yesterday was too easy — raise craft density; avoid one-step compounds");
        rules.push("Require multi-word answer + false lead or positional/container device");
        avoidAnswerPatterns.push("single_word");
        preferAnswerPatterns.push("multi_word_2", "multi_word_3plus");
        if (techniqueId) avoidTechniques.push(techniqueId);
        preferTechniques.push(
          "false_lead_visual",
          "container_phrase",
          "letter_play",
          "spatial_preposition_play"
        );
      } else if (
        (solveRate !== undefined && solveRate < 0.28) ||
        perf.perceivedTooHard
      ) {
        verdict = "too_hard";
        rules.push("Yesterday was too hard — prefer fair familiar phrases with clearer mapping");
        rules.push("Hint 1 must name the device family; avoid niche answers");
        preferAnswerPatterns.push("multi_word_2");
        avoidAnswerPatterns.push("multi_word_3plus");
        if (techniqueId) preferTechniques.push(techniqueId);
        preferTechniques.push("idiom_as_picture", "simple_compound", "hyphen_compound");
      } else {
        verdict = "healthy";
        rules.push("Yesterday landed in a healthy challenge band — keep answer-first uniqueness");
        preferAnswerPatterns.push(pattern === "single_word" ? "multi_word_2" : pattern);
        if (techniqueId) preferTechniques.push(techniqueId);
      }
    }

    // Wrong-guess traps → invent rules
    const topWrongGuesses = wrong.topGuesses.slice(0, 5);
    if (topWrongGuesses.length) {
      rules.push(
        `Design against live traps: ${topWrongGuesses
          .slice(0, 3)
          .map((g) => `"${g.guess}"`)
          .join(", ")}`
      );
    }

    if (quality.total >= 5 && quality.likeRate <= 0.35) {
      rules.push("Recent dislikes — prioritize strong aha + recognizable icons");
      avoidTechniques.push(...quality.dislikedTechniques.slice(0, 2));
    }
    if (quality.total >= 5 && quality.likeRate >= 0.7) {
      preferTechniques.push(...quality.likedTechniques.slice(0, 2));
      rules.push("Recent likes healthy — preserve creative technique mix");
    }

    const likeRate =
      quality.total > 0 ? quality.likeRate : null;

    const promptBlock = [
      `DAILY POSTMORTEM ${key}:`,
      `  answer="${answer}" technique=${techniqueId || "?"} verdict=${verdict}`,
      perf
        ? `  solveRate=${((solveRate ?? 0) * 100).toFixed(0)}% median=${median ?? "?"}s finals=${perf.finals}`
        : "  performance: insufficient finals",
      ...rules.map((r) => `  RULE: ${r}`),
      topWrongGuesses.length
        ? `  traps: ${topWrongGuesses.map((g) => g.guess).join(", ")}`
        : null,
    ]
      .filter(Boolean)
      .join("\n");

    return {
      date: key,
      puzzleId: String(puzzle.id),
      answer,
      techniqueId,
      category: puzzle.category,
      solveRate,
      medianSolveSeconds: median,
      finals: perf?.finals,
      likeRate,
      topWrongGuesses,
      rules: [...new Set(rules)],
      preferTechniques: [...new Set(preferTechniques)].slice(0, 6),
      avoidTechniques: [...new Set(avoidTechniques)].slice(0, 6),
      avoidAnswerKeys,
      preferAnswerPatterns: [...new Set(preferAnswerPatterns)],
      avoidAnswerPatterns: [...new Set(avoidAnswerPatterns)],
      promptBlock,
      verdict,
    };
  } catch {
    return empty;
  }
}

/**
 * Persist postmortem as a learning event for later brief loads.
 */
export async function persistDailyPostmortem(
  postmortem: DailyPostmortem
): Promise<string | undefined> {
  try {
    const { aiLearningEventOps } = await import("@/db/ai-operations");
    const event = await aiLearningEventOps.create({
      id: crypto.randomUUID(),
      eventType: "daily_postmortem",
      feedbackIds: postmortem.puzzleId ? [postmortem.puzzleId] : [],
      aggregationType: "single",
      change: {
        parameter: "eve_brief_rules",
        oldValue: null,
        newValue: postmortem,
        reason: `Postmortem ${postmortem.date}: ${postmortem.verdict}`,
        confidence: postmortem.verdict === "unknown" ? 0.3 : 0.75,
      },
      expectedImpact: { qualityImprovement: 4 },
      status: "applied",
      timestamp: new Date(),
      createdAt: new Date(),
    });
    return event.id;
  } catch {
    return undefined;
  }
}

/**
 * Load latest persisted postmortem (or build fresh).
 */
export async function loadLatestPostmortem(): Promise<DailyPostmortem> {
  try {
    const doc = (await getCollection("aiLearningEvents")
      .find({ eventType: "daily_postmortem" })
      .sort({ timestamp: -1 })
      .limit(1)
      .next()) as {
      change?: { newValue?: DailyPostmortem };
      timestamp?: Date;
    } | null;

    const stored = doc?.change?.newValue;
    if (stored?.promptBlock && stored?.rules) {
      // Prefer fresh build if stored is older than ~36h
      const ageMs = doc?.timestamp
        ? Date.now() - new Date(doc.timestamp).getTime()
        : Number.POSITIVE_INFINITY;
      if (ageMs < 36 * 60 * 60 * 1000) return stored;
    }
  } catch {
    // fall through
  }
  return buildDailyPostmortem();
}

export async function runDailyPostmortemPipeline(): Promise<{
  postmortem: DailyPostmortem;
  eventId?: string;
}> {
  const postmortem = await buildDailyPostmortem();
  const eventId = await persistDailyPostmortem(postmortem);
  return { postmortem, eventId };
}
