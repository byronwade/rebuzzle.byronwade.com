import { CanonicalBoardSchema } from "@/ai/puzzle-agent/visual/canonical-contract";

/** Only renderable board fields leave the server; authoring/recognition metadata is private. */
export function toPublicVisual(value: unknown) {
  if (!value || typeof value !== "object") return undefined;
  const visual = value as Record<string, unknown>;
  if (!Array.isArray(visual.layers)) return undefined;
  const layers = visual.layers.flatMap((value: unknown) => {
    if (!value || typeof value !== "object") return [];
    const layer = value as Record<string, unknown>;
    const fields =
      layer.kind === "pictogram"
        ? ["svg", "emojiFallback"]
        : layer.kind === "text"
          ? ["content", "emphasis"]
          : layer.kind === "operator"
            ? ["symbol"]
            : layer.kind === "image"
              ? ["src", "alt"]
              : null;
    if (!fields) return [];
    return [
      Object.fromEntries(
        ["kind", "x", "y", ...fields]
          .filter((key) => layer[key] !== undefined)
          .map((key) => [key, layer[key]])
      ),
    ];
  });
  const candidate = visual.canonicalBoard;
  const selected =
    candidate && typeof candidate === "object"
      ? Object.fromEntries(
          ["version", "pngDataUrl", "sha256", "width", "height", "sourceFingerprint"].map((key) => [
            key,
            (candidate as Record<string, unknown>)[key],
          ])
        )
      : candidate;
  const parsed = CanonicalBoardSchema.safeParse(selected);
  return {
    ...(candidate !== undefined
      ? { canonicalBoard: parsed.success ? parsed.data : { version: 0 } }
      : {}),
    styleId: visual.styleId,
    mode: visual.mode,
    layout: visual.layout,
    unicodeFallback: visual.unicodeFallback,
    layers,
  };
}
