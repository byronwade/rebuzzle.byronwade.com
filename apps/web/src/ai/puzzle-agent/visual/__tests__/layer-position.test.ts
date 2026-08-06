import {
  clampPosition,
  defaultPositionForIndex,
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
});
