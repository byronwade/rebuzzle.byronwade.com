/**
 * Free-canvas placement helpers for Studio artboards.
 * Coordinates are percentages of the free-layout content area (0–100), center-anchored.
 */

export const STUDIO_ARTBOARD_ASPECT = 16 / 10;
export const STUDIO_GRID_STEP = 5;
export const STUDIO_POSITION_MIN = 0;
export const STUDIO_POSITION_MAX = 100;

export type LayerPosition = {
  x: number;
  y: number;
};

export function layerPositionFromBounds(
  bounds: { x: number; y: number; width: number; height: number },
  frame: { width: number; height: number; padding: number }
): LayerPosition {
  const contentWidth = frame.width - frame.padding * 2;
  const contentHeight = frame.height - frame.padding * 2;

  return {
    x: contentWidth > 0 ? ((bounds.x + bounds.width / 2 - frame.padding) / contentWidth) * 100 : 50,
    y:
      contentHeight > 0
        ? ((bounds.y + bounds.height / 2 - frame.padding) / contentHeight) * 100
        : 50,
  };
}

/** Convert source-plan centers into percentages relative to a destination frame. */
export function layerPositionsFromBounds(
  bounds: ReadonlyArray<{ x: number; y: number; width: number; height: number }>,
  frame: { width: number; height: number; padding: number }
): LayerPosition[] {
  return bounds.map((position) => layerPositionFromBounds(position, frame));
}

export function layerPositionDeltaFromPixels(
  delta: { x: number; y: number },
  contentSize: { width: number; height: number }
): LayerPosition {
  return {
    x: contentSize.width > 0 ? (delta.x / contentSize.width) * 100 : 0,
    y: contentSize.height > 0 ? (delta.y / contentSize.height) * 100 : 0,
  };
}

export function clampPosition(value: number): number {
  if (!Number.isFinite(value)) return 50;
  return Math.min(STUDIO_POSITION_MAX, Math.max(STUDIO_POSITION_MIN, value));
}

export function snapToGrid(value: number, step: number = STUDIO_GRID_STEP): number {
  const clamped = clampPosition(value);
  return clampPosition(Math.round(clamped / step) * step);
}

export function snapPosition(
  position: LayerPosition,
  step: number = STUDIO_GRID_STEP
): LayerPosition {
  return {
    x: snapToGrid(position.x, step),
    y: snapToGrid(position.y, step),
  };
}

export type StudioArrowKey = "ArrowLeft" | "ArrowRight" | "ArrowUp" | "ArrowDown";

export function nudgePosition(
  position: LayerPosition,
  key: StudioArrowKey,
  step: number = STUDIO_GRID_STEP
): LayerPosition {
  const delta = { x: 0, y: 0 };
  if (key === "ArrowLeft") delta.x = -step;
  if (key === "ArrowRight") delta.x = step;
  if (key === "ArrowUp") delta.y = -step;
  if (key === "ArrowDown") delta.y = step;

  return snapPosition({ x: position.x + delta.x, y: position.y + delta.y }, step);
}

/** Cascade new pieces so they don't all land on the same cell. */
export function defaultPositionForIndex(index: number): LayerPosition {
  const col = index % 4;
  const row = Math.floor(index / 4) % 3;
  return snapPosition({
    x: 30 + col * 12,
    y: 32 + row * 14,
  });
}

export function hasLayerPosition(layer: { x?: number; y?: number }): layer is LayerPosition {
  return typeof layer.x === "number" && typeof layer.y === "number";
}

/** Zod-friendly optional position fields shared by every layer kind. */
export const layerPositionFields = {
  /** Horizontal center as % of artboard width (0–100). */
  x: undefined as number | undefined,
  /** Vertical center as % of artboard height (0–100). */
  y: undefined as number | undefined,
};
