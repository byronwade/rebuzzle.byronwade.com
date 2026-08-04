import {
  puzzleBoardCaptionSize,
  puzzleBoardFontSize,
  puzzleBoardLetterSpacingEm,
  puzzleBoardOperatorWidth,
  puzzleBoardTextWeight,
  PUZZLE_BOARD_EMPHASIS_SCALE,
  PUZZLE_BOARD_SIZE_SPECS,
} from "../presentation";
import { INK_PICTOGRAM_PALETTE, PUZZLE_BOARD_SURFACES } from "../style";

describe("puzzle board presentation tokens", () => {
  it("keeps the shared size ladder stable", () => {
    expect(PUZZLE_BOARD_SIZE_SPECS.small).toEqual({ tile: 44, fontSize: 20, gap: 7 });
    expect(PUZZLE_BOARD_SIZE_SPECS.large).toEqual({ tile: 72, fontSize: 44, gap: 12 });
  });

  it("scales emphasis identically for player and recognition", () => {
    expect(puzzleBoardFontSize("large", 20)).toBe(Math.round(20 * 1.35));
    expect(puzzleBoardFontSize("small", 20)).toBe(Math.round(20 * 0.72));
    expect(puzzleBoardFontSize("tiny", 20)).toBe(Math.round(20 * 0.55));
    expect(puzzleBoardFontSize("stacked", 44)).toBe(Math.round(44 * 0.9));
    expect(puzzleBoardFontSize("normal", 44)).toBe(44);
    expect(PUZZLE_BOARD_EMPHASIS_SCALE.stacked).toBe(0.9);
  });

  it("aligns weights, spacing, and chrome helpers", () => {
    expect(puzzleBoardTextWeight("large")).toBe(700);
    expect(puzzleBoardTextWeight("operator")).toBe(500);
    expect(puzzleBoardLetterSpacingEm("tiny")).toBe(0.12);
    expect(puzzleBoardOperatorWidth(44)).toBe(Math.max(22, Math.round(44 * 0.58)));
    expect(puzzleBoardCaptionSize(44)).toBe(Math.max(12, Math.round(44 * 0.42)));
  });

  it("keeps surfaces on the ink palette family", () => {
    expect(PUZZLE_BOARD_SURFACES.paper.canvas).toBe(INK_PICTOGRAM_PALETTE.canvas);
    expect(PUZZLE_BOARD_SURFACES.paper.ink).toBe(INK_PICTOGRAM_PALETTE.ink);
    expect(PUZZLE_BOARD_SURFACES.cinema.mode).toBe("cinema");
  });
});
