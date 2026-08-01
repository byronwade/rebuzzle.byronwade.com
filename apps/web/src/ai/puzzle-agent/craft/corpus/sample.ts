/**
 * Sample from the scored answer corpus (answer-first invent default).
 */

import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import type {
  CorpusEntry,
  CorpusFile,
  SampledCorpusAnswer,
  ThemePackId,
} from "./types";

let cached: CorpusFile | null = null;

function loadCorpus(): CorpusFile {
  if (cached) return cached;
  const candidates = [
    join(__dirname, "answer-corpus.json"),
    join(
      process.cwd(),
      "src/ai/puzzle-agent/craft/corpus/answer-corpus.json"
    ),
    join(
      process.cwd(),
      "apps/web/src/ai/puzzle-agent/craft/corpus/answer-corpus.json"
    ),
  ];
  for (const path of candidates) {
    try {
      cached = JSON.parse(readFileSync(path, "utf8")) as CorpusFile;
      return cached;
    } catch {
      // try next
    }
  }
  cached = {
    version: 1,
    generatedAt: "",
    count: 0,
    themes: [],
    entries: [],
  };
  return cached;
}

/** Test helper */
export function resetCorpusCache(): void {
  cached = null;
}

const STOP = new Set([
  "the",
  "and",
  "a",
  "an",
  "of",
  "in",
  "on",
  "to",
  "for",
  "your",
  "my",
  "our",
  "with",
  "from",
  "into",
  "out",
  "up",
  "down",
]);

function normalizeKey(answer: string): string {
  return answer.toLowerCase().replace(/[^a-z0-9]+/g, "");
}

function inferPictogramNouns(answer: string, existing?: string[]): string[] {
  if (existing?.length) return existing.slice(0, 3);
  return answer
    .toLowerCase()
    .split(/[^a-z]+/)
    .filter((w) => w.length >= 3 && !STOP.has(w))
    .slice(0, 3);
}

function seededOrder(entries: CorpusEntry[], salt: string): CorpusEntry[] {
  const scored = entries.map((e, i) => {
    const h = createHash("sha1")
      .update(`${salt}:${e.answer}:${i}`)
      .digest("hex")
      .slice(0, 8);
    return { e, r: Number.parseInt(h, 16) };
  });
  return scored.sort((a, b) => a.r - b.r).map((s) => s.e);
}

/** Gold = curated + recognizable; silver = solid; bronze = template noise */
export function corpusTier(e: CorpusEntry): "gold" | "silver" | "bronze" {
  if (e.overused) return "bronze";
  if (e.kind === "template") return "bronze";
  if (
    e.frequency >= 4 &&
    (e.kind === "phrase" ||
      e.kind === "phrasal" ||
      e.kind === "idiom" ||
      e.kind === "compound" ||
      e.kind === "hyphen" ||
      e.kind === "direction")
  ) {
    return "gold";
  }
  if (e.frequency >= 3 && e.kind !== "template") return "silver";
  if (e.kind === "letter" || e.kind === "phonetic") return "silver";
  return "bronze";
}

function scoreEntry(
  e: CorpusEntry,
  input: {
    targetDifficulty: number;
    preferredTechniques: string[];
    theme?: string;
    category?: string;
    preferMultiWord: boolean;
    preferAnswerPatterns?: string[];
    avoidAnswerPatterns?: string[];
    goldOnly?: boolean;
  }
): number {
  const tier = corpusTier(e);
  let score = e.frequency * 10;
  if (e.overused) score -= 40;
  if (tier === "gold") score += 28;
  else if (tier === "silver") score += 10;
  else score -= 22; // bronze / templates

  if (e.kind === "template") score -= 18;
  if (e.kind === "phrase" || e.kind === "phrasal" || e.kind === "idiom") score += 8;
  if (e.kind === "compound") score += 4;

  if (input.preferMultiWord) {
    if (e.wordCount >= 2) score += 14;
    if (e.wordCount >= 3) score += 6;
    if (e.wordCount === 1) score -= 6;
  } else if (e.wordCount === 1) {
    score += 4;
  }

  // Outcome-driven answer shape weights
  const shape =
    e.answer.includes("-")
      ? "hyphen"
      : e.wordCount >= 3
        ? "multi_word_3plus"
        : e.wordCount === 2
          ? "multi_word_2"
          : "single_word";
  if (input.preferAnswerPatterns?.includes(shape)) score += 14;
  if (input.avoidAnswerPatterns?.includes(shape)) score -= 16;

  const techSet = new Set(input.preferredTechniques);
  if (e.techniques.some((t) => techSet.has(t))) score += 12;

  const theme = (input.theme || input.category || "").toLowerCase();
  if (theme && e.themes.some((t) => theme.includes(t) || t.includes(theme))) {
    score += 16;
  }

  if (input.targetDifficulty >= 8) {
    if (e.frequency === 3 || e.frequency === 4) score += 6;
    if (e.frequency === 5 && e.kind === "compound") score -= 2;
  } else if (input.targetDifficulty <= 5) {
    if (e.frequency >= 4) score += 6;
  }

  if (input.goldOnly && tier !== "gold") score -= 40;

  return score;
}

export function listThemePacks(): ThemePackId[] {
  return (loadCorpus().themes || []) as ThemePackId[];
}

