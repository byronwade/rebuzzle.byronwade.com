import sharp from "sharp";
import type { PuzzleVisual, VisualLayer } from "./composition";
import {
  getPuzzleBoardRecognitionProfile,
  PUZZLE_BOARD_RECOGNITION_PROFILES,
  PUZZLE_BOARD_SIZE_SPECS,
  type PuzzleBoardRecognitionProfile,
  type PuzzleBoardRecognitionProfileId,
} from "./presentation";
import { sanitizePictogramSvg } from "./sanitize-svg";

const CANVAS = "#f4f6f3";
const INK = "#1a1f1c";
const STRIKE = "#b23a2d";

type Box = { width: number; height: number };
type Position = Box & { x: number; y: number };
type LayoutPlan = {
  width: number;
  height: number;
  positions: Position[];
  wrappedRows: number;
};

export type RenderedPuzzleBoard = {
  profileId: PuzzleBoardRecognitionProfileId;
  viewportWidth: number;
  tileSize: number;
  width: number;
  height: number;
  wrappedRows: number;
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

function fontSizeFor(layer: Extract<VisualLayer, { kind: "text" }>, base: number): number {
  if (layer.emphasis === "large") return Math.round(base * 1.35);
  if (layer.emphasis === "small") return Math.round(base * 0.72);
  if (layer.emphasis === "tiny") return Math.round(base * 0.55);
  if (layer.emphasis === "stacked") return Math.round(base * 0.9);
  return base;
}

function boxFor(
  layer: VisualLayer,
  profile: PuzzleBoardRecognitionProfile,
  availableWidth: number
): Box {
  const size = PUZZLE_BOARD_SIZE_SPECS[profile.size];
  if (layer.kind === "pictogram" || layer.kind === "image") {
    return { width: size.tile, height: size.tile };
  }
  if (layer.kind === "operator") {
    return { width: Math.max(22, Math.round(size.tile * 0.58)), height: size.tile };
  }

  const fontSize = fontSizeFor(layer, size.fontSize);
  if (layer.emphasis === "stacked") {
    return {
      width: Math.max(fontSize * 1.5, 28),
      height: Math.max(size.tile, layer.content.length * fontSize * 1.04),
    };
  }
  return {
    width: Math.max(
      size.tile * 0.7,
      Math.min(availableWidth, layer.content.length * fontSize * 0.68 + fontSize * 0.5)
    ),
    height: size.tile,
  };
}

function planRows(
  boxes: Box[],
  availableWidth: number,
  gap: number
): Array<{ indexes: number[]; width: number; height: number }> {
  const rows: Array<{ indexes: number[]; width: number; height: number }> = [];
  let current = { indexes: [] as number[], width: 0, height: 0 };

  boxes.forEach((box, index) => {
    const nextWidth = current.indexes.length ? current.width + gap + box.width : box.width;
    if (current.indexes.length && nextWidth > availableWidth) {
      rows.push(current);
      current = { indexes: [index], width: box.width, height: box.height };
      return;
    }
    current.indexes.push(index);
    current.width = nextWidth;
    current.height = Math.max(current.height, box.height);
  });
  if (current.indexes.length) rows.push(current);
  return rows;
}

function layoutLayers(visual: PuzzleVisual, profile: PuzzleBoardRecognitionProfile): LayoutPlan {
  const size = PUZZLE_BOARD_SIZE_SPECS[profile.size];
  const availableWidth = profile.viewportWidth - profile.padding * 2;
  const boxes = visual.layers.map((layer) => boxFor(layer, profile, availableWidth));
  if (!boxes.length) {
    return {
      width: profile.viewportWidth,
      height: size.tile + profile.padding * 2,
      positions: [],
      wrappedRows: 0,
    };
  }

  if (visual.layout === "stack") {
    const positions: Position[] = [];
    let y = profile.padding;
    boxes.forEach((box) => {
      positions.push({
        ...box,
        x: profile.padding + (availableWidth - box.width) / 2,
        y,
      });
      y += box.height + size.gap;
    });
    return {
      width: profile.viewportWidth,
      height: y - size.gap + profile.padding,
      positions,
      wrappedRows: boxes.length,
    };
  }

  if (visual.layout === "grid") {
    const cellWidth = Math.max(...boxes.map((box) => box.width));
    const cellHeight = Math.max(...boxes.map((box) => box.height));
    const columns = Math.max(
      1,
      Math.min(3, Math.floor((availableWidth + size.gap) / (cellWidth + size.gap)))
    );
    const rows = Math.ceil(boxes.length / columns);
    const gridWidth = columns * cellWidth + (columns - 1) * size.gap;
    const startX = profile.padding + (availableWidth - gridWidth) / 2;
    const positions = boxes.map((box, index) => ({
      ...box,
      x: startX + (index % columns) * (cellWidth + size.gap) + (cellWidth - box.width) / 2,
      y:
        profile.padding +
        Math.floor(index / columns) * (cellHeight + size.gap) +
        (cellHeight - box.height) / 2,
    }));
    return {
      width: profile.viewportWidth,
      height: profile.padding * 2 + rows * cellHeight + (rows - 1) * size.gap,
      positions,
      wrappedRows: rows,
    };
  }

  if (visual.layout === "overlay") {
    const contentWidth = Math.min(availableWidth, Math.max(...boxes.map((box) => box.width)) + 36);
    const contentHeight = Math.max(...boxes.map((box) => box.height)) + 36;
    const positions = boxes.map((box, index) => {
      const offset = (index - (boxes.length - 1) / 2) * Math.max(5, size.gap * 0.75);
      return {
        ...box,
        x: profile.padding + (availableWidth - box.width) / 2 + offset,
        y: profile.padding + (contentHeight - box.height) / 2 + offset,
      };
    });
    return {
      width: profile.viewportWidth,
      height: contentHeight + profile.padding * 2,
      positions,
      wrappedRows: 1,
    };
  }

  const rows = planRows(boxes, availableWidth, size.gap);
  const positions: Position[] = Array.from({ length: boxes.length });
  let y = profile.padding;
  rows.forEach((row) => {
    let x = profile.padding + (availableWidth - row.width) / 2;
    row.indexes.forEach((index) => {
      const box = boxes[index]!;
      positions[index] = {
        ...box,
        x,
        y: y + (row.height - box.height) / 2,
      };
      x += box.width + size.gap;
    });
    y += row.height + size.gap;
  });
  return {
    width: profile.viewportWidth,
    height: y - size.gap + profile.padding,
    positions,
    wrappedRows: rows.length,
  };
}

function renderLayer(
  layer: VisualLayer,
  position: Position,
  profile: PuzzleBoardRecognitionProfile
): string {
  const size = PUZZLE_BOARD_SIZE_SPECS[profile.size];
  if (layer.kind === "pictogram") {
    const svg = sanitizePictogramSvg(layer.svg ?? "");
    if (!svg) {
      return `<text x="${position.x + position.width / 2}" y="${position.y + position.height * 0.72}" text-anchor="middle" font-size="${Math.round(size.tile * 0.72)}">${escapeXml(layer.emojiFallback)}</text>`;
    }
    const src = Buffer.from(svg).toString("base64");
    return `<image x="${position.x}" y="${position.y}" width="${position.width}" height="${position.height}" preserveAspectRatio="xMidYMid meet" href="data:image/svg+xml;base64,${src}"/>`;
  }

  if (layer.kind === "image") {
    if (!layer.src?.startsWith("data:image/")) return "";
    return `<image x="${position.x}" y="${position.y}" width="${position.width}" height="${position.height}" preserveAspectRatio="xMidYMid slice" href="${escapeXml(layer.src)}"/>`;
  }

  if (layer.kind === "operator") {
    return `<text x="${position.x + position.width / 2}" y="${position.y + position.height * 0.68}" text-anchor="middle" font-family="Arial, sans-serif" font-size="${size.fontSize}" font-weight="500" fill="${INK}">${escapeXml(layer.symbol)}</text>`;
  }

  const fontSize = fontSizeFor(layer, size.fontSize);
  const weight = layer.emphasis === "large" || layer.emphasis === "strike" ? 700 : 600;
  if (layer.emphasis === "stacked") {
    return layer.content
      .split("")
      .map(
        (character, index) =>
          `<text x="${position.x + position.width / 2}" y="${position.y + fontSize + index * fontSize * 1.04}" text-anchor="middle" font-family="Arial, sans-serif" font-size="${fontSize}" font-weight="700" fill="${INK}">${escapeXml(character)}</text>`
      )
      .join("");
  }

  const text = `<text x="${position.x + position.width / 2}" y="${position.y + position.height / 2 + fontSize * 0.34}" text-anchor="middle" font-family="Arial, sans-serif" font-size="${fontSize}" font-weight="${weight}" fill="${INK}">${escapeXml(layer.content)}</text>`;
  if (layer.emphasis !== "strike") return text;
  return `${text}<line x1="${position.x + 4}" y1="${position.y + position.height / 2}" x2="${position.x + position.width - 4}" y2="${position.y + position.height / 2}" stroke="${STRIKE}" stroke-width="${Math.max(3, size.tile / 18)}" stroke-linecap="round"/>`;
}

export async function renderPuzzleVisualProfile(
  visual: PuzzleVisual,
  profileId: PuzzleBoardRecognitionProfileId
): Promise<RenderedPuzzleBoard> {
  const profile = getPuzzleBoardRecognitionProfile(profileId);
  const size = PUZZLE_BOARD_SIZE_SPECS[profile.size];
  const layout = layoutLayers(visual, profile);
  const captionHeight = visual.caption ? Math.max(32, size.fontSize) : 0;
  const width = layout.width;
  const height = Math.max(size.tile + profile.padding * 2, layout.height + captionHeight);
  const layers = visual.layers
    .map((layer, index) => renderLayer(layer, layout.positions[index]!, profile))
    .join("");
  const caption = visual.caption
    ? `<text x="${width / 2}" y="${height - 12}" text-anchor="middle" font-family="Arial, sans-serif" font-size="${Math.max(12, Math.round(size.fontSize * 0.42))}" fill="#6b756f">${escapeXml(visual.caption)}</text>`
    : "";
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><rect width="100%" height="100%" fill="${CANVAS}" rx="12"/>${layers}${caption}</svg>`;
  const pixels = await sharp(Buffer.from(svg)).png().toBuffer();

  return {
    profileId,
    viewportWidth: profile.viewportWidth,
    tileSize: size.tile,
    width,
    height,
    wrappedRows: layout.wrappedRows,
    pixels,
  };
}

/** Render every presentation that can materially change recognizability or topology. */
export async function renderPuzzleVisualProfiles(
  visual: PuzzleVisual
): Promise<RenderedPuzzleBoard[]> {
  return Promise.all(
    PUZZLE_BOARD_RECOGNITION_PROFILES.map((profile) =>
      renderPuzzleVisualProfile(visual, profile.id)
    )
  );
}

/** Default screenshot used by blind solving: the common 375px mobile board. */
export async function renderPuzzleVisual(visual: PuzzleVisual): Promise<Uint8Array> {
  return (await renderPuzzleVisualProfile(visual, "mobile-375")).pixels;
}
