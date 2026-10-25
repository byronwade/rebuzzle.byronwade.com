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
 * Choose a fresh, technique-compatible answer seed before the model invents a board.
 *
 * The generator still owns the creative composition, but the answer is no
 * longer allowed to drift independently from the curated phrase inventory.
 * This makes the visual a constrained backform problem instead of a free-form
 * answer followed by an optimistic explanation.
 */
export function selectAnswerFirstSeed(input: {
  entries: readonly PhraseBankEntry[];
  techniqueId: string;
  usedAnswerKeys?: Iterable<string>;
  requireVisualCuePlan?: boolean;
  targetDifficulty?: number;
}): PhraseBankEntry | undefined {
  const used = new Set(
    Array.from(input.usedAnswerKeys ?? [], (answer) => normalizeAnswerKey(answer)).filter(Boolean)
  );
  const fresh = input.entries.filter((entry) => {
    const answerKey = normalizeAnswerKey(entry.answer);
    return (
      Boolean(answerKey) &&
      !entry.overused &&
      !used.has(answerKey) &&
      (!input.requireVisualCuePlan || Boolean(entry.visualCues?.length))
    );
  });
  if (!fresh.length) return undefined;

  const compatible = fresh.filter((entry) =>
    entry.techniqueAffinity.some((technique) => technique === input.techniqueId)
  );
  if (Number.isFinite(input.targetDifficulty)) {
    compatible.sort(
      (a, b) =>
        Math.abs(a.difficultyHint - input.targetDifficulty!) -
        Math.abs(b.difficultyHint - input.targetDifficulty!)
    );
  }
  return compatible[0];
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
  requireVisualCuePlan?: boolean;
  targetDifficulty?: number;
}): PhraseBankEntry[] {
  if (!Number.isSafeInteger(input.count) || input.count <= 0 || !input.techniqueIds.length)
    return [];
  const used = new Set(
    Array.from(input.usedAnswerKeys ?? [], (answer) => normalizeAnswerKey(answer)).filter(Boolean)
  );
  const fresh = input.entries.filter((entry) => {
    const key = answerFirstSeedKey(entry);
    return (
      key &&
      !used.has(key) &&
      !entry.overused &&
      (!input.requireVisualCuePlan || Boolean(entry.visualCues?.length))
    );
  });
  const choices: Array<Array<{ key: string; entry: PhraseBankEntry }>> = [];
  const owner = new Map<string, number>();
  const selected: PhraseBankEntry[] = [];

  // Augmenting paths can move a flexible earlier seed to another valid answer,
  // freeing the only compatible answer for a constrained later slot. Collisions
  // use normalized answer keys, even when the bank contains duplicate variants.
  const reserve = (slot: number, visited: Set<string>): boolean => {
    const options = choices[slot]!;
    // Preserve earlier preferences when a free answer can satisfy this slot.
    for (const occupied of [false, true]) {
      for (const option of options) {
        if (owner.has(option.key) !== occupied || visited.has(option.key)) continue;
        visited.add(option.key);
        const prior = owner.get(option.key);
        if (prior === undefined || reserve(prior, visited)) {
          owner.set(option.key, slot);
          selected[slot] = option.entry;
          return true;
        }
      }
    }
    return false;
  };
  for (let slot = 0; slot < input.count; slot++) {
    const technique = input.techniqueIds[slot % input.techniqueIds.length]!;
    const compatible = fresh.filter((entry) =>
      entry.techniqueAffinity.some((id) => id === technique)
    );
    if (Number.isFinite(input.targetDifficulty)) {
      compatible.sort(
        (a, b) =>
          Math.abs(a.difficultyHint - input.targetDifficulty!) -
          Math.abs(b.difficultyHint - input.targetDifficulty!)
      );
    }
    const unique = new Map<string, PhraseBankEntry>();
    for (const entry of compatible) {
      const key = answerFirstSeedKey(entry)!;
      if (!unique.has(key)) unique.set(key, entry);
    }
    choices.push(Array.from(unique, ([key, entry]) => ({ key, entry })));
    if (!reserve(slot, new Set())) break;
  }
  return selected;
}

export function answerFirstSeedKey(seed: PhraseBankEntry | undefined): string | undefined {
  if (!seed) return undefined;
  const key = normalizeAnswerKey(seed.answer);
  return key || undefined;
}
