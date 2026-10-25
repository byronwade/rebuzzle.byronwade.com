/**
 * Research-screened answer seeds.
 *
 * Every reserved Apex answer is researched on the web before any candidate is
 * generated. Seeds whose corroborated evidence says "avoid" (obscure or
 * sensitive) are swapped for the next fresh seed; the rest carry a cited
 * answer brief into generation and critique.
 */

import { AI_CONFIG } from "../../config";
import { isHardAIBudgetError, parseAIError } from "../../errors";
import {
  formatPhraseResearchForPrompt,
  type PhraseResearch,
  researchAnswerPhrase,
  toStoredAnswerResearch,
} from "../../research/phrase-research";
import type { StoredAnswerResearch } from "../../research/types";
import { normalizeAnswerKey } from "../quality";
import { answerFirstSeedKey, selectAnswerFirstSeeds } from "./answer-first";
import type { PhraseBankEntry } from "./types";

interface ResearchedSeed {
  entry: PhraseBankEntry;
  /** Technique slot the seed was reserved for, kept through filtering. */
  techniqueId?: string;
  research?: StoredAnswerResearch;
  /** Prompt block with corroborated facts, when research found any. */
  brief?: string;
}

interface SeedScreenResult {
  seeds: ResearchedSeed[];
  rejected: Array<{ answer: string; reasons: string[] }>;
  researched: number;
  /** The phrase inventory itself could not fill the tournament. */
  inventoryShort: boolean;
}

type Researcher = (answer: string) => Promise<PhraseResearch>;

/** Bound research latency: the tournament's runtime budget is shared. */
async function researchWithDeadline(
  answer: string,
  researcher: Researcher,
  deadlineMs: number
): Promise<PhraseResearch | undefined> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const pending = researcher(answer);
  // A late result still lands in the research cache for the next-day blog.
  pending.catch(() => undefined);
  try {
    return await Promise.race([
      pending,
      new Promise<undefined>((resolve) => {
        timer = setTimeout(() => resolve(undefined), deadlineMs);
      }),
    ]);
  } catch (error) {
    if (isHardAIBudgetError(error)) throw parseAIError(error);
    return undefined;
  } finally {
    if (timer) clearTimeout(timer);
  }
}

export async function screenAnswerSeedsWithResearch(input: {
  entries: readonly PhraseBankEntry[];
  techniqueIds: readonly string[];
  count: number;
  usedAnswerKeys?: Iterable<string>;
  requireVisualCuePlan?: boolean;
  researcher?: Researcher;
  enabled?: boolean;
  gate?: boolean;
  maxReplacements?: number;
  deadlineMs?: number;
}): Promise<SeedScreenResult> {
  const enabled = input.enabled ?? AI_CONFIG.research.enabled;
  const gate = input.gate ?? AI_CONFIG.research.seedGate;
  const maxReplacements = input.maxReplacements ?? AI_CONFIG.research.maxSeedReplacements;
  const deadlineMs = input.deadlineMs ?? AI_CONFIG.research.seedDeadlineMs;
  const researcher = input.researcher ?? researchAnswerPhrase;
  const used = new Set(
    Array.from(input.usedAnswerKeys ?? [], (answer) => normalizeAnswerKey(answer)).filter(Boolean)
  );

  const select = () =>
    selectAnswerFirstSeeds({
      entries: input.entries,
      techniqueIds: input.techniqueIds,
      count: input.count,
      usedAnswerKeys: used,
      requireVisualCuePlan: input.requireVisualCuePlan,
    });

  // selectAnswerFirstSeeds reserves seed i for techniqueIds[i % n].
  const slotTechnique = (index: number) =>
    input.techniqueIds[index % Math.max(1, input.techniqueIds.length)];

  let selection = select();
  const inventoryShort = selection.length < input.count;
  if (!enabled || inventoryShort) {
    return {
      seeds: selection.map((entry, index) => ({ entry, techniqueId: slotTechnique(index) })),
      rejected: [],
      researched: 0,
      inventoryShort,
    };
  }

  const researchByKey = new Map<string, PhraseResearch | undefined>();
  const rejected: SeedScreenResult["rejected"] = [];

  for (let round = 0; round <= maxReplacements; round++) {
    const pending = selection.filter((entry) => {
      const key = answerFirstSeedKey(entry);
      return key && !researchByKey.has(key);
    });
    const results = await Promise.all(
      pending.map((entry) => researchWithDeadline(entry.answer, researcher, deadlineMs))
    );
    pending.forEach((entry, index) => {
      const key = answerFirstSeedKey(entry);
      if (key) researchByKey.set(key, results[index]);
    });

    if (!gate) break;
    const avoid = selection.filter(
      (entry) => researchByKey.get(answerFirstSeedKey(entry) ?? "")?.verdict === "avoid"
    );
    if (!avoid.length || rejected.length >= maxReplacements) break;

    for (const entry of avoid.slice(0, maxReplacements - rejected.length)) {
      const key = answerFirstSeedKey(entry);
      if (key) used.add(key);
      rejected.push({
        answer: entry.answer,
        reasons: researchByKey.get(key ?? "")?.verdictReasons ?? [],
      });
    }
    const next = select();
    // Never let research shrink the tournament below one reserved seed.
    if (!next.length) break;
    selection = next;
  }

  const seeds = selection
    .map((entry, index) => ({ entry, techniqueId: slotTechnique(index) }))
    .filter(({ entry }, _index, all) => {
      if (!gate || all.length <= 1) return true;
      return researchByKey.get(answerFirstSeedKey(entry) ?? "")?.verdict !== "avoid";
    })
    .map(({ entry, techniqueId }): ResearchedSeed => {
      const research = researchByKey.get(answerFirstSeedKey(entry) ?? "");
      if (!research) return { entry, techniqueId };
      return {
        entry,
        techniqueId,
        research: toStoredAnswerResearch(research),
        brief: formatPhraseResearchForPrompt(research),
      };
    });

  return {
    seeds,
    rejected,
    researched: [...researchByKey.values()].filter((r) => r?.dossier.status === "researched")
      .length,
    inventoryShort,
  };
}
