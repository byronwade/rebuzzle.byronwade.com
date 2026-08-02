import sharp from "sharp";

const REVIEW_SCALE = 4;
const CANVAS = "#f4f6f3";

/**
 * Render the SVG at the same 72px size used by the large player board, then
 * enlarge those pixels for a vision judge. Rendering small first prevents the
 * evaluator from seeing fine details that disappear in the real game.
 */
export async function rasterizePictogramForRecognition(
  svg: string,
  playerTileSize = 72
): Promise<Uint8Array> {
  const playerPixels = await sharp(Buffer.from(svg), { density: 144 })
    .resize(playerTileSize, playerTileSize, {
      fit: "contain",
      background: CANVAS,
    })
    .flatten({ background: CANVAS })
    .png()
    .toBuffer();

  return sharp(playerPixels)
    .resize(playerTileSize * REVIEW_SCALE, playerTileSize * REVIEW_SCALE, {
      kernel: sharp.kernel.nearest,
    })
    .png()
    .toBuffer();
}
