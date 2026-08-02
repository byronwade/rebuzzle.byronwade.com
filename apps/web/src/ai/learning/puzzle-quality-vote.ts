/**
 * Like / dislike votes on puzzles — feeds generation quality tuning.
 */

import { getCollection } from "@/db/mongodb";

export type PuzzleQualityVote = "like" | "dislike";
export type PuzzleQualityReason =
  | "unrecognizable"
  | "ambiguous"
  | "unfair"
  | "boring"
  | "bad_hints"
  | "too_easy"
  | "too_hard";

const QUALITY_REASONS = new Set<PuzzleQualityReason>([
  "unrecognizable",
  "ambiguous",
  "unfair",
  "boring",
  "bad_hints",
  "too_easy",
  "too_hard",
]);

export type QualityVoteMapping = {
  vote: PuzzleQualityVote;
  rating: number;
  satisfaction: number;
  reasons: PuzzleQualityReason[];
  metrics: {
    creative?: boolean;
    boring?: boolean;
    unclear?: boolean;
    unfair?: boolean;
    unrecognizable?: boolean;
    ambiguous?: boolean;
    hintTooVague?: boolean;
    tooEasy?: boolean;
    tooHard?: boolean;
  };
};

export function isPuzzleQualityVote(value: unknown): value is PuzzleQualityVote {
  return value === "like" || value === "dislike";
}

export function isPuzzleQualityReason(value: unknown): value is PuzzleQualityReason {
  return typeof value === "string" && QUALITY_REASONS.has(value as PuzzleQualityReason);
}

export function mapPuzzleQualityVote(
  vote: PuzzleQualityVote,
  reasons: PuzzleQualityReason[] = []
): QualityVoteMapping {
  if (vote === "like") {
    return {
      vote,
      rating: 5,
      satisfaction: 5,
      reasons: [],
      metrics: { creative: true },
    };
  }
  const uniqueReasons = Array.from(new Set(reasons.filter(isPuzzleQualityReason)));
  return {
    vote,
    rating: 1,
    satisfaction: 1,
    reasons: uniqueReasons,
    metrics: {
      boring: uniqueReasons.length === 0 || uniqueReasons.includes("boring"),
      unclear: uniqueReasons.includes("unrecognizable") || uniqueReasons.includes("ambiguous"),
      unfair: uniqueReasons.includes("unfair"),
      unrecognizable: uniqueReasons.includes("unrecognizable"),
      ambiguous: uniqueReasons.includes("ambiguous"),
      hintTooVague: uniqueReasons.includes("bad_hints"),
      tooEasy: uniqueReasons.includes("too_easy"),
      tooHard: uniqueReasons.includes("too_hard"),
    },
  };
}

export type QualityVoteAggregate = {
  likes: number;
  dislikes: number;
  total: number;
  likeRate: number;
  /** Recent disliked technique ids (when available on linked puzzles) */
  dislikedTechniques: string[];
  likedTechniques: string[];
  reasonCounts: Partial<Record<PuzzleQualityReason, number>>;
  notes: string[];
};

/**
 * Turn quality votes into generation prefer/avoid guidance.
 */
export function qualityVotesToGuidance(agg: QualityVoteAggregate): {
  preferPatterns: string[];
  avoidPatterns: string[];
  notes: string[];
} {
  const preferPatterns: string[] = [];
  const avoidPatterns: string[] = [];
  const notes = [...agg.notes];

  if (agg.total < 5) {
    return {
      preferPatterns,
      avoidPatterns,
      notes: [`Quality vote sample too small (${agg.total})`],
    };
  }

  if (agg.likeRate >= 0.7) {
    preferPatterns.push("Players liked recent boards — keep strong aha + clear visual mapping");
    preferPatterns.push("Preserve creative technique mix that earned likes");
    notes.push(`${Math.round(agg.likeRate * 100)}% liked recent puzzles`);
  } else if (agg.likeRate <= 0.35) {
    avoidPatterns.push("Recent puzzles earned dislikes — avoid vague or boring boards");
    avoidPatterns.push("Skip weak aha / overused compounds that feel flat");
    preferPatterns.push("Prioritize fair, delightful mechanisms with progressive hints");
    notes.push(`Only ${Math.round(agg.likeRate * 100)}% liked recent puzzles — raise craft bar`);
  }

  if (agg.dislikedTechniques.length) {
    avoidPatterns.push(
      `Techniques with recent dislikes: ${agg.dislikedTechniques.slice(0, 4).join(", ")}`
    );
  }
  if ((agg.reasonCounts.unrecognizable ?? 0) > 0) {
    avoidPatterns.push(
      "Players reported unrecognizable objects — use vetted assets and simpler silhouettes"
    );
  }
  if ((agg.reasonCounts.ambiguous ?? 0) > 0) {
    avoidPatterns.push(
      "Players reported ambiguous boards — remove alternate parses and strengthen cue order"
    );
  }
  if ((agg.reasonCounts.unfair ?? 0) > 0) {
    avoidPatterns.push(
      "Players reported unfair puzzles — prefer common phrases and complete cue mapping"
    );
  }
  if ((agg.reasonCounts.bad_hints ?? 0) > 0) {
    avoidPatterns.push(
      "Players reported weak hints — make each hint unlock one specific reasoning layer"
    );
  }
  if (agg.likedTechniques.length) {
    preferPatterns.push(
      `Techniques with recent likes: ${agg.likedTechniques.slice(0, 4).join(", ")}`
    );
  }

  return { preferPatterns, avoidPatterns, notes };
}

