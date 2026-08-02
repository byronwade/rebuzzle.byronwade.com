import { auditStaticPuzzleCorpus } from "../static-audit";

describe("static puzzle preflight", () => {
  it("passes the complete no-spend corpus across every production profile", async () => {
    const report = await auditStaticPuzzleCorpus();

    expect(report.promotion).toEqual({ passed: true, failures: [] });
    expect(report.puzzleCount).toBe(93);
    expect(report.puzzlePassCount).toBe(93);
    expect(report.renderedProfileCount).toBe(279);
    expect(report.expectedRenderedProfileCount).toBe(279);
    expect(report.assetCount).toBe(47);
    expect(report.assetPassCount).toBe(47);
  });

  it("fails closed on answer leakage, fallback drift, and unknown techniques", async () => {
    const report = await auditStaticPuzzleCorpus({
      puzzles: [
        {
          id: "bad:static-preflight",
          source: "solve-corpus",
          answer: "answer",
          rebusPuzzle: "different",
          techniqueId: "not-a-technique",
          visual: {
            styleId: "ink-pictogram-v1",
            mode: "composed",
            layout: "row",
            unicodeFallback: "ANSWER",
            layers: [{ kind: "text", content: "ANSWER", emphasis: "normal" }],
          },
        },
      ],
    });

    expect(report.promotion.passed).toBe(false);
    expect(report.failures.join(" ")).toContain("does not equal");
    expect(report.failures.join(" ")).toContain("leaks the answer");
    expect(report.failures.join(" ")).toContain("Unknown technique");
  });
});
