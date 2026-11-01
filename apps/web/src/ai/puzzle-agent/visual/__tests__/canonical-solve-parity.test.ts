/**
 * The rendered blind-solve (player-sim), editorial review and the human playtest renderer all
 * rasterise through renderPuzzleVisualProfile(s). Players see the compiled canonical PNG.
 * Byte equality here is what makes "the solve check judged the board players see" true.
 * Compared within one run (no golden hashes) because font rasterisation varies by machine.
 */
import { DEMANDING_RESERVE_PUZZLES } from "../../demanding-reserve-puzzles";
import { buildPuzzlePlaytestControlCorpus } from "../../review/puzzle-playtest-controls";
import { compileCanonicalBoard } from "../canonical-board";
import { canonicalBoardForProfile, validateCanonicalBoard } from "../canonical-contract";
import type { PuzzleVisual } from "../composition";
import { PUZZLE_BOARD_RECOGNITION_PROFILES } from "../presentation";
import { renderPuzzleVisualProfiles } from "../render-board";

async function expectSolveRendersMatchBoard(visual: PuzzleVisual) {
  const board = await compileCanonicalBoard(visual);
  const [unboarded, boarded] = await Promise.all([
    renderPuzzleVisualProfiles(visual),
    renderPuzzleVisualProfiles({ ...visual, canonicalBoard: board }),
  ]);
  const profileIds = PUZZLE_BOARD_RECOGNITION_PROFILES.map((profile) => profile.id);
  expect(unboarded.map((rendered) => rendered.profileId)).toEqual(profileIds);
  expect(boarded.map((rendered) => rendered.profileId)).toEqual(profileIds);
  for (const [index, profileId] of profileIds.entries()) {
    const canonical = Buffer.from(
      await validateCanonicalBoard(canonicalBoardForProfile(board, profileId))
    );
    // .toBe(true) instead of toEqual keeps a mismatch from dumping two PNGs into the log.
    expect(Buffer.from(unboarded[index]!.pixels).equals(canonical)).toBe(true);
    expect(Buffer.from(boarded[index]!.pixels).equals(canonical)).toBe(true);
  }
}

const controls = buildPuzzlePlaytestControlCorpus();

test("the playtest control corpus is the six frozen controls", () => {
  expect(controls).toHaveLength(6);
});

test.each(controls.map((control) => [control.id, control.visual] as const))(
  "solve-check renders of %s are the canonical board bytes",
  async (_id, visual) => {
    await expectSolveRendersMatchBoard(visual);
  },
  30_000
);

test.each(["demanding:tall-order", "demanding:rising-star"])(
  "tall stacked reserve %s compiles to a board the solve check matches",
  async (id) => {
    const reserve = DEMANDING_RESERVE_PUZZLES.find((puzzle) => puzzle.id === id);
    expect(reserve).toBeDefined();
    await expectSolveRendersMatchBoard(reserve!.visual);
  },
  30_000
);