function topTechniqueIds(ids: string[], limit = 4): string[] {
  const counts = new Map<string, number>();
  for (const id of ids) {
    if (!id) continue;
    counts.set(id, (counts.get(id) ?? 0) + 1);
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([id]) => id);
}

/**
 * Load recent puzzle_quality feedback and map to technique guidance.
 */
export async function loadQualityVoteAggregate(input?: {
  lookbackDays?: number;
  limit?: number;
}): Promise<QualityVoteAggregate> {
  const lookbackDays = input?.lookbackDays ?? 14;
  const limit = input?.limit ?? 500;
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - lookbackDays);

  const empty: QualityVoteAggregate = {
    likes: 0,
    dislikes: 0,
    total: 0,
    likeRate: 0,
    dislikedTechniques: [],
    likedTechniques: [],
    reasonCounts: {},
    notes: ["No quality votes yet"],
  };

  try {
    const docs = (await getCollection("aiFeedback")
      .find({
        feedbackType: "puzzle_quality",
        timestamp: { $gte: cutoff },
      })
      .project({ rating: 1, puzzleId: 1, metrics: 1 })
      .sort({ timestamp: -1 })
      .limit(limit)
      .toArray()) as Array<{
      rating?: number;
      puzzleId?: string;
      metrics?: {
        creative?: boolean;
        boring?: boolean;
        unrecognizable?: boolean;
        ambiguous?: boolean;
        unfair?: boolean;
        hintTooVague?: boolean;
        tooEasy?: boolean;
        tooHard?: boolean;
      };
    }>;

    if (!docs.length) return empty;

    let likes = 0;
    let dislikes = 0;
    const likedPuzzleIds: string[] = [];
    const dislikedPuzzleIds: string[] = [];
    const reasonCounts: Partial<Record<PuzzleQualityReason, number>> = {};

    for (const doc of docs) {
      const isLike =
        (typeof doc.rating === "number" && doc.rating >= 4) || Boolean(doc.metrics?.creative);
      if (isLike) {
        likes += 1;
        if (doc.puzzleId) likedPuzzleIds.push(doc.puzzleId);
      } else {
        dislikes += 1;
        if (doc.puzzleId) dislikedPuzzleIds.push(doc.puzzleId);
        const metricReasons: Array<[PuzzleQualityReason, boolean | undefined]> = [
          ["unrecognizable", doc.metrics?.unrecognizable],
          ["ambiguous", doc.metrics?.ambiguous],
          ["unfair", doc.metrics?.unfair],
          ["boring", doc.metrics?.boring],
          ["bad_hints", doc.metrics?.hintTooVague],
          ["too_easy", doc.metrics?.tooEasy],
          ["too_hard", doc.metrics?.tooHard],
        ];
        metricReasons.forEach(([reason, present]) => {
          if (present) reasonCounts[reason] = (reasonCounts[reason] ?? 0) + 1;
        });
      }
    }

    const total = likes + dislikes;
    const puzzleIds = [...new Set([...likedPuzzleIds, ...dislikedPuzzleIds])];
    const techniqueByPuzzle = new Map<string, string>();

    if (puzzleIds.length) {
      const puzzles = (await getCollection("puzzles")
        .find({ id: { $in: puzzleIds } })
        .project({ id: 1, "metadata.techniqueId": 1 })
        .limit(puzzleIds.length)
        .toArray()) as Array<{ id: string; metadata?: { techniqueId?: string } }>;

      for (const puzzle of puzzles) {
        const techniqueId = puzzle.metadata?.techniqueId;
        if (techniqueId) techniqueByPuzzle.set(puzzle.id, techniqueId);
      }
    }

    const likedTechniques = topTechniqueIds(
      likedPuzzleIds.map((id) => techniqueByPuzzle.get(id) || "").filter(Boolean)
    );
    const dislikedTechniques = topTechniqueIds(
      dislikedPuzzleIds.map((id) => techniqueByPuzzle.get(id) || "").filter(Boolean)
    );

    return {
      likes,
      dislikes,
      total,
      likeRate: total > 0 ? likes / total : 0,
      likedTechniques,
      dislikedTechniques,
      reasonCounts,
      notes: [`${likes} likes / ${dislikes} dislikes over ${lookbackDays}d`],
    };
  } catch {
    return empty;
  }
}
