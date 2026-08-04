/**
 * Puzzle stage surface pairing.
 *
 * Ink Pictogram boards are authored for light paper. Unicode/emoji boards
 * use the dark cinema plate. When a board carries non-palette (meaning) colors,
 * the background flips to whichever surface keeps contrast readable.
 */

import { INK_PICTOGRAM_PALETTE, PUZZLE_BOARD_SURFACES } from "@/ai/puzzle-agent/visual/style";
import type { PuzzleVisual } from "@/lib/gameSettings";

export type PuzzleSurfaceMode = "paper" | "cinema";

export interface PuzzleSurface {
  mode: PuzzleSurfaceMode;
  /** CSS background for the glyph area / plate fill */
  canvas: string;
  /** Primary readable ink for text/operators on that surface */
  ink: string;
  /** True when non-palette colors were found in the board */
  usesMeaningColors: boolean;
}

const PAPER: PuzzleSurface = {
  ...PUZZLE_BOARD_SURFACES.paper,
  usesMeaningColors: false,
};

const CINEMA: PuzzleSurface = {
  ...PUZZLE_BOARD_SURFACES.cinema,
  usesMeaningColors: false,
};

const PALETTE_HEX = new Set(Object.values(INK_PICTOGRAM_PALETTE).map((hex) => normalizeHex(hex)));

const HEX_RE = /#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})\b/g;
const RGB_RE = /rgba?\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})/gi;

function normalizeHex(hex: string): string {
  const raw = hex.trim().toLowerCase().replace(/^#/, "");
  if (raw.length === 3) {
    return `#${raw
      .split("")
      .map((c) => c + c)
      .join("")}`;
  }
  return `#${raw}`;
}

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const n = normalizeHex(hex).slice(1);
  if (n.length !== 6) return null;
  const r = Number.parseInt(n.slice(0, 2), 16);
  const g = Number.parseInt(n.slice(2, 4), 16);
  const b = Number.parseInt(n.slice(4, 6), 16);
  if ([r, g, b].some((v) => Number.isNaN(v))) return null;
  return { r, g, b };
}

/** Relative luminance (sRGB) — WCAG. */
export function relativeLuminance(hex: string): number {
  const rgb = hexToRgb(hex);
  if (!rgb) return 0;
  const channel = (c: number) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(rgb.r) + 0.7152 * channel(rgb.g) + 0.0722 * channel(rgb.b);
}

export function contrastRatio(a: string, b: string): number {
  const l1 = relativeLuminance(a);
  const l2 = relativeLuminance(b);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

function nearPalette(hex: string, tolerance = 28): boolean {
  const rgb = hexToRgb(hex);
  if (!rgb) return false;
  if (PALETTE_HEX.has(normalizeHex(hex))) return true;
  for (const paletteHex of PALETTE_HEX) {
    const p = hexToRgb(paletteHex);
    if (!p) continue;
    const dist = Math.hypot(rgb.r - p.r, rgb.g - p.g, rgb.b - p.b);
    if (dist <= tolerance) return true;
  }
  return false;
}

/** Pull fill/stroke colors from SVG markup (hex + rgb). */
export function extractSvgColors(svg: string): string[] {
  const colors = new Set<string>();
  for (const match of svg.matchAll(HEX_RE)) {
    colors.add(normalizeHex(match[0]));
  }
  for (const match of svg.matchAll(RGB_RE)) {
    const r = Number(match[1]);
    const g = Number(match[2]);
    const b = Number(match[3]);
    if ([r, g, b].every((v) => v >= 0 && v <= 255)) {
      const hex = `#${[r, g, b].map((v) => v.toString(16).padStart(2, "0")).join("")}`;
      colors.add(normalizeHex(hex));
    }
  }
  return [...colors];
}

function collectBoardColors(visual: PuzzleVisual): string[] {
  const colors = new Set<string>();
  for (const layer of visual.layers ?? []) {
    if (layer.kind === "pictogram" && layer.svg) {
      for (const c of extractSvgColors(layer.svg)) colors.add(c);
    }
  }
  return [...colors];
}

function pickSurfaceForMeaningColors(colors: string[]): PuzzleSurface {
  // Ignore near-white / near-black noise; focus on chromatic meaning paints.
  const meaningful = colors.filter((c) => {
    const l = relativeLuminance(c);
    return l > 0.04 && l < 0.92;
  });
  const sample = meaningful.length > 0 ? meaningful : colors;
  if (sample.length === 0) return { ...PAPER, usesMeaningColors: true };

  const paperScore =
    sample.reduce((sum, c) => sum + contrastRatio(c, PAPER.canvas), 0) / sample.length;
  const cinemaScore =
    sample.reduce((sum, c) => sum + contrastRatio(c, CINEMA.canvas), 0) / sample.length;

  if (cinemaScore > paperScore + 0.15) {
    return { ...CINEMA, usesMeaningColors: true };
  }
  return { ...PAPER, usesMeaningColors: true };
}

/**
 * Resolve the play surface for a puzzle visual.
 * - No composed layers → cinema (white unicode/emoji on dark plate)
 * - Standard ink palette only → paper
 * - Non-palette colors → contrast-aware paper or cinema
 */
export function resolvePuzzleSurface(visual?: PuzzleVisual | null): PuzzleSurface {
  if (!visual?.layers?.length || visual.mode === "unicode") {
    return CINEMA;
  }

  const hasComposed = visual.layers.some(
    (l) =>
      (l.kind === "pictogram" && (l.svg || l.emojiFallback)) ||
      l.kind === "text" ||
      (l.kind === "image" && l.src) ||
      l.kind === "operator"
  );
  if (!hasComposed) return CINEMA;

  const colors = collectBoardColors(visual);
  const meaningColors = colors.filter((c) => !nearPalette(c));

  if (meaningColors.length === 0) {
    return PAPER;
  }

  return pickSurfaceForMeaningColors(meaningColors);
}
