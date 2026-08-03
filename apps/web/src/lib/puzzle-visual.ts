import type { PuzzleVisual } from "@/lib/gameSettings";

/** True when the visual has something richer than a plain emoji string. */
export function hasComposedVisual(visual?: PuzzleVisual | null): boolean {
  if (!visual?.layers?.length) return false;
  if (visual.mode === "unicode") return false;
  return visual.layers.some(
    (l) =>
      (l.kind === "pictogram" && (l.svg || l.emojiFallback)) ||
      l.kind === "text" ||
      (l.kind === "image" && l.src) ||
      l.kind === "operator"
  );
}
