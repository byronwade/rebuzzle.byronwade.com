/**
 * Answer-first sampling — DEFAULT invent path.
 * Pick a scored corpus answer, then backform the board (never freestyle the answer first).
 */

import { samplePhraseBank } from "../apex/phrase-bank";
import type { PhraseBankEntry } from "../apex/types";
import {
  formatCorpusSeedsForPrompt,
  sampleAnswerCorpus,
} from "./corpus/sample";
import { sampleFairIdioms } from "./idiom-frequency";
import { sampleMechanismWinners, type MechanismWinner } from "./mechanism-winners";

export type AnswerFirstSeed = {
  answer: string;
  source:
    | "answer-corpus"
    | "phrase-bank"
    | "idiom-corpus"
    | "mechanism-winner";
  techniqueHint?: string;
  pictogramNouns: string[];
  layerPlan?: string;
  themes?: string[];
  wordCount?: number;
  note: string;
};

/**
 * Sample answer-first seeds for invent slots.
 * Corpus is primary; phrase-bank / idioms / winners fill gaps.
 */
export function sampleAnswerFirstSeeds(input: {
  targetDifficulty: number;
  preferredTechniques: string[];
  bannedAnswerKeys: Set<string> | string[];
  theme?: string;
  category?: string;
  limit?: number;
}): AnswerFirstSeed[] {
  const limit = Math.max(1, Math.min(12, input.limit ?? 8));
  const banned = new Set(
    [...input.bannedAnswerKeys].map((k) => k.toLowerCase().replace(/[^a-z0-9]+/g, ""))
  );

  const corpusSeeds = sampleAnswerCorpus({
    targetDifficulty: input.targetDifficulty,
    preferredTechniques: input.preferredTechniques,
    bannedAnswerKeys: banned,
    theme: input.theme,
    category: input.category,
    limit: limit + 4,
    preferMultiWord: input.targetDifficulty >= 7,
  });

  const phrases = samplePhraseBank({
    targetDifficulty: input.targetDifficulty,
    preferredTechniques: input.preferredTechniques,
    bannedAnswerKeys: banned,
    theme: input.theme,
    category: input.category,
    limit: 4,
  });

  const winners = sampleMechanismWinners({
    preferredTechniques: input.preferredTechniques,
    limit: 3,
  });

  const idioms = sampleFairIdioms({
    minFreq: input.targetDifficulty >= 8 ? 3 : 4,
    limit: 4,
    excludeOverused: true,
  });

  const seeds: AnswerFirstSeed[] = [];
  const seen = new Set<string>();

  const push = (seed: AnswerFirstSeed) => {
    const key = seed.answer.toLowerCase().replace(/[^a-z0-9]+/g, "");
    if (!key || banned.has(key) || seen.has(key)) return;
    seen.add(key);
    seeds.push(seed);
  };

  // 1) Large scored corpus (primary)
  for (const c of corpusSeeds) {
    if (seeds.length >= limit) break;
    push({
      answer: c.answer,
      source: "answer-corpus",
      techniqueHint: c.techniqueHint,
      pictogramNouns: c.pictogramNouns ?? [],
      themes: c.themes,
      wordCount: c.wordCount,
      note: c.note,
    });
  }

  // 2) Legacy phrase bank
  for (const p of phrases) {
    if (seeds.length >= limit) break;
    if (p.overused) continue;
    push({
      answer: p.answer,
      source: "phrase-bank",
      techniqueHint: p.techniqueAffinity[0],
      pictogramNouns: p.answer
        .toLowerCase()
        .split(/[^a-z]+/)
        .filter((w) => w.length >= 3)
        .slice(0, 2),
      wordCount: p.answer.trim().split(/\s+/).length,
      note: "Backform ONE mechanism from this answer",
    });
  }

  // 3) Mechanism winners (cousin patterns)
  for (const w of winners) {
    if (seeds.length >= limit) break;
    push({
      answer: w.answer,
      source: "mechanism-winner",
      techniqueHint: w.techniqueId,
      pictogramNouns: w.pictogramNouns,
      layerPlan: w.layerPlan,
      wordCount: w.answer.trim().split(/\s+/).length,
      note: `Invent a cousin of winner pattern: ${w.whyItWorks}`,
    });
  }

  // 4) Fair idioms
  for (const idiom of idioms) {
    if (seeds.length >= limit) break;
    push({
      answer: idiom,
      source: "idiom-corpus",
      techniqueHint: "idiom_as_picture",
      pictogramNouns: idiom
        .split(/\s+/)
        .filter((w) => w.length >= 3 && !/^(the|and|a|of|in|on|to)$/i.test(w))
        .slice(0, 2),
      wordCount: idiom.trim().split(/\s+/).length,
      note: "Fair-frequency idiom — render literally with 1–2 concrete icons",
    });
  }

  return seeds.slice(0, limit);
}

export function formatAnswerFirstForPrompt(seeds: AnswerFirstSeed[]): string {
  if (!seeds.length) {
    return "ANSWER-FIRST required: invent a fair multi-word phrase outside the ban list, then backform the board.";
  }

  const corpusOnly = seeds.filter((s) => s.source === "answer-corpus");
  const header =
    corpusOnly.length > 0
      ? formatCorpusSeedsForPrompt(
          corpusOnly.map((s) => ({
            answer: s.answer,
            frequency: 4,
            kind: "phrase",
            themes: s.themes ?? [],
            techniques: s.techniqueHint ? [s.techniqueHint] : [],
            wordCount: s.wordCount ?? s.answer.split(/\s+/).length,
            pictogramNouns: s.pictogramNouns,
            source: "answer-corpus" as const,
            techniqueHint: s.techniqueHint,
            note: s.note,
          }))
        )
      : "ANSWER-FIRST (required): pick ONE seed and build the board from it.";

  const extras = seeds.filter((s) => s.source !== "answer-corpus");
  if (!extras.length) return header;

  return [
    header,
    "Supplemental seeds:",
    ...extras.map(
      (s) =>
        `  - "${s.answer}" [${s.source}${s.techniqueHint ? ` / ${s.techniqueHint}` : ""}] — ${s.note}`
    ),
  ].join("\n");
}

export type { MechanismWinner, PhraseBankEntry };
