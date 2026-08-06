/**
 * Viewport-invariant layout planning.
 *
 * Row breaks and grid columns are computed once from a canonical compact
 * profile (or a fixed column rule), then reused at every recognition width so
 * flex-wrap cannot change cue adjacency or meaning.
 */

import {
  getPuzzleBoardRecognitionProfile,
  PUZZLE_BOARD_SIZE_SPECS,
  type PuzzleBoardRecognitionProfile,
  type PuzzleBoardSize,
  puzzleBoardFontSize,
  puzzleBoardOperatorWidth,
} from "./presentation";

function clampPercent(value: number): number {
  if (!Number.isFinite(value)) return 50;
  return Math.min(100, Math.max(0, value));
}

/**
 * Structural board shape accepted by the layout lock.
 * Wider than the Zod PuzzleVisual so the React player (optional emphasis) can share it.
 */
export type LayoutPlanVisual = {
  layout?: "row" | "stack" | "grid" | "overlay" | "free";
  layers: readonly LayoutPlanLayer[];
};

export type LayoutPlanLayer = {
  kind: "pictogram" | "text" | "operator" | "image";
  content?: string;
  emphasis?: "normal" | "large" | "small" | "strike" | "stacked" | "tiny";
  concept?: string;
  symbol?: string;
  emojiFallback?: string;
  svg?: string;
  src?: string;
  /** Free-canvas center as % of artboard (0–100). */
  x?: number;
  y?: number;
};

export type LayoutBox = { width: number; height: number };
export type LayoutPosition = LayoutBox & { x: number; y: number };

export type LockedLayoutPlan = {
  width: number;
  height: number;
  positions: LayoutPosition[];
  /** Layer indexes per visual row — identical membership across all profiles. */
  rowIndexes: number[][];
  wrappedRows: number;
  locked: true;
};

/** Narrowest production profile — the topology source of truth. */
export const LAYOUT_LOCK_CANONICAL_PROFILE_ID = "compact-320" as const;

export function estimateLayerBox(
  layer: LayoutPlanLayer,
  profile: PuzzleBoardRecognitionProfile,
  availableWidth: number
): LayoutBox {
  const size = PUZZLE_BOARD_SIZE_SPECS[profile.size];
  if (layer.kind === "pictogram" || layer.kind === "image") {
    return { width: size.tile, height: size.tile };
  }
  if (layer.kind === "operator") {
    return { width: puzzleBoardOperatorWidth(size.tile), height: size.tile };
  }

  const content = layer.content ?? "";
  const fontSize = puzzleBoardFontSize(layer.emphasis, size.fontSize);
  if (layer.emphasis === "stacked") {
    return {
      width: Math.max(fontSize * 1.5, 28),
      height: Math.max(size.tile, content.length * fontSize * 1.04),
    };
  }
  return {
    width: Math.max(
      size.tile * 0.7,
      Math.min(availableWidth, content.length * fontSize * 0.68 + fontSize * 0.5)
    ),
    height: size.tile,
  };
}

function planRows(
  boxes: LayoutBox[],
  availableWidth: number,
  gap: number
): Array<{ indexes: number[]; width: number; height: number }> {
  const rows: Array<{ indexes: number[]; width: number; height: number }> = [];
  let current = { indexes: [] as number[], width: 0, height: 0 };

  boxes.forEach((box, index) => {
    const nextWidth = current.indexes.length ? current.width + gap + box.width : box.width;
    if (current.indexes.length && nextWidth > availableWidth) {
      rows.push(current);
      current = { indexes: [index], width: box.width, height: box.height };
      return;
    }
    current.indexes.push(index);
    current.width = nextWidth;
    current.height = Math.max(current.height, box.height);
  });
  if (current.indexes.length) rows.push(current);
  return rows;
}

/**
 * Fixed column count for grid layouts — never depends on viewport width.
 * Keeps neighbor graphs identical across compact/mobile/desktop.
 */
export function lockedGridColumns(layerCount: number): number {
  if (layerCount <= 1) return 1;
  if (layerCount <= 4) return 2;
  return 3;
}

/**
 * Compute locked row membership for a board.
 * Membership is invariant across recognition profiles and the React player.
 */
export function planLockedRowIndexes(visual: LayoutPlanVisual): number[][] {
  const layers = visual.layers ?? [];
  if (!layers.length) return [];

  if (visual.layout === "stack") {
    return layers.map((_, index) => [index]);
  }

  if (visual.layout === "overlay" || visual.layout === "free") {
    return [layers.map((_, index) => index)];
  }

  if (visual.layout === "grid") {
    const columns = lockedGridColumns(layers.length);
    const rows: number[][] = [];
    layers.forEach((_, index) => {
      const row = Math.floor(index / columns);
      (rows[row] ??= []).push(index);
    });
    return rows;
  }

  // row (default): wrap plan from the canonical compact profile only
  const canonical = getPuzzleBoardRecognitionProfile(LAYOUT_LOCK_CANONICAL_PROFILE_ID);
  const availableWidth = canonical.viewportWidth - canonical.padding * 2;
  const gap = PUZZLE_BOARD_SIZE_SPECS[canonical.size].gap;
  const boxes = layers.map((layer) => estimateLayerBox(layer, canonical, availableWidth));
  return planRows(boxes, availableWidth, gap).map((row) => row.indexes);
}

/**
 * Place layers for one profile using locked row membership.
 */
