/**
 * Scored answer corpus types — uniqueness scales with fair answer variety.
 */

import type { TechniqueId } from "../../technique-library";

export type AnswerKind =
  | "compound"
  | "phrase"
  | "phrasal"
  | "idiom"
  | "phonetic"
  | "hyphen"
  | "direction"
  | "letter"
  | "template"
  | "brand";

export type ThemePackId =
  | "nature"
  | "food"
  | "home"
  | "work"
  | "sports"
  | "music"
  | "travel"
  | "weather"
  | "animals"
  | "body"
  | "time"
  | "money"
  | "emotion"
  | "tech"
  | "school"
  | "city"
  | "water"
  | "fire"
  | "light"
  | "story"
  | "general";

export type CorpusEntry = {
  answer: string;
  /** 1 = niche, 5 = everyone knows it */
  frequency: number;
  kind: AnswerKind | string;
  themes: string[];
  techniques: string[];
  wordCount: number;
  overused?: boolean;
  pictogramNouns?: string[];
};

export type CorpusFile = {
  version: number;
  generatedAt: string;
  count: number;
  themes: string[];
  entries: CorpusEntry[];
};

export type SampledCorpusAnswer = CorpusEntry & {
  techniqueHint?: TechniqueId | string;
  source: "answer-corpus";
  note: string;
};
