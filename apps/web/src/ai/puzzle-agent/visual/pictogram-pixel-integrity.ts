import sharp from "sharp";
import { PICTOGRAM_CANVAS, rasterizePictogramAtPlayerSize } from "./rasterize-pictogram";

export const PICTOGRAM_PIXEL_INTEGRITY_VERSION = "pictogram-pixels-v1";
export const PICTOGRAM_PIXEL_INTEGRITY_SIZES = [36, 72] as const;

const REQUIRED_CONTRAST = 3;
const MIN_FOREGROUND_RATIO = 0.06;
const MAX_FOREGROUND_RATIO = 0.55;
const MIN_BOUNDS_AREA_RATIO = 0.18;

export type PictogramPixelIntegrityProfile = {
  tileSize: number;
  foregroundRatio: number;
  boundsWidthRatio: number;
  boundsHeightRatio: number;
  maximumContrast: number;
  ok: boolean;
  reasons: string[];
};

export type PictogramPixelIntegrityResult = {
  version: typeof PICTOGRAM_PIXEL_INTEGRITY_VERSION;
  ok: boolean;
  reasons: string[];
  profiles: PictogramPixelIntegrityProfile[];
};

function linearChannel(value: number): number {
  const normalized = value / 255;
  return normalized <= 0.04045 ? normalized / 12.92 : ((normalized + 0.055) / 1.055) ** 2.4;
}

function relativeLuminance(red: number, green: number, blue: number): number {
  return 0.2126 * linearChannel(red) + 0.7152 * linearChannel(green) + 0.0722 * linearChannel(blue);
}

function contrastRatio(left: number, right: number): number {
  return (Math.max(left, right) + 0.05) / (Math.min(left, right) + 0.05);
}

const CANVAS_RGB = [
  Number.parseInt(PICTOGRAM_CANVAS.slice(1, 3), 16),
  Number.parseInt(PICTOGRAM_CANVAS.slice(3, 5), 16),
  Number.parseInt(PICTOGRAM_CANVAS.slice(5, 7), 16),
] as const;
const CANVAS_LUMINANCE = relativeLuminance(...CANVAS_RGB);

async function inspectProfile(
  svg: string,
  tileSize: number
): Promise<PictogramPixelIntegrityProfile> {
  try {
    const playerPixels = await rasterizePictogramAtPlayerSize(svg, tileSize);
    const { data, info } = await sharp(playerPixels)
      .removeAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });
    let foregroundPixels = 0;
    let minX = info.width;
    let minY = info.height;
    let maxX = -1;
    let maxY = -1;
    let maximumContrast = 1;

    for (let y = 0; y < info.height; y += 1) {
      for (let x = 0; x < info.width; x += 1) {
        const index = (y * info.width + x) * info.channels;
        const luminance = relativeLuminance(
          data[index] ?? CANVAS_RGB[0],
          data[index + 1] ?? CANVAS_RGB[1],
          data[index + 2] ?? CANVAS_RGB[2]
        );
        const contrast = contrastRatio(luminance, CANVAS_LUMINANCE);
        maximumContrast = Math.max(maximumContrast, contrast);
        if (contrast < REQUIRED_CONTRAST) continue;
        foregroundPixels += 1;
        minX = Math.min(minX, x);
        minY = Math.min(minY, y);
        maxX = Math.max(maxX, x);
        maxY = Math.max(maxY, y);
      }
    }

    const pixelCount = info.width * info.height;
    const foregroundRatio = pixelCount ? foregroundPixels / pixelCount : 0;
    const boundsWidthRatio = maxX >= 0 ? (maxX - minX + 1) / info.width : 0;
    const boundsHeightRatio = maxY >= 0 ? (maxY - minY + 1) / info.height : 0;
    const boundsAreaRatio = boundsWidthRatio * boundsHeightRatio;
    const reasons = [
      ...(maximumContrast < REQUIRED_CONTRAST ? ["insufficient_contrast"] : []),
      ...(foregroundRatio < MIN_FOREGROUND_RATIO ? ["too_little_visible_ink"] : []),
      ...(foregroundRatio > MAX_FOREGROUND_RATIO ? ["overfilled_canvas"] : []),
      ...(foregroundPixels > 0 && boundsAreaRatio < MIN_BOUNDS_AREA_RATIO
        ? ["visible_subject_too_small"]
        : []),
      ...(foregroundPixels > 0 &&
      (minX === 0 || minY === 0 || maxX === info.width - 1 || maxY === info.height - 1)
        ? ["content_touches_canvas_edge"]
        : []),
    ];

    return {
      tileSize,
      foregroundRatio,
      boundsWidthRatio,
      boundsHeightRatio,
      maximumContrast,
      ok: reasons.length === 0,
      reasons,
    };
  } catch {
    return {
      tileSize,
      foregroundRatio: 0,
      boundsWidthRatio: 0,
      boundsHeightRatio: 0,
      maximumContrast: 1,
      ok: false,
      reasons: ["rasterization_failed"],
    };
  }
}

/**
 * Inspect the exact compact and large player rasters before asking a model to
 * name them. This catches invisible, off-canvas, tiny, and canvas-filling SVGs
 * that source-markup heuristics cannot reliably detect.
 */
export async function evaluatePictogramPixelIntegrity(
  svg: string
): Promise<PictogramPixelIntegrityResult> {
  const profiles = await Promise.all(
    PICTOGRAM_PIXEL_INTEGRITY_SIZES.map((tileSize) => inspectProfile(svg, tileSize))
  );
  const reasons = profiles.flatMap((profile) =>
    profile.reasons.map((reason) => `${profile.tileSize}px:${reason}`)
  );
  return {
    version: PICTOGRAM_PIXEL_INTEGRITY_VERSION,
    ok: profiles.length === PICTOGRAM_PIXEL_INTEGRITY_SIZES.length && reasons.length === 0,
    reasons,
    profiles,
  };
}