export function layoutLayersLocked(
  visual: LayoutPlanVisual,
  profile: PuzzleBoardRecognitionProfile,
  rowIndexes: number[][] = planLockedRowIndexes(visual)
): LockedLayoutPlan {
  const size = PUZZLE_BOARD_SIZE_SPECS[profile.size];
  const availableWidth = profile.viewportWidth - profile.padding * 2;
  const layers = visual.layers ?? [];
  const boxes = layers.map((layer) => estimateLayerBox(layer, profile, availableWidth));

  if (!boxes.length) {
    return {
      width: profile.viewportWidth,
      height: size.tile + profile.padding * 2,
      positions: [],
      rowIndexes: [],
      wrappedRows: 0,
      locked: true,
    };
  }

  if (visual.layout === "stack") {
    const positions: LayoutPosition[] = [];
    let y = profile.padding;
    boxes.forEach((box) => {
      positions.push({
        ...box,
        x: profile.padding + (availableWidth - box.width) / 2,
        y,
      });
      y += box.height + size.gap;
    });
    return {
      width: profile.viewportWidth,
      height: y - size.gap + profile.padding,
      positions,
      rowIndexes,
      wrappedRows: boxes.length,
      locked: true,
    };
  }

  if (visual.layout === "grid") {
    const columns = lockedGridColumns(boxes.length);
    const cellWidth = Math.max(...boxes.map((box) => box.width));
    const cellHeight = Math.max(...boxes.map((box) => box.height));
    const rows = Math.ceil(boxes.length / columns);
    const gridWidth = columns * cellWidth + (columns - 1) * size.gap;
    const startX = profile.padding + Math.max(0, availableWidth - gridWidth) / 2;
    const positions = boxes.map((box, index) => ({
      ...box,
      x: startX + (index % columns) * (cellWidth + size.gap) + (cellWidth - box.width) / 2,
      y:
        profile.padding +
        Math.floor(index / columns) * (cellHeight + size.gap) +
        (cellHeight - box.height) / 2,
    }));
    return {
      width: profile.viewportWidth,
      height: profile.padding * 2 + rows * cellHeight + Math.max(0, rows - 1) * size.gap,
      positions,
      rowIndexes,
      wrappedRows: rows,
      locked: true,
    };
  }

  if (visual.layout === "overlay") {
    const contentWidth = Math.min(availableWidth, Math.max(...boxes.map((box) => box.width)) + 36);
    const contentHeight = Math.max(...boxes.map((box) => box.height)) + 36;
    const positions = boxes.map((box, index) => {
      const offset = (index - (boxes.length - 1) / 2) * Math.max(5, size.gap * 0.75);
      return {
        ...box,
        x: profile.padding + (availableWidth - box.width) / 2 + offset,
        y: profile.padding + (contentHeight - box.height) / 2 + offset,
      };
    });
    return {
      width: profile.viewportWidth,
      height: contentHeight + profile.padding * 2,
      positions,
      rowIndexes,
      wrappedRows: 1,
      locked: true,
    };
  }

  if (visual.layout === "free") {
    const boardWidth = availableWidth;
    const boardHeight = Math.max(size.tile * 2.4, Math.round(boardWidth * (10 / 16)));
    const positions = boxes.map((box, index) => {
      const layer = layers[index];
      const cx =
        typeof layer?.x === "number"
          ? profile.padding + (clampPercent(layer.x) / 100) * boardWidth
          : profile.padding + boardWidth * (0.3 + (index % 4) * 0.12);
      const cy =
        typeof layer?.y === "number"
          ? profile.padding + (clampPercent(layer.y) / 100) * boardHeight
          : profile.padding + boardHeight * (0.32 + Math.floor(index / 4) * 0.14);
      return {
        ...box,
        x: cx - box.width / 2,
        y: cy - box.height / 2,
      };
    });
    return {
      width: profile.viewportWidth,
      height: boardHeight + profile.padding * 2,
      positions,
      rowIndexes,
      wrappedRows: 1,
      locked: true,
    };
  }

  // Locked row: reuse canonical membership; only scale/center with this profile's boxes.
  const positions: LayoutPosition[] = Array.from({ length: boxes.length });
  let y = profile.padding;
  for (const indexes of rowIndexes) {
    const rowBoxes = indexes.map((index) => boxes[index]!);
    const rowWidth =
      rowBoxes.reduce((sum, box) => sum + box.width, 0) +
      Math.max(0, indexes.length - 1) * size.gap;
    const rowHeight = Math.max(...rowBoxes.map((box) => box.height));
    let x = profile.padding + Math.max(0, availableWidth - rowWidth) / 2;
    for (const index of indexes) {
      const box = boxes[index]!;
      positions[index] = {
        ...box,
        x,
        y: y + (rowHeight - box.height) / 2,
      };
      x += box.width + size.gap;
    }
    y += rowHeight + size.gap;
  }

  return {
    width: profile.viewportWidth,
    height: y - size.gap + profile.padding,
    positions,
    rowIndexes,
    wrappedRows: rowIndexes.length,
    locked: true,
  };
}

/**
 * Player-facing row membership.
 * Uses the same canonical row plan as server recognition so CSS wrap cannot
 * invent a different reading order.
 */
export function planPlayerLockedRows(
  visual: LayoutPlanVisual,
  _boardSize?: PuzzleBoardSize
): number[][] {
  return planLockedRowIndexes(visual);
}
