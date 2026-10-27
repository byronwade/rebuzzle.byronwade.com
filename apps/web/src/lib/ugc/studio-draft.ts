/**
 * Studio autosave: the board in progress lives in localStorage so leaving the
 * editor (or the tab) never loses work, the way a game keeps your save slot.
 * Storage can be missing or throw (private windows, blocked site data), so
 * every access is guarded and Studio works without it.
 */

import type { PuzzleVisual, VisualLayer } from "@/ai/puzzle-agent/visual/composition";

const STORAGE_KEY = "rebuzzle:studio-draft:v1";

export type StudioDraft = {
  draftId?: string;
  title: string;
  answer: string;
  explanation: string;
  hints: string[];
  techniqueId: string;
  difficulty: number;
  layout: PuzzleVisual["layout"];
  layers: VisualLayer[];
  savedAt: number;
};

export function loadStudioDraft(): StudioDraft | null {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const draft = JSON.parse(raw) as StudioDraft;
    if (!Array.isArray(draft.layers) || !Array.isArray(draft.hints)) return null;
    return draft;
  } catch {
    return null;
  }
}

export function saveStudioDraft(draft: StudioDraft) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(draft));
  } catch {
    /* storage full or blocked: autosave is a convenience */
  }
}

export function clearStudioDraft() {
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

/** True when a draft holds anything worth offering back to the player. */
export function draftHasContent(draft: StudioDraft | null): draft is StudioDraft {
  return Boolean(draft && (draft.layers.length > 0 || draft.answer.trim()));
}

/** Loose answer match for test play: case, spacing and punctuation don't count. */
export function normalizeStudioGuess(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]/g, "");
}
