import type { PuzzleVisual } from "../composition";
import { layoutLayersLocked, lockedGridColumns, planLockedRowIndexes } from "../layout-plan";
import { getPuzzleBoardRecognitionProfile } from "../presentation";

function longRowVisual(): PuzzleVisual {
  return {
    styleId: "ink-pictogram-v1",
    mode: "composed",
    layout: "row",
    unicodeFallback: "A + B + C + D + E + F + G",
    layers: Array.from({ length: 7 }, (_, index) =>
      index % 2 === 0
        ? {
            kind: "text" as const,
            content: `PART${index}`,
            emphasis: "normal" as const,
          }
        : { kind: "operator" as const, symbol: "+" }
    ),
  };
}

describe("layout lock", () => {
  it("locks grid columns independent of viewport width", () => {
    expect(lockedGridColumns(2)).toBe(2);
    expect(lockedGridColumns(4)).toBe(2);
    expect(lockedGridColumns(5)).toBe(3);
  });

  it("keeps identical row membership across recognition profiles", () => {
    const visual = longRowVisual();
    const rowIndexes = planLockedRowIndexes(visual);
    expect(rowIndexes.length).toBeGreaterThan(1);

    const compact = layoutLayersLocked(
      visual,
      getPuzzleBoardRecognitionProfile("compact-320"),
      rowIndexes
    );
    const mobile = layoutLayersLocked(
      visual,
      getPuzzleBoardRecognitionProfile("mobile-375"),
      rowIndexes
    );
    const desktop = layoutLayersLocked(
      visual,
      getPuzzleBoardRecognitionProfile("desktop-768"),
      rowIndexes
    );

    expect(compact.rowIndexes).toEqual(rowIndexes);
    expect(mobile.rowIndexes).toEqual(rowIndexes);
    expect(desktop.rowIndexes).toEqual(rowIndexes);
    expect(compact.wrappedRows).toBe(mobile.wrappedRows);
    expect(mobile.wrappedRows).toBe(desktop.wrappedRows);
    expect(compact.locked).toBe(true);
  });

  it("uses stack as one-layer-per-row membership", () => {
    const visual: PuzzleVisual = {
      styleId: "ink-pictogram-v1",
      mode: "composed",
      layout: "stack",
      unicodeFallback: "A\nB",
      layers: [
        { kind: "text", content: "A", emphasis: "normal" },
        { kind: "text", content: "B", emphasis: "normal" },
      ],
    };
    expect(planLockedRowIndexes(visual)).toEqual([[0], [1]]);
  });
});
