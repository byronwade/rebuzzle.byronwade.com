/**
 * Rejection digester — turn recent generation failures into curriculum guidance.
 *
 * Parses durable audit error strings (and optional structured rejectReasons)
 * into a small taxonomy, then emits avoid/prefer patterns for Eve/Apex briefs.
 */

import { getCollection } from "@/db/mongodb";

export type RejectionTaxonomyCode =
  | "missing_seed_cues"
  | "bad_seed_contract"
  | "semantic_alignment"
  | "unapproved_asset"
  | "board_recognition"
  | "blind_solve"
  | "critique_reject"
  | "composition"
  | "uniqueness"
  | "quality_threshold"
  | "tournament_empty"
  | "budget"
  | "other";

export type RejectionBucket = {
  code: RejectionTaxonomyCode;
  count: number;
  examples: string[];
};

export type RejectionDigest = {
  lookbackDays: number;
  sampleSize: number;
  buckets: RejectionBucket[];
  avoidPatterns: string[];
  preferPatterns: string[];
  notes: string[];
};

const TAXONOMY: Array<{
  code: RejectionTaxonomyCode;
  match: RegExp;
  avoid: string;
  prefer: string;
}> = [
  {
    code: "missing_seed_cues",
    match: /answer-first visual cue contract|missing (catalog|text|operator) cue/i,
    avoid: "Composing boards that omit host-owned answer-seed cues",
    prefer: "Place every mandatory catalog/text/operator cue before returning a draft",
  },
  {
    code: "bad_seed_contract",
    match: /invalid answer-seed cue|not an approved catalog concept|duplicate answer-seed cue/i,
    avoid: "Inventing pictogram concepts outside the reviewed catalog",
    prefer: "Call list_pictogram_catalog / inspect_answer_seed_cues and use exact concept IDs",
  },
  {
    code: "semantic_alignment",
    match: /semantic alignment failed/i,
    avoid: "Boards whose visible parts cannot plausibly produce the answer",
    prefer: "Map each layer to an answer token in the explanation before compose",
  },
  {
    code: "unapproved_asset",
    match: /approved.?asset|asset approval|pending human approval|unapproved/i,
    avoid: "Fresh generate_pictogram art on the publication path",
    prefer: "Use reviewed catalog pictograms (or approved-cache) only",
  },
  {
    code: "board_recognition",
    match: /board objects not recognized|board recognition|rendered board/i,
    avoid: "Abstract or ambiguous silhouettes that blind judges misread",
    prefer: "Concrete, high-clarity catalog nouns with one dominant reading",
  },
  {
    code: "blind_solve",
    match: /blind solve|playability|estimated solve rate/i,
    avoid: "Mechanisms that only work after spoilers or dense false leads",
    prefer: "One fair aha with progressive hints that unlock the mechanism",
  },
  {
    code: "critique_reject",
    match: /critique reject|critique revise/i,
    avoid: "Overused trope mechanisms without a fresh twist",
    prefer: "Respond to critique instructions with a cleaner catalog-backed board",
  },
  {
    code: "composition",
    match: /composition rejected|compose_puzzle_visual|within budget|component budget/i,
    avoid: "Over-budget or unknown-concept layer plans",
    prefer: "Inspect the cue plan, then compose once with exact catalog IDs",
  },
  {
    code: "uniqueness",
    match: /uniqueness|duplicate answer|banned answer|not unique/i,
    avoid: "Recycling recent or archived answers / near-duplicate boards",
    prefer: "Pick a fresh answer-first seed outside bannedAnswerKeys",
  },
  {
    code: "quality_threshold",
    match: /quality|funscore|publishable|rubric/i,
    avoid: "Padding with extra icons instead of a clear technique fit",
    prefer: "Strong technique fit + mapping clarity over emoji count",
  },
  {
    code: "tournament_empty",
    match: /produced no candidates|answer.?first seed unavailable/i,
    avoid: "Slots that cannot be grounded by a cue-backed seed",
    prefer: "Fail closed early when cue coverage is missing for the tier",
  },
  {
    code: "budget",
    match: /budget|quota|rate limit|AI_BUDGET/i,
    avoid: "Retry loops that multiply model spend after a hard budget error",
    prefer: "Keep publication tool loops short; host owns scoring retries",
  },
];

function classifyRejection(text: string): RejectionTaxonomyCode {
  const trimmed = text.trim();
  if (!trimmed) return "other";
  for (const rule of TAXONOMY) {
    if (rule.match.test(trimmed)) return rule.code;
  }
  return "other";
}

/**
 * Pure aggregator — used by loaders and unit tests.
 */
export function digestRejectionTexts(
  texts: readonly string[],
  options?: { lookbackDays?: number; topN?: number }
): RejectionDigest {
  const lookbackDays = options?.lookbackDays ?? 14;
  const topN = options?.topN ?? 4;
  const counts = new Map<RejectionTaxonomyCode, { count: number; examples: string[] }>();

  for (const text of texts) {
    if (!text?.trim()) continue;
    const code = classifyRejection(text);
    const bucket = counts.get(code) ?? { count: 0, examples: [] };
    bucket.count += 1;
    if (bucket.examples.length < 3) {
      bucket.examples.push(text.replace(/[\r\n]+/g, " ").slice(0, 180));
    }
    counts.set(code, bucket);
  }

  const buckets = [...counts.entries()]
    .map(([code, value]) => ({ code, ...value }))
    .sort((a, b) => b.count - a.count);

  const top = buckets.filter((b) => b.code !== "other").slice(0, topN);
  const avoidPatterns: string[] = [];
  const preferPatterns: string[] = [];
  const notes: string[] = [];

  for (const bucket of top) {
    const rule = TAXONOMY.find((entry) => entry.code === bucket.code);
    if (!rule) continue;
    avoidPatterns.push(rule.avoid);
    preferPatterns.push(rule.prefer);
    notes.push(`Recent reject mode ${bucket.code} ×${bucket.count}: ${rule.prefer}`);
  }

  if (buckets.some((b) => b.code === "other") && !top.length) {
    notes.push(
      "Recent generation failures lack a known taxonomy match — keep cue contracts strict"
    );
  }

  return {
    lookbackDays,
    sampleSize: texts.filter((t) => t?.trim()).length,
    buckets,
    avoidPatterns,
    preferPatterns,
    notes,
  };
}

/**
 * Load recent failed/fallback audit errors and digest them for curriculum.
 */
export async function loadRejectionDigest(input?: {
  lookbackDays?: number;
  limit?: number;
}): Promise<RejectionDigest> {
  const lookbackDays = input?.lookbackDays ?? 14;
  const limit = Math.min(input?.limit ?? 120, 300);
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - lookbackDays);

  try {
    const docs = (await getCollection("generationAudits")
      .find({
        createdAt: { $gte: cutoff },
        status: { $in: ["failed", "fallback"] },
      })
      .project({ error: 1, rejectReasons: 1 })
      .sort({ createdAt: -1 })
      .limit(limit)
      .toArray()) as Array<{ error?: string; rejectReasons?: string[] }>;

    const texts = docs.flatMap((doc) => {
      const reasons = Array.isArray(doc.rejectReasons) ? doc.rejectReasons : [];
      if (reasons.length) return reasons;
      return doc.error ? [doc.error] : [];
    });

    return digestRejectionTexts(texts, { lookbackDays });
  } catch {
    return {
      lookbackDays,
      sampleSize: 0,
      buckets: [],
      avoidPatterns: [],
      preferPatterns: [],
      notes: ["Rejection digest unavailable — continue without failure-mode bias"],
    };
  }
}
