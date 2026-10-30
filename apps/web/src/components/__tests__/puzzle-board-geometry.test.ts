import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import type { PuzzleVisual } from "../../ai/puzzle-agent/visual/composition";
import { layoutPuzzleBoard } from "../../ai/puzzle-agent/visual/layout-plan";
import { PUZZLE_BOARD_SIZE_SPECS } from "../../ai/puzzle-agent/visual/presentation";
import { PuzzleVisualBoard } from "../PuzzleVisualBoard";
import { StudioArtboard } from "../studio/StudioArtboard";

const layouts = ["free", "row", "stack", "grid", "overlay"] as const;

function visualWithLayout(layout: PuzzleVisual["layout"]): PuzzleVisual {
  return {
    styleId: "ink-pictogram-v1",
    mode: "composed",
    layout,
    unicodeFallback: "MIND ABOVE MATTER",
    layers: [
      { kind: "text", content: "MIND", emphasis: "normal", x: 30, y: 35 },
      { kind: "text", content: "ABOVE", emphasis: "normal", x: 50, y: 50 },
      { kind: "text", content: "MATTER", emphasis: "normal", x: 70, y: 65 },
    ],
  };
}

function attributeValues(markup: string, name: string): string[] {
  return Array.from(markup.matchAll(new RegExp(`${name}="([^"]*)"`, "g")), (match) => match[1]!);
}

function expectedBounds(
  visual: PuzzleVisual,
  profileId: "compact-320" | "mobile-375" | "mobile-375-medium" | "desktop-768" = "desktop-768"
): string[] {
  return layoutPuzzleBoard(visual, profileId).positions.map(
    ({ x, y, width, height }) => `${x},${y},${width},${height}`
  );
}

