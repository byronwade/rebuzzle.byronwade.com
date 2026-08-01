import { sampleAnswerFirstSeeds } from "../answer-first";
import { scoreHintFairness } from "../hint-fairness";
import {
  isIdiomFairForDaily,
  sampleFairIdioms,
} from "../idiom-frequency";
import {
  mechanismWinnersBrief,
  sampleMechanismWinners,
} from "../mechanism-winners";
import {
  formatPhoneticGraphForPrompt,
  lookupPhoneticCues,
} from "../phonetic-graph";
import { scoreShareability } from "../shareability";

describe("mechanism winners", () => {
  it("prefers matching techniques", () => {
    const winners = sampleMechanismWinners({
      preferredTechniques: ["brand_logo_wordplay"],
      limit: 3,
    });
    expect(winners[0]?.techniqueId).toBe("brand_logo_wordplay");
    expect(mechanismWinnersBrief(winners)).toMatch(/cousin/i);
  });
});

describe("answer-first seeds", () => {
  it("samples non-banned seeds", () => {
    const seeds = sampleAnswerFirstSeeds({
      targetDifficulty: 8,
      preferredTechniques: ["idiom_as_picture", "single_homophone"],
      bannedAnswerKeys: ["belief", "spillthetea"],
      limit: 5,
    });
    expect(seeds.length).toBeGreaterThan(0);
    expect(
      seeds.every(
        (s) =>
          s.answer.toLowerCase().replace(/[^a-z0-9]+/g, "") !== "belief" &&
          s.answer.toLowerCase().replace(/[^a-z0-9]+/g, "") !== "spillthetea"
      )
    ).toBe(true);
  });
});

describe("phonetic graph", () => {
  it("finds bee → be edges", () => {
    const cues = lookupPhoneticCues("belief", 4);
    expect(cues.some((c) => c.cue === "bee" || c.sound === "be")).toBe(true);
    expect(formatPhoneticGraphForPrompt(cues)).toMatch(/Phonetic graph/);
  });
});

describe("idiom frequency", () => {
  it("accepts well-known idioms and rejects sensitive ones", () => {
    expect(isIdiomFairForDaily("spill the tea").ok).toBe(true);
    expect(isIdiomFairForDaily("kill two birds with one stone").ok).toBe(false);
    expect(sampleFairIdioms({ limit: 3 }).length).toBeGreaterThan(0);
  });
});

describe("hint fairness", () => {
  it("scores a progressive ladder highly", () => {
    const result = scoreHintFairness({
      hints: [
        "This is a compound rebus — icons join.",
        "Read two pictures left to right.",
        "Category starts with thinking about the first word.",
        'Final nudge: starts with "K".',
      ],
      answer: "keyhole",
      tierLabel: "Hard",
    });
    expect(result.ok).toBe(true);
    expect(result.score).toBeGreaterThanOrEqual(55);
  });

  it("fails when early hints skip the device family", () => {
    const result = scoreHintFairness({
      hints: ["Something fun", "Keep going", "Nearly there", "Letter K"],
      answer: "keyhole",
    });
    expect(result.ok).toBe(false);
  });
});

describe("shareability", () => {
  it("accepts structured share text", () => {
    const result = scoreShareability({
      unicodeFallback: "🔑 + 👁",
      answer: "keyhole",
      pictogramCount: 2,
    });
    expect(result.ok).toBe(true);
  });

  it("rejects answer leaks and emoji salad", () => {
    expect(
      scoreShareability({
        unicodeFallback: "keyhole!!",
        answer: "keyhole",
      }).ok
    ).toBe(false);
    expect(
      scoreShareability({
        unicodeFallback: "😀😃😄😁😆",
        answer: "smile",
      }).ok
    ).toBe(false);
  });
});
