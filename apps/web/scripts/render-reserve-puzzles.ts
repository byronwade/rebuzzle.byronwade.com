import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { RESERVE_PUZZLES } from "../src/ai/puzzle-agent/reserve-puzzles";
import { renderPuzzleVisualProfile } from "../src/ai/puzzle-agent/visual/render-board";

const COLUMNS = 3;
const ROWS = 6;
const CELL_WIDTH = 360;
const CELL_HEIGHT = 200;
const PAGE_SIZE = COLUMNS * ROWS;

function escapeXml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

async function label(input: { id: string; answer: string; width: number }): Promise<Buffer> {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${input.width}" height="44"><text x="${input.width / 2}" y="17" text-anchor="middle" font-family="Arial, sans-serif" font-size="15" font-weight="700" fill="#1a1f1c">${escapeXml(input.answer)}</text><text x="${input.width / 2}" y="35" text-anchor="middle" font-family="Arial, sans-serif" font-size="10" fill="#69736d">${escapeXml(input.id)}</text></svg>`;
  return Buffer.from(svg);
}

async function main(): Promise<void> {
  const outputDirectory = path.resolve("../../artifacts/puzzle-generator/reserve");
  await mkdir(outputDirectory, { recursive: true });
  const pageCount = Math.ceil(RESERVE_PUZZLES.length / PAGE_SIZE);

  for (let pageIndex = 0; pageIndex < pageCount; pageIndex += 1) {
    const puzzles = RESERVE_PUZZLES.slice(
      pageIndex * PAGE_SIZE,
      (pageIndex + 1) * PAGE_SIZE
    );
    const composites: sharp.OverlayOptions[] = [];
    for (let index = 0; index < puzzles.length; index += 1) {
      const puzzle = puzzles[index]!;
      const column = index % COLUMNS;
      const row = Math.floor(index / COLUMNS);
      const left = column * CELL_WIDTH;
      const top = row * CELL_HEIGHT;
      const rendered = await renderPuzzleVisualProfile(puzzle.visual, "compact-320");
      const board = await sharp(Buffer.from(rendered.pixels))
        .resize({ width: 320, height: 135, fit: "inside", withoutEnlargement: true })
        .png()
        .toBuffer();
      const metadata = await label({ id: puzzle.id, answer: puzzle.answer, width: 320 });
      const boardMetadata = await sharp({
        create: { width: 336, height: 183, channels: 4, background: "#fffdf7" },
      })
        .composite([
          { input: board, gravity: "north", top: 4, left: 8 },
          { input: metadata, top: 137, left: 8 },
        ])
        .png()
        .toBuffer();
      composites.push({ input: boardMetadata, left: left + 12, top: top + 8 });
    }

    const output = path.join(
      outputDirectory,
      `reserve-compact-${String(pageIndex + 1).padStart(2, "0")}.png`
    );
    const canvas = sharp({
      create: {
        width: COLUMNS * CELL_WIDTH,
        height: ROWS * CELL_HEIGHT,
        channels: 4,
        background: "#eef1ed",
      },
    });
    await writeFile(output, await canvas.composite(composites).png().toBuffer());
    console.log(`[reserve-sheet] page ${pageIndex + 1}/${pageCount}: ${output}`);
  }
}

void main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
