import { digestRejectionTexts } from "../rejection-digest";

describe("rejection digester", () => {
  it("aggregates known failure modes into avoid/prefer curriculum guidance", () => {
    const digest = digestRejectionTexts(
      [
        "Answer-first visual cue contract failed: Missing catalog cue flower",
        "Answer-first visual cue contract failed: Missing text cue POT",
        "Semantic alignment failed (token-coverage): board cannot produce answer",
        "Pictogram lighthouse is pending human approval",
        "Random unrelated gateway timeout noise",
      ],
      { lookbackDays: 14, topN: 3 }
    );

    expect(digest.sampleSize).toBe(5);
    expect(digest.buckets[0]?.code).toBe("missing_seed_cues");
    expect(digest.buckets[0]?.count).toBe(2);
    expect(digest.avoidPatterns).toEqual(
      expect.arrayContaining([
        "Composing boards that omit host-owned answer-seed cues",
        "Boards whose visible parts cannot plausibly produce the answer",
      ])
    );
    expect(digest.preferPatterns).toEqual(
      expect.arrayContaining([
        "Place every mandatory catalog/text/operator cue before returning a draft",
        "Use reviewed catalog pictograms (or approved-cache) only",
      ])
    );
    expect(digest.notes.some((note) => note.includes("missing_seed_cues"))).toBe(true);
  });

  it("stays quiet when there are no reject texts", () => {
    const digest = digestRejectionTexts([]);
    expect(digest.sampleSize).toBe(0);
    expect(digest.avoidPatterns).toEqual([]);
    expect(digest.preferPatterns).toEqual([]);
  });
});
