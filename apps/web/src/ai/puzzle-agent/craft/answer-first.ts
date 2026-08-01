/**
 * Answer-first sampling — pick a target phrase, then backform the board.
 */

import { samplePhraseBank } from "../apex/phrase-bank";
import type { PhraseBankEntry } from "../apex/types";
import { sampleFairIdioms } from "./idiom-frequency";
import { sampleMechanismWinners, type MechanismWinner } from "./mechanism-winners";

export type AnswerFirstSeed = {
  answer: string;
  source: "phrase-bank" | "idiom-corpus" | "mechanism-winner";
  techniqueHint?: string;
  pictogramNouns: string[];
  layerPlan?: string;
  note: string;
};

/**
 * Sample answer-first seeds for invent slots.
 */
export function sampleAnswerFirstSeeds(input: {
  targetDifficulty: number;
  preferredTechniques: string[];
  bannedAnswerKeys: Set<string> | string[];
  theme?: string;
  category?: string;
  limit?: number;
}): AnswerFirstSeed[] {
  const limit = Math.max(1, Math.min(10, input.limit ?? 5));
  const banned = new Set(
    [...input.bannedAnswerKeys].map((k) => k.toLowerCase().replace(/[^a-z0-9]+/g, ""))
  );

  const phrases = samplePhraseBank({
    targetDifficulty: input.targetDifficulty,
    preferredTechniques: input.preferredTechniques,
    bannedAnswerKeys: banned,
    theme: input.theme,
    category: input.category,
    limit: limit + 4,
  });

  const winners = sampleMechanismWinners({
    preferredTechniques: input.preferredTechniques,
    limit: 4,
  });

  const idioms = sampleFairIdioms({
    minFreq: input.targetDifficulty >= 8 ? 3 : 4,
    limit: 6,
    excludeOverused: true,
  });

  const seeds: AnswerFirstSeed[] = [];

  const pushPhrase = (p: PhraseBankEntry) => {
    const key = p.answer.toLowerCase().replace(/[^a-z0-9]+/g, "");
    if (banned.has(key)) return;
    if (p.overused) return;
    seeds.push({
      answer: p.answer,
      source: "phrase-bank",
      techniqueHint: p.techniqueAffinity[0],
      pictogramNouns: p.answer
        .toLowerCase()
        .split(/[^a-z]+/)
        .filter((w) => w.length >= 3)
        .slice(0, 2),
      note: "Backform ONE mechanism from this answer; invent a fresher cousin if needed",
    });
  };

  for (const p of phrases) {
    if (seeds.length >= limit) break;
    pushPhrase(p);
  }

  for (const w of winners) {
    if (seeds.length >= limit) break;
    const key = w.answer.toLowerCase().replace(/[^a-z0-9]+/g, "");
    if (banned.has(key)) continue;
    seeds.push({
      answer: w.answer,
      source: "mechanism-winner",
      techniqueHint: w.techniqueId,
      pictogramNouns: w.pictogramNouns,
      layerPlan: w.layerPlan,
      note: `Invent a cousin of winner pattern: ${w.whyItWorks}`,
    });
  }

  for (const idiom of idioms) {
    if (seeds.length >= limit) break;
    const key = idiom.toLowerCase().replace(/[^a-z0-9]+/g, "");
    if (banned.has(key)) continue;
    if (seeds.some((s) => s.answer === idiom)) continue;
    seeds.push({
      answer: idiom,
      source: "idiom-corpus",
      techniqueHint: "idiom_as_picture",
      pictogramNouns: idiom
        .split(/\s+/)
        .filter((w) => w.length >= 3 && !/^(the|and|a|of|in|on|to)$/i.test(w))
        .slice(0, 2),
      note: "Fair-frequency idiom — render literally with 1–2 concrete icons",
    });
  }

  return seeds.slice(0, limit);
}

export function formatAnswerFirstForPrompt(seeds: AnswerFirstSeed[]): string {
  if (!seeds.length) return "Answer-first: invent a fresh common phrase outside the ban list.";
  return [
    "Answer-first seeds (pick one, backform the board; cousins OK):",
    ...seeds.map(
      (s) =>
        `  - "${s.answer}" [${s.source}${s.techniqueHint ? ` / ${s.techniqueHint}` : ""}] — ${s.note}`
    ),
  ].join("\n");
}

export type { MechanismWinner };
