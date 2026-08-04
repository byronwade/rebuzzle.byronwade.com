import {
  evaluateNearMissStress,
  findAnswerNearMisses,
  normalizePhraseForNearMiss,
} from "../near-miss-stress";

describe("near-miss stress", () => {
  it("normalizes punctuation while keeping spaces", () => {
    expect(normalizePhraseForNearMiss("Hold-On!")).toBe("hold on");
  });

  it("flags multi-word phrase containment and plural cousins", () => {
    expect(
      findAnswerNearMisses("hold on", ["hold on tight", "hold", "keyboard"])
    ).toEqual(["hold on tight"]);
    expect(findAnswerNearMisses("cats", ["cat", "dog"])).toEqual(["cat"]);
  });

  it("does not flag compound substrings like sunflower/flower", () => {
    expect(findAnswerNearMisses("sunflower", ["flower", "sun", "moonlight"])).toEqual([]);
  });

  it("passes unique answers against the phrase bank", () => {
    expect(evaluateNearMissStress({ answer: "keyboard" }).ok).toBe(true);
    expect(evaluateNearMissStress({ answer: "sunflower" }).ok).toBe(true);
  });

  it("fails when an extra candidate is a near miss", () => {
    const result = evaluateNearMissStress({
      answer: "hold on",
      extraCandidates: ["hold on tight"],
    });
    expect(result.ok).toBe(false);
    expect(result.nearMisses).toContain("hold on tight");
  });

  it("can score blind wrong parses without consulting the phrase bank", () => {
    const result = evaluateNearMissStress({
      answer: "hold on",
      extraCandidates: ["hold on tight"],
      includePhraseBank: false,
    });
    expect(result.ok).toBe(false);
    expect(result.nearMisses).toEqual(["hold on tight"]);
  });
});
