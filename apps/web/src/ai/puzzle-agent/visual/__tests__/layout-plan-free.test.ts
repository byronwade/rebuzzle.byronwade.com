import { layoutLayersLocked, layoutPuzzleBoard, planLockedRowIndexes } from "../layout-plan";
import { getPuzzleBoardRecognitionProfile } from "../presentation";

describe("free layout plan", () => {
  it("places layers from percentage coordinates", () => {
    const visual = {
      layout: "free" as const,
      layers: [
        { kind: "text" as const, content: "A", x: 25, y: 40 },
        { kind: "text" as const, content: "─", x: 25, y: 20 },
      ],
    };

    expect(planLockedRowIndexes(visual)).toEqual([[0, 1]]);

    const profile = getPuzzleBoardRecognitionProfile("compact-320");
    const plan = layoutLayersLocked(visual, profile);
    expect(plan.positions).toHaveLength(2);
    expect(plan.positions[1]!.y).toBeLessThan(plan.positions[0]!.y);
    expect(plan.locked).toBe(true);
  });

  it("preserves saved and default free-layout centers through the shared profile API", () => {
    const visual = {
      layout: "free" as const,
      layers: [
        { kind: "text" as const, content: "A", x: 25, y: 40 },
        { kind: "text" as const, content: "B", x: 70 },
        { kind: "text" as const, content: "C" },
      ],
    };

    const profile = getPuzzleBoardRecognitionProfile("desktop-768");
    expect(layoutPuzzleBoard(visual, "desktop-768")).toEqual(layoutLayersLocked(visual, profile));
  });
});
