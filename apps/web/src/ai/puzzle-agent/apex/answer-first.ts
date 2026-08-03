import { normalizeAnswerKey } from "../quality";
import type { PhraseBankEntry } from "./types";

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
  const fresh = input.entries.filter(
    (entry) => !entry.overused && !used.has(normalizeAnswerKey(entry.answer))
  );
  if (!fresh.length) return undefined;

  if (input.techniqueId) {
    const compatible = fresh.filter((entry) =>
      entry.techniqueAffinity.some((technique) => technique === input.techniqueId)
    );
    if (compatible.length) return compatible[0];
  }

  return fresh[0];
}

export function answerFirstSeedKey(seed: PhraseBankEntry | undefined): string | undefined {
  if (!seed) return undefined;
  const key = normalizeAnswerKey(seed.answer);
  return key || undefined;
}
