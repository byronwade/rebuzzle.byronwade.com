import { MAX_FREE_CANVAS_HEIGHT, type PuzzleVisual, PuzzleVisualSchema } from "../composition";
import { layerPositionsFromBounds } from "../layer-position";
import {
  layoutLayersLocked,
  layoutPuzzleBoard,
  lockedGridColumns,
  planLockedRowIndexes,
} from "../layout-plan";
import { getLargePlayerLayout, getPuzzleBoardRecognitionProfile } from "../presentation";

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
  it("wraps large pictogram rows so every supported player width stays in bounds", () => {
    const visual: PuzzleVisual = {
      styleId: "ink-pictogram-v1",
      mode: "composed",
      layout: "row",
      unicodeFallback: "FIVE KEYS",
      layers: Array.from({ length: 5 }, (_, index) => ({
        kind: "pictogram" as const,
        concept: `key-${index}`,
        emojiFallback: "K",
        svg: "<svg />",
      })),
    };
    const rowIndexes = planLockedRowIndexes(visual);
    const profiles = [
      layoutPuzzleBoard(visual, "compact-320", { rowIndexes }),
      layoutPuzzleBoard(visual, "mobile-375", { rowIndexes }),
      layoutPuzzleBoard(visual, "mobile-375", {
        rowIndexes,
        viewportWidth: 320,
        padding: 16,
      }),
      layoutPuzzleBoard(visual, "desktop-768", { rowIndexes }),
    ];

    expect(rowIndexes).toEqual([
      [0, 1, 2],
      [3, 4],
    ]);
    for (const plan of profiles) {
      for (const indexes of rowIndexes) {
        const row = indexes.map((index) => plan.positions[index]!);
        expect(Math.min(...row.map((position) => position.x))).toBeGreaterThanOrEqual(0);
        expect(Math.max(...row.map((position) => position.x + position.width))).toBeLessThanOrEqual(
          plan.width
        );
      }
    }
  });

  it.each([375, 600, 767, 768])(
    "keeps 72px large tiles while fitting the player container at %ipx",
    (containerWidth) => {
      const responsive = getLargePlayerLayout(containerWidth);
      const visual: PuzzleVisual = {
        styleId: "ink-pictogram-v1",
        mode: "composed",
        layout: "row",
        unicodeFallback: "KEY",
        layers: [{ kind: "pictogram", concept: "key", emojiFallback: "K", svg: "<svg />" }],
      };
      const plan = layoutPuzzleBoard(visual, responsive.profileId, {
        viewportWidth: responsive.viewportWidth,
        padding: responsive.padding,
      });

      expect(plan.width).toBe(Math.min(containerWidth, 768));
      expect(plan.positions[0]!.width).toBe(72);
      expect(responsive.useCanonicalProfile).toBe(containerWidth === 375 || containerWidth >= 768);
    }
  );

  it.each([
    [240, "mobile-375-medium", "medium"],
    [200, "mobile-375-medium", "medium"],
    [180, "compact-320", "small"],
    [158, "compact-320", "small"],
    [160, "compact-320", "small"],
  ] as const)(
    "shrinks the player geometry while preserving locked rows at %ipx",
    (containerWidth, expectedProfile, expectedSize) => {
      const responsive = getLargePlayerLayout(containerWidth);
      const visual: PuzzleVisual = {
        styleId: "ink-pictogram-v1",
        mode: "composed",
        layout: "row",
        unicodeFallback: "+++++",
        layers: Array.from({ length: 5 }, () => ({
          kind: "operator" as const,
          symbol: "+",
        })),
      };
      const plan = layoutPuzzleBoard(visual, responsive.profileId, {
        viewportWidth: responsive.viewportWidth,
        padding: responsive.padding,
      });

      expect(responsive.profileId).toBe(expectedProfile);
      expect(getPuzzleBoardRecognitionProfile(responsive.profileId).size).toBe(expectedSize);
      expect(plan.width).toBe(containerWidth);
      expect(Math.max(...plan.positions.map(({ x, width }) => x + width))).toBeLessThanOrEqual(
        plan.width
      );
    }
  );

  it("resumes layer geometry when a container grows from 157px to the 158px minimum", () => {
    const narrow = getLargePlayerLayout(157);
    const wider = getLargePlayerLayout(158);

    expect(narrow.isSupportedWidth).toBe(false);
    expect(wider.isSupportedWidth).toBe(true);
    expect(wider.profileId).toBe("compact-320");
  });

  it("supports free canvases tall enough for the largest legal stacked board", () => {
    const stacked: PuzzleVisual = {
      styleId: "ink-pictogram-v1",
      mode: "composed",
      layout: "stack",
      unicodeFallback: "STACK",
      layers: Array.from({ length: 12 }, () => ({
        kind: "text" as const,
        content: "W".repeat(40),
        emphasis: "stacked" as const,
      })),
    };
    const locked = layoutPuzzleBoard(stacked, "desktop-768");
    const free = layoutPuzzleBoard({ ...stacked, layout: "free" }, "desktop-768", {
      freeCanvasHeight: locked.height,
    });

    expect(locked.height).toBeGreaterThan(4096);
    expect(locked.height).toBeLessThanOrEqual(MAX_FREE_CANVAS_HEIGHT);
    expect(free.height).toBe(locked.height);
    expect(
      PuzzleVisualSchema.parse({
        ...stacked,
        layout: "free",
        freeCanvasHeight: free.height,
        unicodeFallback: "STACK",
      }).freeCanvasHeight
    ).toBe(free.height);
  });

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

  it("resolves every recognition profile through the shared board layout entry point", () => {
    const visual = longRowVisual();

    for (const profileId of [
      "compact-320",
      "mobile-375",
      "mobile-375-medium",
      "desktop-768",
    ] as const) {
      const profile = getPuzzleBoardRecognitionProfile(profileId);
      expect(layoutPuzzleBoard(visual, profileId)).toEqual(layoutLayersLocked(visual, profile));
    }
  });

  it("supports a medium-size override without changing the recognition profile bounds", () => {
    const visual: PuzzleVisual = {
      styleId: "ink-pictogram-v1",
      mode: "composed",
      layout: "row",
      unicodeFallback: "A",
      layers: [{ kind: "pictogram", concept: "apple", svg: "<svg />" }],
    };

    const plan = layoutPuzzleBoard(visual, "desktop-768", { size: "medium" });

    expect(plan.width).toBe(getPuzzleBoardRecognitionProfile("desktop-768").viewportWidth);
    expect(plan.positions[0]!.width).toBe(52);
    expect(plan.positions[0]!.height).toBe(52);
  });

  it("keeps locked layer centers inside a free canvas when changing layouts", () => {
    const profileId = "desktop-768";
    const profile = getPuzzleBoardRecognitionProfile(profileId);
    const visual: PuzzleVisual = {
      styleId: "ink-pictogram-v1",
      mode: "composed",
      layout: "stack",
      unicodeFallback: "A B C D E F G H I J",
      layers: Array.from({ length: 10 }, (_, index) => ({
        kind: "pictogram" as const,
        concept: `icon-${index}`,
        svg: "<svg />",
      })),
    };
    const locked = layoutPuzzleBoard(visual, profileId);
    const freeFrame = layoutPuzzleBoard({ ...visual, layout: "free" }, profileId, {
      freeCanvasHeight: locked.height,
    });
    const positions = layerPositionsFromBounds(locked.positions, {
      width: freeFrame.width,
      height: freeFrame.height,
      padding: profile.padding,
    });
    const freeVisual = {
      ...visual,
      layout: "free" as const,
      freeCanvasHeight: freeFrame.height,
      layers: visual.layers.map((layer, index) => ({
        ...layer,
        x: positions[index]!.x,
        y: positions[index]!.y,
      })),
    };
    const free = layoutPuzzleBoard(freeVisual, profileId);

    expect(free.height).toBeGreaterThanOrEqual(locked.height);
    const freeCenters = free.positions.map(({ x, y, width, height }) => ({
      x: x + width / 2,
      y: y + height / 2,
    }));
    const lockedCenters = locked.positions.map(({ x, y, width, height }) => ({
      x: x + width / 2,
      y: y + height / 2,
    }));
    freeCenters.forEach((center, index) => {
      expect(center.x).toBeCloseTo(lockedCenters[index]!.x);
      expect(center.y).toBeCloseTo(lockedCenters[index]!.y);
    });
    expect(free.positions.every((position) => position.y >= profile.padding)).toBe(true);
  });

  it.each(["row", "grid", "stack", "overlay"] as const)(
    "preserves displayed centers when converting %s to free layout",
    (layout) => {
      const profileId = "desktop-768";
      const profile = getPuzzleBoardRecognitionProfile(profileId);
      const visual: PuzzleVisual = {
        styleId: "ink-pictogram-v1",
        mode: "composed",
        layout,
        unicodeFallback: "A B C D E",
        layers: Array.from({ length: 5 }, (_, index) => ({
          kind: "pictogram" as const,
          concept: `icon-${index}`,
          svg: "<svg />",
        })),
      };
      const locked = layoutPuzzleBoard(visual, profileId);
      const freeFrame = layoutPuzzleBoard({ ...visual, layout: "free" }, profileId, {
        freeCanvasHeight: locked.height,
      });
      const positions = layerPositionsFromBounds(locked.positions, {
        width: freeFrame.width,
        height: freeFrame.height,
        padding: profile.padding,
      });
      const freeVisual = {
        ...visual,
        layout: "free" as const,
        layers: visual.layers.map((layer, index) => ({
          ...layer,
          x: positions[index]!.x,
          y: positions[index]!.y,
        })),
      };
      const placed = layoutPuzzleBoard(freeVisual, profileId, {
        freeCanvasHeight: freeFrame.height,
      });

      const placedCenters = placed.positions.map(({ x, y, width, height }) => ({
        x: x + width / 2,
        y: y + height / 2,
      }));
      const lockedCenters = locked.positions.map(({ x, y, width, height }) => ({
        x: x + width / 2,
        y: y + height / 2,
      }));
      placedCenters.forEach((center, index) => {
        expect(center.x).toBeCloseTo(lockedCenters[index]!.x);
        expect(center.y).toBeCloseTo(lockedCenters[index]!.y);
      });
    }
  );

  it("defines a medium mobile profile matching the medium React board size", () => {
    const visual: PuzzleVisual = {
      styleId: "ink-pictogram-v1",
      mode: "composed",
      layout: "row",
      unicodeFallback: "A",
      layers: [{ kind: "pictogram", concept: "apple", svg: "<svg />" }],
    };
    const profile = getPuzzleBoardRecognitionProfile("mobile-375-medium");
    const plan = layoutPuzzleBoard(visual, "mobile-375-medium");

    expect(profile.size).toBe("medium");
    expect(plan.width).toBe(375);
    expect(plan.positions[0]!.width).toBe(52);
    expect(plan.positions[0]!.height).toBe(52);
  });

  it("keeps empty and one-layer boards inside a valid profile frame", () => {
    const empty: PuzzleVisual = {
      styleId: "ink-pictogram-v1",
      mode: "composed",
      layout: "row",
      unicodeFallback: "",
      layers: [],
    };
    const emptyPlan = layoutPuzzleBoard(empty, "mobile-375");
    expect(emptyPlan.width).toBe(375);
    expect(emptyPlan.height).toBeGreaterThan(0);
    expect(emptyPlan.positions).toEqual([]);

    const oneLayerPlan = layoutPuzzleBoard(
      { ...empty, layers: [{ kind: "pictogram", concept: "key", svg: "<svg />" }] },
      "mobile-375"
    );
    expect(oneLayerPlan.positions).toHaveLength(1);
    expect(oneLayerPlan.positions[0]!.width).toBeGreaterThan(0);
    expect(oneLayerPlan.positions[0]!.height).toBeGreaterThan(0);
  });
});
