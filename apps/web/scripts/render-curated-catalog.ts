import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import {
  listCuratedPictogramIds,
  resolveCuratedPictogram,
} from "../src/ai/puzzle-agent/visual/curated-pictograms";

const CELL_WIDTH = 200;
const CELL_HEIGHT = 132;
const COLUMNS = 6;

function escapeXml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

async function main(): Promise<void> {
  const includeQuarantined = process.argv.includes("--include-quarantined");
  const ids = listCuratedPictogramIds({ includeQuarantined });
  const rows = Math.ceil(ids.length / COLUMNS);
  const width = CELL_WIDTH * COLUMNS;
  const height = CELL_HEIGHT * rows;
  const cells = ids
    .map((id, index) => {
      const asset = resolveCuratedPictogram(id, { includeQuarantined });
      if (!asset) throw new Error(`Catalog asset did not resolve: ${id}`);
      const column = index % COLUMNS;
      const row = Math.floor(index / COLUMNS);
      const x = column * CELL_WIDTH;
      const y = row * CELL_HEIGHT;
      const dataUrl = `data:image/svg+xml;base64,${Buffer.from(asset.svg).toString("base64")}`;
      return [
        `<rect x="${x + 4}" y="${y + 4}" width="${CELL_WIDTH - 8}" height="${CELL_HEIGHT - 8}" rx="12" fill="#fffdf7" stroke="#d9dedb"/>`,
        `<image x="${x + 30}" y="${y + 42}" width="36" height="36" href="${dataUrl}"/>`,
        `<image x="${x + 98}" y="${y + 12}" width="72" height="72" href="${dataUrl}"/>`,
        `<text x="${x + 48}" y="${y + 94}" text-anchor="middle" font-family="Arial, sans-serif" font-size="10" fill="#6b756f">36px</text>`,
        `<text x="${x + 134}" y="${y + 94}" text-anchor="middle" font-family="Arial, sans-serif" font-size="10" fill="#6b756f">72px</text>`,
        `<text x="${x + CELL_WIDTH / 2}" y="${y + 112}" text-anchor="middle" font-family="Arial, sans-serif" font-size="14" font-weight="600" fill="#1a1f1c">${escapeXml(id)}</text>`,
      ].join("");
    })
    .join("");
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><rect width="100%" height="100%" fill="#f2f4f1"/>${cells}</svg>`;
  const output = path.resolve(
    `../../artifacts/puzzle-generator/catalog/curated-pictograms${includeQuarantined ? "-diagnostic" : ""}.png`
  );
  await mkdir(path.dirname(output), { recursive: true });
  await writeFile(output, await sharp(Buffer.from(svg)).png().toBuffer());
  console.log(`[catalog-sheet] ${ids.length} assets: ${output}`);
}

void main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
