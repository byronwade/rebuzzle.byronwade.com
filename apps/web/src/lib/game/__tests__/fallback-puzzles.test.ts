import {
  FALLBACK_PUZZLES,
  isUpgradeableSeedPuzzle,
  pickFallbackPuzzle,
} from "../fallback-puzzles";

describe("fallback puzzles", () => {
  it("has a rotating pool of fair Hard/Difficult seeds", () => {
    expect(FALLBACK_PUZZLES.length).toBeGreaterThanOrEqual(10);
    for (const p of FALLBACK_PUZZLES) {
      expect(p.difficulty).toBeGreaterThanOrEqual(4);
      expect(p.difficulty).toBeLessThanOrEqual(6);
      expect(p.hints.length).toBeGreaterThanOrEqual(2);
      expect(p.answer.trim().length).toBeGreaterThan(2);
    }
  });

  it("picks deterministically by UTC date", () => {
    const a = pickFallbackPuzzle("2026-08-01");
    const b = pickFallbackPuzzle("2026-08-01");
    const c = pickFallbackPuzzle("2026-08-02");
    expect(a).toEqual(b);
    expect(a.answer).not.toEqual(c.answer);
  });

  it("detects upgradeable seeds", () => {
    expect(
      isUpgradeableSeedPuzzle({
        aiGenerated: false,
        metadata: { fallbackReason: "Play-path", seedKind: "play_path" },
      })
    ).toBe(true);
    expect(
      isUpgradeableSeedPuzzle({
        aiGenerated: true,
        metadata: { aiGenerated: true },
      })
    ).toBe(false);
    expect(
      isUpgradeableSeedPuzzle({
        fallbackReason: "Daily guarantee seed",
        aiGenerated: false,
      })
    ).toBe(true);
  });
});