describe("PuzzleVisualBoard geometry", () => {
  it.each(layouts)("uses shared player bounds for %s layout", (layout) => {
    const visual = visualWithLayout(layout);
    const markup = renderToStaticMarkup(
      createElement(PuzzleVisualBoard, { visual, fallback: visual.unicodeFallback })
    );
    const plans = [
      layoutPuzzleBoard(visual, "mobile-375"),
      layoutPuzzleBoard(visual, "desktop-768"),
    ];

    expect(attributeValues(markup, "data-board-bounds")).toEqual(
      plans.flatMap((plan) =>
        plan.positions.map(({ x, y, width, height }) => `${x},${y},${width},${height}`)
      )
    );
    expect(attributeValues(markup, "data-board-canvas")).toEqual(
      plans.map((plan) => `${plan.width},${plan.height}`)
    );
    expect(attributeValues(markup, "data-board-profile")).toEqual(["mobile-375", "desktop-768"]);
  });

  it("uses compact profile geometry when compact is enabled", () => {
    const visual = visualWithLayout("free");
    const markup = renderToStaticMarkup(
      createElement(PuzzleVisualBoard, { visual, fallback: visual.unicodeFallback, compact: true })
    );
    const plan = layoutPuzzleBoard(visual, "compact-320");

    expect(attributeValues(markup, "data-board-canvas")).toEqual([`${plan.width},${plan.height}`]);
    expect(attributeValues(markup, "data-board-bounds")).toEqual(
      plan.positions.map(({ x, y, width, height }) => `${x},${y},${width},${height}`)
    );
  });

  it("keeps the Unicode fallback constrained inside a narrow flex parent", () => {
    const visual: PuzzleVisual = {
      ...visualWithLayout("row"),
      mode: "unicode",
      layers: [],
    };
    const markup = renderToStaticMarkup(
      createElement(
        "div",
        { className: "flex min-w-0", style: { width: 157 } },
        createElement(PuzzleVisualBoard, { visual, fallback: visual.unicodeFallback })
      )
    );

    expect(markup).toContain("w-full min-w-0 max-w-full");
    expect(markup).toContain("min-width:0");
  });

  it("uses responsive layer frames and constrains long text to the planned bounds", () => {
    const visual: PuzzleVisual = {
      ...visualWithLayout("row"),
      layers: [
        { kind: "pictogram", concept: "key", svg: "<svg />" },
        { kind: "text", content: "EXTRAORDINARILYLONGWORD", emphasis: "normal" },
        { kind: "text", content: "STACKED", emphasis: "stacked" },
      ],
    };
    const markup = renderToStaticMarkup(
      createElement(PuzzleVisualBoard, { visual, fallback: visual.unicodeFallback })
    );

    expect(markup).toContain("container-type:inline-size");
    expect(markup).toContain('data-responsive-profile="large"');
    expect(markup).toContain("container-name:rb-puzzle-board");
    expect(markup).toContain("font-family:Arial, Helvetica, sans-serif");
    expect(attributeValues(markup, "data-board-profile")).toEqual(["mobile-375", "desktop-768"]);
    expect(markup).toContain("width:100%;height:100%");
    expect(markup).toContain("overflow:hidden");
    expect(markup).toContain("font-size:");
    expect(markup).toContain("cqw");
  });

  it("uses shared responsive geometry when legacy canonical boards have no mobile raster", () => {
    const visual: PuzzleVisual = {
      ...visualWithLayout("row"),
      canonicalBoard: {
        version: 1,
        pngDataUrl: "data:image/png;base64,not-validated-because-this-uses-the-fallback",
        sha256: "0".repeat(64),
        width: 768,
        height: 104,
        sourceFingerprint: "0".repeat(64),
      },
    };
    const markup = renderToStaticMarkup(
      createElement(PuzzleVisualBoard, { visual, fallback: visual.unicodeFallback })
    );

    expect(attributeValues(markup, "data-board-profile")).toEqual(["mobile-375", "desktop-768"]);
    expect(markup).not.toContain("Loading puzzle image");
  });

  it("uses the server-recognized medium mobile profile for medium player boards", () => {
    const visual = visualWithLayout("row");
    const markup = renderToStaticMarkup(
      createElement(PuzzleVisualBoard, {
        visual,
        fallback: visual.unicodeFallback,
        size: "medium",
      })
    );
    const plan = layoutPuzzleBoard(visual, "mobile-375-medium");

    expect(attributeValues(markup, "data-board-bounds")).toEqual(
      plan.positions.map(({ x, y, width, height }) => `${x},${y},${width},${height}`)
    );
    expect(attributeValues(markup, "data-board-canvas")).toEqual([`${plan.width},${plan.height}`]);
    expect(attributeValues(markup, "data-board-profile")).toEqual(["mobile-375-medium"]);
  });

  it("keeps long and stacked text inside the shared frames", () => {
    const visual: PuzzleVisual = {
      ...visualWithLayout("row"),
      layers: [
        { kind: "text", content: "EXTRAORDINARILY LONG WORD", emphasis: "normal" },
        { kind: "text", content: "STACKED", emphasis: "stacked" },
      ],
    };
    const markup = renderToStaticMarkup(
      createElement(PuzzleVisualBoard, { visual, fallback: visual.unicodeFallback })
    );
    const plans = [
      layoutPuzzleBoard(visual, "mobile-375"),
      layoutPuzzleBoard(visual, "desktop-768"),
    ];

    expect(attributeValues(markup, "data-board-bounds")).toEqual(
      plans.flatMap((plan) =>
        plan.positions.map(({ x, y, width, height }) => `${x},${y},${width},${height}`)
      )
    );
    expect(attributeValues(markup, "data-board-canvas")).toEqual(
      plans.map((plan) => `${plan.width},${plan.height}`)
    );
    expect(plans.every((plan) => plan.positions[0]!.width <= plan.width)).toBe(true);
    expect(
      plans.every((plan) => plan.positions[1]!.height > PUZZLE_BOARD_SIZE_SPECS.large.tile)
    ).toBe(true);
  });

  it.each(layouts)("uses the same large-profile bounds for Studio %s layout", (layout) => {
    const visual = visualWithLayout(layout);
    const markup = renderToStaticMarkup(
      createElement(StudioArtboard, {
        visual,
        selectedIndex: 0,
        onSelect: () => undefined,
        onMove: () => undefined,
      })
    );
    const plan = layoutPuzzleBoard(visual, "desktop-768");

    expect(attributeValues(markup, "data-studio-layer-bounds")).toEqual(expectedBounds(visual));
    expect(attributeValues(markup, "data-studio-canvas")).toEqual([`${plan.width},${plan.height}`]);
    expect(markup).toContain('aria-keyshortcuts="ArrowLeft ArrowRight ArrowUp ArrowDown"');
  });
});
