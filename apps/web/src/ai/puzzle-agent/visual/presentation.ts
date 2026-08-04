export type PuzzleBoardSize = "small" | "medium" | "large";

export type PuzzleBoardSizeSpec = {
  tile: number;
  fontSize: number;
  gap: number;
};

/** Shared by the React player board and the server-side quality renderer. */
export const PUZZLE_BOARD_SIZE_SPECS: Record<PuzzleBoardSize, PuzzleBoardSizeSpec> = {
  small: { tile: 44, fontSize: 20, gap: 7 },
  medium: { tile: 52, fontSize: 24, gap: 8 },
  large: { tile: 72, fontSize: 44, gap: 12 },
};

/** Text emphasis multipliers — identical for player, layout lock, and recognition. */
export const PUZZLE_BOARD_EMPHASIS_SCALE = {
  normal: 1,
  large: 1.35,
  small: 0.72,
  tiny: 0.55,
  strike: 1,
  stacked: 0.9,
} as const;

export type PuzzleBoardEmphasis = keyof typeof PUZZLE_BOARD_EMPHASIS_SCALE;

/** Font weights for board type — keep player CSS and recognition SVG aligned. */
export const PUZZLE_BOARD_TEXT_WEIGHT = {
  normal: 600,
  large: 700,
  small: 600,
  tiny: 600,
  strike: 700,
  stacked: 700,
  operator: 500,
} as const;

/** Letter-spacing (em) for board type hierarchy. */
export const PUZZLE_BOARD_LETTER_SPACING_EM = {
  normal: -0.02,
  large: -0.025,
  small: 0.04,
  tiny: 0.12,
  strike: -0.02,
  stacked: 0.08,
  operator: 0,
} as const;

/** Operator / caption chrome relative to the board size spec. */
export const PUZZLE_BOARD_CHROME = {
  /** Operator slot width as a fraction of tile size (min 22px). */
  operatorWidthFactor: 0.58,
  operatorMinWidth: 22,
  /** Caption size as a fraction of base fontSize. */
  captionSizeFactor: 0.42,
  captionMinSize: 12,
  /** Emoji / ASCII fallback glyph size vs tile. */
  fallbackGlyphFactor: 0.72,
} as const;

/** SVG renderer font stack — Sharp has no access to app webfonts. */
export const PUZZLE_BOARD_SVG_FONT_FAMILY = "Arial, Helvetica, sans-serif";

export function puzzleBoardEmphasisScale(emphasis?: string | null): number {
  if (emphasis && emphasis in PUZZLE_BOARD_EMPHASIS_SCALE) {
    return PUZZLE_BOARD_EMPHASIS_SCALE[emphasis as PuzzleBoardEmphasis];
  }
  return PUZZLE_BOARD_EMPHASIS_SCALE.normal;
}

export function puzzleBoardFontSize(emphasis: string | null | undefined, base: number): number {
  return Math.round(base * puzzleBoardEmphasisScale(emphasis));
}

export function puzzleBoardTextWeight(emphasis?: string | null): number {
  if (emphasis && emphasis in PUZZLE_BOARD_TEXT_WEIGHT) {
    return PUZZLE_BOARD_TEXT_WEIGHT[emphasis as keyof typeof PUZZLE_BOARD_TEXT_WEIGHT];
  }
  return PUZZLE_BOARD_TEXT_WEIGHT.normal;
}

export function puzzleBoardLetterSpacingEm(emphasis?: string | null): number {
  if (emphasis && emphasis in PUZZLE_BOARD_LETTER_SPACING_EM) {
    return PUZZLE_BOARD_LETTER_SPACING_EM[emphasis as keyof typeof PUZZLE_BOARD_LETTER_SPACING_EM];
  }
  return PUZZLE_BOARD_LETTER_SPACING_EM.normal;
}

export function puzzleBoardOperatorWidth(tile: number): number {
  return Math.max(
    PUZZLE_BOARD_CHROME.operatorMinWidth,
    Math.round(tile * PUZZLE_BOARD_CHROME.operatorWidthFactor)
  );
}

export function puzzleBoardCaptionSize(baseFontSize: number): number {
  return Math.max(
    PUZZLE_BOARD_CHROME.captionMinSize,
    Math.round(baseFontSize * PUZZLE_BOARD_CHROME.captionSizeFactor)
  );
}

/**
 * Exact player tile sizes used for icon pixel integrity, blind naming,
 * human panels, and publish evidence. Always derived from the board specs
 * so compact/desktop gates match the React player.
 */
export const PLAYER_ICON_GATE_SIZES = [
  PUZZLE_BOARD_SIZE_SPECS.small.tile,
  PUZZLE_BOARD_SIZE_SPECS.large.tile,
] as const;

export type PlayerIconGateSize = (typeof PLAYER_ICON_GATE_SIZES)[number];

export const PUZZLE_BOARD_RECOGNITION_PROFILES = [
  {
    id: "compact-320",
    size: "small",
    viewportWidth: 320,
    padding: 12,
  },
  {
    id: "mobile-375",
    size: "large",
    viewportWidth: 375,
    padding: 16,
  },
  {
    id: "desktop-768",
    size: "large",
    viewportWidth: 768,
    padding: 24,
  },
] as const satisfies ReadonlyArray<{
  id: string;
  size: PuzzleBoardSize;
  viewportWidth: number;
  padding: number;
}>;

export type PuzzleBoardRecognitionProfile = (typeof PUZZLE_BOARD_RECOGNITION_PROFILES)[number];
export type PuzzleBoardRecognitionProfileId = PuzzleBoardRecognitionProfile["id"];

export function getPuzzleBoardRecognitionProfile(
  id: PuzzleBoardRecognitionProfileId
): PuzzleBoardRecognitionProfile {
  return PUZZLE_BOARD_RECOGNITION_PROFILES.find((profile) => profile.id === id)!;
}
