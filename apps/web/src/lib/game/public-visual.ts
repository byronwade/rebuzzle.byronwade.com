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
  const parsed = parsePublicCanonicalBoard(candidate);
  return {
    ...(candidate !== undefined ? { canonicalBoard: parsed ?? { version: 0 } } : {}),
    styleId: visual.styleId,
    mode: visual.mode,
    layout: visual.layout,
    unicodeFallback: visual.unicodeFallback,
    layers,
  };
}

const CANONICAL_FIELDS = [
  "version",
  "pngDataUrl",
  "sha256",
  "width",
  "height",
  "sourceFingerprint",
];
const RASTER_FIELDS = ["pngDataUrl", "sha256", "width", "height"];
const PHONE_PROFILES = ["compact-320", "mobile-375", "mobile-375-medium"];

function pick(source: Record<string, unknown>, keys: readonly string[]) {
  return Object.fromEntries(
    keys.filter((key) => source[key] !== undefined).map((key) => [key, source[key]])
  );
}

/**
 * Keeps the reviewed phone compositions (without them phones scale the desktop
 * raster down), but a malformed variant only drops the variants, never the board.
 */
function parsePublicCanonicalBoard(candidate: unknown) {
  if (!candidate || typeof candidate !== "object") {
    const parsed = CanonicalBoardSchema.safeParse(candidate);
    return parsed.success ? parsed.data : undefined;
  }
  const board = candidate as Record<string, unknown>;
  const base = pick(board, CANONICAL_FIELDS);
  const variants =
    board.profileVariants && typeof board.profileVariants === "object"
      ? Object.fromEntries(
          PHONE_PROFILES.flatMap((id) => {
            const raster = (board.profileVariants as Record<string, unknown>)[id];
            return raster && typeof raster === "object"
              ? [[id, pick(raster as Record<string, unknown>, RASTER_FIELDS)]]
              : [];
          })
        )
      : {};
  if (Object.keys(variants).length) {
    const withVariants = CanonicalBoardSchema.safeParse({ ...base, profileVariants: variants });
    if (withVariants.success) return withVariants.data;
  }
  const parsed = CanonicalBoardSchema.safeParse(base);
  return parsed.success ? parsed.data : undefined;
}
