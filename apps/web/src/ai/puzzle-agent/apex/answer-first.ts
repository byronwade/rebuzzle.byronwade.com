import { normalizeAnswerKey } from "../quality";
import type { PhraseBankEntry } from "./types";

export const ANSWER_FIRST_SEED_UNAVAILABLE_CODE = "APEX_ANSWER_FIRST_SEED_UNAVAILABLE" as const;

export class AnswerFirstSeedUnavailableError extends Error {
  readonly code = ANSWER_FIRST_SEED_UNAVAILABLE_CODE;
  readonly requestedCount: number;
  readonly selectedCount: number;

  constructor(input: { requestedCount: number; selectedCount: number }) {
    super(
      `Apex answer-first inventory could provide ${input.selectedCount}/${input.requestedCount} fresh seeds; refusing free-form generation`
    );
    this.name = "AnswerFirstSeedUnavailableError";
    this.requestedCount = input.requestedCount;
    this.selectedCount = input.selectedCount;
  }
}

/**
 * Choose a fresh answer seed before the model invents a board.
 *
 * The generator still owns the creative composition, but the answer is no
 * longer allowed to drift independently from the curated phrase inventory.
 * This makes the visual a constrained backform problem instead of a free-form
 * answer followed by an optimistic explanation.
 */
export function selectAnswerFirstSeed(input: {
  entries: readonly PhraseBankEntry[];
  techniqueId?: string;
  usedAnswerKeys?: Iterable<string>;
}): PhraseBankEntry | undefined {
  const used = new Set(
    Array.from(input.usedAnswerKeys ?? [], (answer) => normalizeAnswerKey(answer)).filter(Boolean)
  );
  const fresh = input.entries.filter((entry) => {
    const answerKey = normalizeAnswerKey(entry.answer);
    return Boolean(answerKey) && !entry.overused && !used.has(answerKey);
  });
  if (!fresh.length) return undefined;

  if (input.techniqueId) {
    const compatible = fresh.filter((entry) =>
      entry.techniqueAffinity.some((technique) => technique === input.techniqueId)
    );
    if (compatible.length) return compatible[0];
  }

  return fresh[0];
}

/**
 * Reserve distinct answer seeds for the complete Apex tournament before any
 * model call. A partial reservation would still permit a later free-form
 * candidate and make quality depend on how far the tournament got.
 */
export function selectAnswerFirstSeeds(input: {
  entries: readonly PhraseBankEntry[];
  techniqueIds: readonly string[];
  count: number;
  usedAnswerKeys?: Iterable<string>;
}): PhraseBankEntry[] {
  const used = new Set(
    Array.from(input.usedAnswerKeys ?? [], (answer) => normalizeAnswerKey(answer)).filter(Boolean)
  );
  const selected: PhraseBankEntry[] = [];

  for (let index = 0; index < input.count; index++) {
    const techniqueId = input.techniqueIds[index % Math.max(1, input.techniqueIds.length)];
    const seed = selectAnswerFirstSeed({
      entries: input.entries,
      techniqueId,
      usedAnswerKeys: used,
    });
    const key = answerFirstSeedKey(seed);
    if (!seed || !key) break;
    selected.push(seed);
    used.add(key);
  }

  return selected;
}

export function answerFirstSeedKey(seed: PhraseBankEntry | undefined): string | undefined {
  if (!seed) return undefined;
  const key = normalizeAnswerKey(seed.answer);
  return key || undefined;
}
