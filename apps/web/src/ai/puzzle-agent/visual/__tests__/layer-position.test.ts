import {
  clampPosition,
  defaultPositionForIndex,
  layerPositionDeltaFromPixels,
  layerPositionFromBounds,
  layerPositionsFromBounds,
  nudgePosition,
  STUDIO_GRID_STEP,
  snapPosition,
  snapToGrid,
} from "../layer-position";

describe("layer-position", () => {
  it("clamps positions into the artboard", () => {
    expect(clampPosition(-10)).toBe(0);
    expect(clampPosition(150)).toBe(100);
    expect(clampPosition(42)).toBe(42);
  });

  it("snaps to the studio grid", () => {
    expect(snapToGrid(12)).toBe(10);
    expect(snapToGrid(13)).toBe(15);
    expect(snapPosition({ x: 22, y: 48 })).toEqual({ x: 20, y: 50 });
    expect(STUDIO_GRID_STEP).toBe(5);
  });

  it("cascades default placements", () => {
    expect(defaultPositionForIndex(0)).toEqual({ x: 30, y: 30 });
    expect(defaultPositionForIndex(1).x).toBeGreaterThan(defaultPositionForIndex(0).x);
  });

  it("converts a displayed pixel frame center into the inner free-canvas percentages", () => {
    expect(
      layerPositionFromBounds(
        { x: 270, y: 165, width: 60, height: 70 },
        { width: 600, height: 400, padding: 50 }
      )
    ).toEqual({ x: 50, y: 50 });
  });

  it("converts locked-layout centers against the destination free frame", () => {
    const lockedBounds = [
      { x: 348, y: 24, width: 72, height: 72 },
      { x: 432, y: 24, width: 72, height: 72 },
    ];
    const freeFrame = { width: 768, height: 498, padding: 24 };
    const positions = layerPositionsFromBounds(lockedBounds, freeFrame);

    expect(positions[0]!.x).toBeCloseTo(50);
    expect(positions[0]!.y).toBeCloseTo(8);
    expect(positions[1]!.x).toBeCloseTo(61.666666666666664);
    expect(positions[1]!.y).toBeCloseTo(8);
    expect(
      positions.map(({ x, y }) => ({
        x: freeFrame.padding + (x / 100) * (freeFrame.width - freeFrame.padding * 2),
        y: freeFrame.padding + (y / 100) * (freeFrame.height - freeFrame.padding * 2),
      }))
    ).toEqual([
      expect.objectContaining({ x: expect.closeTo(384), y: expect.closeTo(60) }),
      expect.objectContaining({ x: expect.closeTo(468), y: expect.closeTo(60) }),
    ]);
  });

  it.each([
    ["ArrowLeft", { x: 25, y: 50 }],
    ["ArrowRight", { x: 35, y: 50 }],
    ["ArrowUp", { x: 30, y: 45 }],
    ["ArrowDown", { x: 30, y: 55 }],
  ] as const)("nudges a Studio layer with %s", (key, expected) => {
    expect(nudgePosition({ x: 30, y: 50 }, key)).toEqual(expected);
  });

  it("converts pointer movement relative to content size and ignores zero-sized axes", () => {
    expect(layerPositionDeltaFromPixels({ x: 10, y: 10 }, { width: 500, height: 0 })).toEqual({
      x: 2,
      y: 0,
    });
  });
});
