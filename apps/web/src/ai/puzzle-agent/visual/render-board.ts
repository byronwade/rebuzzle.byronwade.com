import sharp from "sharp";
import type { PuzzleVisual, VisualLayer } from "./composition";
import { layoutLayersLocked, planLockedRowIndexes } from "./layout-plan";
import {
  getPuzzleBoardRecognitionProfile,
  PUZZLE_BOARD_CHROME,
  PUZZLE_BOARD_RECOGNITION_PROFILES,
  PUZZLE_BOARD_SIZE_SPECS,
  PUZZLE_BOARD_SVG_FONT_FAMILY,
  type PuzzleBoardRecognitionProfile,
  type PuzzleBoardRecognitionProfileId,
  puzzleBoardCaptionSize,
  puzzleBoardFontSize,
  puzzleBoardTextWeight,
} from "./presentation";
import { sanitizePictogramSvg } from "./sanitize-svg";
import { INK_PICTOGRAM_PALETTE } from "./style";

export type RenderedPuzzleBoard = {
  profileId: PuzzleBoardRecognitionProfileId;
  viewportWidth: number;
  tileSize: number;
  width: number;
  height: number;
  wrappedRows: number;
  /** Locked row membership shared across all profiles. */
  rowIndexes: number[][];
  locked: true;
  pixels: Uint8Array;
};

function escapeXml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

function renderLayer(
  layer: VisualLayer,
  position: { x: number; y: number; width: number; height: number },
  profile: PuzzleBoardRecognitionProfile
): string {
  const size = PUZZLE_BOARD_SIZE_SPECS[profile.size];
  const fontFamily = PUZZLE_BOARD_SVG_FONT_FAMILY;
  if (layer.kind === "pictogram") {
    const svg = sanitizePictogramSvg(layer.svg ?? "");
    if (!svg) {
      // Monochrome letter/emoji stub — avoid OS multicolor emoji in recognition renders.
      const glyph = Math.round(size.tile * PUZZLE_BOARD_CHROME.fallbackGlyphFactor);
      return `<rect x="${position.x}" y="${position.y}" width="${position.width}" height="${position.height}" rx="8" fill="${INK_PICTOGRAM_PALETTE.canvas}" stroke="${INK_PICTOGRAM_PALETTE.mist}" stroke-width="1"/><text x="${position.x + position.width / 2}" y="${position.y + position.height * 0.68}" text-anchor="middle" font-family="${fontFamily}" font-size="${glyph}" font-weight="600" fill="${INK_PICTOGRAM_PALETTE.ink}">${escapeXml(layer.emojiFallback || "◆")}</text>`;
    }
    const src = Buffer.from(svg).toString("base64");
    return `<image x="${position.x}" y="${position.y}" width="${position.width}" height="${position.height}" preserveAspectRatio="xMidYMid meet" href="data:image/svg+xml;base64,${src}"/>`;
  }

  if (layer.kind === "image") {
    if (!layer.src?.startsWith("data:image/")) return "";
    return `<image x="${position.x}" y="${position.y}" width="${position.width}" height="${position.height}" preserveAspectRatio="xMidYMid slice" href="${escapeXml(layer.src)}"/>`;
  }

  if (layer.kind === "operator") {
    return `<text x="${position.x + position.width / 2}" y="${position.y + position.height * 0.68}" text-anchor="middle" font-family="${fontFamily}" font-size="${size.fontSize}" font-weight="${puzzleBoardTextWeight("operator")}" fill="${INK_PICTOGRAM_PALETTE.mist}">${escapeXml(layer.symbol)}</text>`;
  }

  const fontSize = puzzleBoardFontSize(layer.emphasis, size.fontSize);
  const weight = puzzleBoardTextWeight(layer.emphasis);
  if (layer.emphasis === "stacked") {
    return layer.content
      .split("")
      .map(
        (character, index) =>
          `<text x="${position.x + position.width / 2}" y="${position.y + fontSize + index * fontSize * 1.04}" text-anchor="middle" font-family="${fontFamily}" font-size="${fontSize}" font-weight="${weight}" fill="${INK_PICTOGRAM_PALETTE.ink}">${escapeXml(character)}</text>`
      )
      .join("");
  }

  const text = `<text x="${position.x + position.width / 2}" y="${position.y + position.height / 2 + fontSize * 0.34}" text-anchor="middle" font-family="${fontFamily}" font-size="${fontSize}" font-weight="${weight}" fill="${INK_PICTOGRAM_PALETTE.ink}">${escapeXml(layer.content)}</text>`;
  if (layer.emphasis !== "strike") return text;
  return `${text}<line x1="${position.x + 4}" y1="${position.y + position.height / 2}" x2="${position.x + position.width - 4}" y2="${position.y + position.height / 2}" stroke="${INK_PICTOGRAM_PALETTE.strike}" stroke-width="${Math.max(3, size.tile / 18)}" stroke-linecap="round"/>`;
}

export async function renderPuzzleVisualProfile(
  visual: PuzzleVisual,
  profileId: PuzzleBoardRecognitionProfileId,
  rowIndexes: number[][] = planLockedRowIndexes(visual)
): Promise<RenderedPuzzleBoard> {
  const profile = getPuzzleBoardRecognitionProfile(profileId);
  const size = PUZZLE_BOARD_SIZE_SPECS[profile.size];
  const layout = layoutLayersLocked(visual, profile, rowIndexes);
  const captionHeight = visual.caption ? Math.max(32, size.fontSize) : 0;
  const width = layout.width;
  const height = Math.max(size.tile + profile.padding * 2, layout.height + captionHeight);
  const layers = visual.layers
    .map((layer, index) => renderLayer(layer, layout.positions[index]!, profile))
    .join("");
  const caption = visual.caption
    ? `<text x="${width / 2}" y="${height - 12}" text-anchor="middle" font-family="${PUZZLE_BOARD_SVG_FONT_FAMILY}" font-size="${puzzleBoardCaptionSize(size.fontSize)}" fill="${INK_PICTOGRAM_PALETTE.mist}">${escapeXml(visual.caption)}</text>`
    : "";
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><rect width="100%" height="100%" fill="${INK_PICTOGRAM_PALETTE.canvas}" rx="12"/>${layers}${caption}</svg>`;
  const pixels = await sharp(Buffer.from(svg)).png().toBuffer();

  return {
    profileId,
    viewportWidth: profile.viewportWidth,
    tileSize: size.tile,
    width,
    height,
    wrappedRows: layout.wrappedRows,
    rowIndexes: layout.rowIndexes,
    locked: true,
    pixels,
  };
}

/** Render every presentation with identical locked cue topology. */
export async function renderPuzzleVisualProfiles(
  visual: PuzzleVisual
): Promise<RenderedPuzzleBoard[]> {
  const rowIndexes = planLockedRowIndexes(visual);
  return Promise.all(
    PUZZLE_BOARD_RECOGNITION_PROFILES.map((profile) =>
      renderPuzzleVisualProfile(visual, profile.id, rowIndexes)
    )
  );
}

/** Default screenshot used by blind solving: the common 375px mobile board. */
export async function renderPuzzleVisual(visual: PuzzleVisual): Promise<Uint8Array> {
  return (await renderPuzzleVisualProfile(visual, "mobile-375")).pixels;
}