export function corpusSize(): number {
  return loadCorpus().entries?.length ?? 0;
}

export function corpusStats(): {
  total: number;
  multiWord: number;
  gold: number;
  silver: number;
  bronze: number;
  byKind: Record<string, number>;
} {
  const byKind: Record<string, number> = {};
  let multiWord = 0;
  let gold = 0;
  let silver = 0;
  let bronze = 0;
  for (const e of loadCorpus().entries) {
    byKind[e.kind] = (byKind[e.kind] ?? 0) + 1;
    if (e.wordCount >= 2) multiWord += 1;
    const tier = corpusTier(e);
    if (tier === "gold") gold += 1;
    else if (tier === "silver") silver += 1;
    else bronze += 1;
  }
  return { total: loadCorpus().entries.length, multiWord, gold, silver, bronze, byKind };
}

/**
 * Sample answer-first candidates from the large scored corpus.
 */
export function sampleAnswerCorpus(input: {
  targetDifficulty: number;
  preferredTechniques: string[];
  bannedAnswerKeys: Set<string> | string[];
  theme?: string;
  category?: string;
  limit?: number;
  preferMultiWord?: boolean;
  minFrequency?: number;
  allowTemplates?: boolean;
  /** Prefer gold-tier curated answers (default true) */
  preferGold?: boolean;
  preferAnswerPatterns?: string[];
  avoidAnswerPatterns?: string[];
}): SampledCorpusAnswer[] {
  const corpus = loadCorpus();
  const limit = Math.max(1, Math.min(20, input.limit ?? 8));
  const banned = new Set(
    [...input.bannedAnswerKeys].map((k) => normalizeKey(String(k)))
  );
  const minFrequency =
    input.minFrequency ?? (input.targetDifficulty >= 8 ? 2 : 3);
  const preferMultiWord =
    input.preferMultiWord ?? input.targetDifficulty >= 7;
  const preferGold = input.preferGold !== false;

  let pool = corpus.entries.filter((e) => {
    if (e.overused) return false;
    if (e.frequency < minFrequency) return false;
    if (banned.has(normalizeKey(e.answer))) return false;
    if (!input.allowTemplates && e.kind === "template") return false;
    if (preferGold && corpusTier(e) === "bronze" && e.kind === "template") return false;
    return true;
  });

  // Prefer gold-only when enough exist
  if (preferGold) {
    const goldPool = pool.filter((e) => corpusTier(e) === "gold");
    const silverPool = pool.filter((e) => corpusTier(e) !== "bronze");
    if (goldPool.length >= limit * 2) pool = goldPool;
    else if (silverPool.length >= limit * 2) pool = silverPool;
  }

  if (pool.length < limit * 3) {
    pool = corpus.entries.filter((e) => {
      if (e.overused) return false;
      if (e.frequency < minFrequency) return false;
      if (banned.has(normalizeKey(e.answer))) return false;
      return true;
    });
  }

  const theme = (input.theme || "").toLowerCase();
  if (theme) {
    const themeToken = theme.split(/\s+/)[0] || "";
    const themed = pool.filter((e) =>
      e.themes.some((t) => theme.includes(t) || (themeToken && t.includes(themeToken)))
    );
    if (themed.length >= limit) pool = themed;
  }

  const salt = [
    input.theme || "",
    input.category || "",
    [...banned].slice(0, 5).join(","),
    String(input.targetDifficulty),
  ].join("|");

  const ranked = seededOrder(pool, salt)
    .map((e) => ({
      e,
      s: scoreEntry(e, {
        ...input,
        preferMultiWord,
        preferAnswerPatterns: input.preferAnswerPatterns,
        avoidAnswerPatterns: input.avoidAnswerPatterns,
        goldOnly: preferGold,
      }),
    }))
    .sort((a, b) => b.s - a.s);

  const out: SampledCorpusAnswer[] = [];
  const seen = new Set<string>();

  for (const { e } of ranked) {
    if (out.length >= limit) break;
    const key = normalizeKey(e.answer);
    if (seen.has(key)) continue;
    seen.add(key);

    const techniqueHint =
      e.techniques.find((t) => input.preferredTechniques.includes(t)) ||
      e.techniques[0];

    out.push({
      ...e,
      pictogramNouns: inferPictogramNouns(e.answer, e.pictogramNouns),
      techniqueHint,
      source: "answer-corpus",
      note:
        e.wordCount >= 2
          ? "MULTI-WORD answer-first: backform ONE mechanism; do not invent a different answer"
          : "Answer-first: backform ONE mechanism from this exact answer (cousin only if banned)",
    });
  }

  return out;
}

export function formatCorpusSeedsForPrompt(seeds: SampledCorpusAnswer[]): string {
  if (!seeds.length) {
    return "Answer corpus empty for filters — invent a fair multi-word phrase outside the ban list.";
  }
  return [
    `ANSWER-FIRST (required): pick ONE seed and build the board from it. Corpus size ${corpusSize()}.`,
    ...seeds.map(
      (s) =>
        `  - "${s.answer}" [${s.kind}/freq${s.frequency}/w${s.wordCount}${
          s.techniqueHint ? ` / ${s.techniqueHint}` : ""
        }${s.themes[0] ? ` / #${s.themes[0]}` : ""}] — ${s.note}`
    ),
  ].join("\n");
}
