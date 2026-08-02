import { buildPuzzleSolveBenchmarkCorpus } from "../benchmark/puzzle-corpus";
import type { PuzzleVisual } from "../visual/composition";

export type PuzzlePlaytestControl = {
  id: string;
  answer: string;
  visual: PuzzleVisual;
};

/**
 * Frozen, deliberately easy compound rebuses used only to qualify reviewers.
 *
 * These are objective attention/task-understanding checks, not representative
 * generator samples. Their decisions must never enter puzzle-quality metrics.
 */
const CONTROL_CASE_IDS = [
  "literal:sunflower",
  "literal:moonlight",
  "literal:keyboard",
  "literal:starfish",
  "literal:houseboat",
  "literal:firework",
] as const;

export function buildPuzzlePlaytestControlCorpus(): PuzzlePlaytestControl[] {
  const fixtures = new Map(
    buildPuzzleSolveBenchmarkCorpus().map((fixture) => [fixture.id, fixture])
  );
  return CONTROL_CASE_IDS.map((id) => {
    const fixture = fixtures.get(id);
    if (!fixture) throw new Error(`Missing frozen puzzle playtest control: ${id}`);
    return {
      id,
      answer: fixture.answer,
      visual: fixture.visual,
    };
  });
}
