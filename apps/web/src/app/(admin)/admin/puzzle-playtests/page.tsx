"use client";

import { PuzzlePlaytestsShell } from "./puzzle-playtests-shell";
import { usePuzzlePlaytests } from "./use-puzzle-playtests";

export function PuzzlePlaytestsPageInner(props: any) {
  const state = usePuzzlePlaytests(props);
  return <PuzzlePlaytestsShell {...state} />;
}
