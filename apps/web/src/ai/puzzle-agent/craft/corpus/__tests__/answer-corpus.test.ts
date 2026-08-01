import {
  mechanismFingerprint,
  mechanismSimilarity,
} from "../../mechanism-fingerprint";
import { sampleAnswerFirstSeeds } from "../../answer-first";
import {
  corpusSize,
  corpusStats,
  corpusTier,
  listThemePacks,
  sampleAnswerCorpus,
} from "../sample";

describe("answer corpus", () => {
  it("loads thousands of scored answers with a gold tier", () => {
    expect(corpusSize()).toBeGreaterThan(5000);
    expect(listThemePacks().length).toBeGreaterThan(5);
    const stats = corpusStats();
    expect(stats.gold).toBeGreaterThan(50);
    expect(stats.bronze).toBeGreaterThan(0);
  });

  it("prefers gold / non-template when sampling", () => {
    const seeds = sampleAnswerCorpus({
      targetDifficulty: 8,
      preferredTechniques: ["idiom_as_picture", "container_phrase", "letter_play"],
      bannedAnswerKeys: ["pieceofcake", "sunflower"],
      preferMultiWord: true,
      preferGold: true,
      preferAnswerPatterns: ["multi_word_2", "multi_word_3plus"],
      limit: 8,
    });
    expect(seeds.length).toBeGreaterThan(0);
    expect(seeds.every((s) => s.answer.toLowerCase() !== "piece of cake")).toBe(
      true
    );
    expect(seeds.some((s) => s.wordCount >= 2)).toBe(true);
    expect(seeds.every((s) => corpusTier(s) !== "bronze" || s.kind !== "template")).toBe(
      true
    );
  });

  it("samples non-banned multi-word answers for hard tiers", () => {
    const seeds = sampleAnswerCorpus({
      targetDifficulty: 8,
      preferredTechniques: ["idiom_as_picture", "container_phrase", "letter_play"],
      bannedAnswerKeys: ["pieceofcake", "sunflower"],
      preferMultiWord: true,
      limit: 8,
    });
    expect(seeds.length).toBeGreaterThan(0);
    expect(seeds.every((s) => s.answer.toLowerCase() !== "piece of cake")).toBe(
      true
    );
    expect(seeds.some((s) => s.wordCount >= 2)).toBe(true);
  });

  it("respects theme packs when available", () => {
    const seeds = sampleAnswerCorpus({
      targetDifficulty: 7,
      preferredTechniques: ["idiom_as_picture"],
      bannedAnswerKeys: [],
      theme: "food",
      limit: 5,
      allowTemplates: true,
    });
    expect(seeds.length).toBeGreaterThan(0);
  });
});

describe("answer-first default", () => {
  it("prefers corpus seeds", () => {
    const seeds = sampleAnswerFirstSeeds({
      targetDifficulty: 8,
      preferredTechniques: ["container_phrase", "letter_play", "idiom_as_picture"],
      bannedAnswerKeys: [],
      limit: 6,
    });
    expect(seeds.length).toBeGreaterThan(0);
    expect(seeds.some((s) => s.source === "answer-corpus")).toBe(true);
  });
});

describe("mechanism fingerprint", () => {
  it("matches identical boards and differs for distinct concepts", () => {
    const a = {
      answer: "cat in the bag",
      techniqueId: "container_phrase",
      visual: {
        styleId: "ink-pictogram-v1" as const,
        mode: "composed" as const,
        layout: "overlay" as const,
        unicodeFallback: "🐱⊂👜",
        layers: [
          { kind: "pictogram" as const, concept: "cat" },
          { kind: "pictogram" as const, concept: "bag" },
        ],
      },
    };
    const clone = { ...a };
    const other = {
      ...a,
      answer: "dog in the house",
      visual: {
        ...a.visual,
        layers: [
          { kind: "pictogram" as const, concept: "dog" },
          { kind: "pictogram" as const, concept: "house" },
        ],
      },
    };
    expect(mechanismFingerprint(a)).toBe(mechanismFingerprint(clone));
    expect(mechanismSimilarity(a, clone)).toBeGreaterThanOrEqual(0.88);
    expect(mechanismSimilarity(a, other)).toBeLessThan(0.88);
  });
});
