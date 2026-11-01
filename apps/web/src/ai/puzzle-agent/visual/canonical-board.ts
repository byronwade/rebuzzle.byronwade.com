import "server-only";
import { createHash } from "node:crypto";
import sharp from "sharp";
import {
  CANONICAL_MAX_BYTES,
  type CanonicalBoard,
  canonicalBoardForProfile,
  MAX_CANONICAL_BOARD_HEIGHT,
  validateCanonicalBoard,
} from "./canonical-contract";
import { type PuzzleVisualInput, PuzzleVisualSchema } from "./composition";
import { layoutLayersLocked } from "./layout-plan";
import {
  getPuzzleBoardRecognitionProfile,
  PUZZLE_BOARD_RECOGNITION_PROFILES,
} from "./presentation";
import { renderPuzzleVisualProfile } from "./render-board";
import { sanitizePictogramSvg } from "./sanitize-svg";

const hash = (value: string | Uint8Array) => createHash("sha256").update(value).digest("hex");
/** Never trusts incoming artifacts. Compile only supported, hydrated source layers. */
export async function compileCanonicalBoard(input: PuzzleVisualInput): Promise<CanonicalBoard> {
  const { canonicalBoard: _untrusted, ...source } = input;
  const visual = PuzzleVisualSchema.parse(source);
  if (
    Object.keys(source).some((key) => !(key in visual)) ||
    source.layers.some((layer, index) =>
      Object.keys(layer).some((key) => !(key in visual.layers[index]!))
    )
  )
    throw new Error("Unsupported canonical source property");
  if (visual.mode === "unicode") throw new Error("Canonical boards require composed layers");
  for (const layer of visual.layers) {
    if (layer.kind === "pictogram") {
      if (
        !layer.svg ||
        !sanitizePictogramSvg(layer.svg) ||
        /<(?:script|foreignObject|image|use|style|animate|set)\b|\bon\w+\s*=|(?:href|url)\s*[=(]|<!/i.test(
          layer.svg
        )
      )
        throw new Error("Unsupported canonical pictogram");
      // Decode now so invalid SVG cannot silently disappear inside an outer SVG.
      await sharp(Buffer.from(sanitizePictogramSvg(layer.svg)!))
        .png()
        .toBuffer();
    }
    if (layer.kind === "image") {
      if (
        !layer.src ||
        !/^data:image\/png;base64,[A-Za-z0-9+/]+={0,2}$/.test(layer.src) ||
        layer.src.length > 22 + 4 * Math.ceil(CANONICAL_MAX_BYTES / 3)
      )
        throw new Error("Canonical images must be bounded inline PNG");
      const bytes = Buffer.from(layer.src.slice(22), "base64");
      const meta = await sharp(bytes, { limitInputPixels: 2048 * 2048 }).metadata();
      if (
        meta.format !== "png" ||
        !meta.width ||
        !meta.height ||
        meta.width > 2048 ||
        meta.height > 2048 ||
        (meta.pages ?? 1) > 1
      )
        throw new Error("Unsupported canonical image");
      await sharp(bytes).raw().toBuffer();
    }
  }
  const layout = layoutLayersLocked(visual, getPuzzleBoardRecognitionProfile("desktop-768"));
  if (
    layout.width > 2048 ||
    layout.height > MAX_CANONICAL_BOARD_HEIGHT ||
    layout.positions.some(
      (p) => p.x < 0 || p.y < 0 || p.x + p.width > layout.width || p.y + p.height > layout.height
    )
  )
    throw new Error("Canonical layers exceed board bounds");
  const renderRaster = async (
    profileId: (typeof PUZZLE_BOARD_RECOGNITION_PROFILES)[number]["id"]
  ) => {
    const rendered = await renderPuzzleVisualProfile(visual, profileId);
    const bytes = Buffer.from(rendered.pixels);
    return {
      pngDataUrl: `data:image/png;base64,${bytes.toString("base64")}`,
      sha256: hash(bytes),
      width: rendered.width,
      height: rendered.height,
    };
  };
  const desktop = await renderRaster("desktop-768");
  const profileVariants = Object.fromEntries(
    await Promise.all(
      PUZZLE_BOARD_RECOGNITION_PROFILES.filter((profile) => profile.id !== "desktop-768").map(
        async (profile) => [profile.id, await renderRaster(profile.id)] as const
      )
    )
  ) as NonNullable<CanonicalBoard["profileVariants"]>;
  const board: CanonicalBoard = {
    version: 1,
    ...desktop,
    sourceFingerprint: hash(JSON.stringify(visual)),
    profileVariants,
  };
  await validateCanonicalBoard(board);
  for (const profile of PUZZLE_BOARD_RECOGNITION_PROFILES) {
    await validateCanonicalBoard(canonicalBoardForProfile(board, profile.id));
  }
  return board;
}

/** Stable reason recorded when a candidate or reserve cannot produce its checked board. */
export const CANONICAL_BOARD_FAILED = "canonical-board-failed";

/** Fingerprint of the hydrated source a canonical board must have been compiled from. */
export function canonicalSourceFingerprint(input: PuzzleVisualInput): string {
  const { canonicalBoard: _untrusted, ...source } = input;
  return hash(JSON.stringify(PuzzleVisualSchema.parse(source)));
}

/** True only for an intact, all-profile board compiled from exactly this source. */
export async function hasTrustedCanonicalBoard(input: PuzzleVisualInput): Promise<boolean> {
  const board = input.canonicalBoard;
  if (!board) return false;
  try {
    for (const profile of PUZZLE_BOARD_RECOGNITION_PROFILES) {
      if (profile.id !== "desktop-768" && !board.profileVariants?.[profile.id]) return false;
      await validateCanonicalBoard(canonicalBoardForProfile(board, profile.id));
    }
    return board.sourceFingerprint === canonicalSourceFingerprint(input);
  } catch {
    return false;
  }
}

/** Keep a trusted board; otherwise compile a fresh one. Throws when the source cannot compile. */
export async function ensureTrustedCanonicalBoard<T extends PuzzleVisualInput>(
  visual: T
): Promise<T & { canonicalBoard: CanonicalBoard }> {
  if (await hasTrustedCanonicalBoard(visual)) {
    return visual as T & { canonicalBoard: CanonicalBoard };
  }
  return { ...visual, canonicalBoard: await compileCanonicalBoard(visual) };
}
