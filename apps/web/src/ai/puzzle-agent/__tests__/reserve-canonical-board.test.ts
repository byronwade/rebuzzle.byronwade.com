import { DEMANDING_RESERVE_PUZZLES } from "../demanding-reserve-puzzles";
import { normalizeAnswerKey } from "../quality";
import { selectReserveWithCanonicalBoard } from "../reserve-canonical-board";
import { ReservePuzzleExhaustedError, selectReservePuzzle } from "../reserve-puzzles";
import type { CanonicalBoard } from "../visual/canonical-contract";

const board: CanonicalBoard = {
  version: 1,
  pngDataUrl: "data:image/png;base64,iVBORw0KGgo=",
  sha256: "a".repeat(64),
  width: 1,
  height: 1,
  sourceFingerprint: "b".repeat(64),
};

const select = jest.fn((excludeIds: ReadonlySet<string>) =>
  selectReservePuzzle({
    dateString: "2026-11-02",
    usedAnswerKeys: new Set(),
    recentPuzzles: [],
    now: () => new Date("2026-11-02T12:00:00.000Z"),
    excludeIds,
  })
);

describe("reserve canonical boards", () => {
  beforeEach(() => {
    select.mockClear();
  });

  it("attaches the compiled board to the selected reserve", async () => {
    const compileBoard = jest.fn().mockResolvedValue(board);

    const selected = await selectReserveWithCanonicalBoard({ select, compileBoard });

    expect(selected.puzzle.visual.canonicalBoard).toBe(board);
    expect(selected.skippedReserves).toEqual([]);
    expect(compileBoard).toHaveBeenCalledTimes(1);
  });

  it("logs and skips a reserve whose board fails to compile", async () => {
    const first = await selectReservePuzzle({
      dateString: "2026-11-02",
      usedAnswerKeys: new Set(),
      recentPuzzles: [],
      now: () => new Date("2026-11-02T12:00:00.000Z"),
    });
    const compileBoard = jest
      .fn()
      .mockRejectedValueOnce(new Error("Unsupported canonical pictogram"))
      .mockResolvedValue(board);
    const onSkip = jest.fn();

    const selected = await selectReserveWithCanonicalBoard({ select, compileBoard, onSkip });

    expect(selected.puzzle.id).not.toBe(first.puzzle.id);
    expect(selected.puzzle.visual.canonicalBoard).toBe(board);
    expect(selected.skippedReserves).toEqual([
      { reserveId: first.puzzle.id, error: "Unsupported canonical pictogram" },
    ]);
    expect(onSkip).toHaveBeenCalledWith({
      reserveId: first.puzzle.id,
      error: "Unsupported canonical pictogram",
    });
    expect(select.mock.calls[1]?.[0].has(first.puzzle.id)).toBe(true);
  });

  it("fails closed after the attempt budget instead of publishing an unchecked reserve", async () => {
    const compileBoard = jest
      .fn()
      .mockRejectedValue(new Error("Canonical layers exceed board bounds"));

    await expect(
      selectReserveWithCanonicalBoard({ select, compileBoard, maxAttempts: 2 })
    ).rejects.toBeInstanceOf(ReservePuzzleExhaustedError);
    expect(compileBoard).toHaveBeenCalledTimes(2);
  });

  it("fails closed when every remaining reserve has been skipped", async () => {
    const only = (
      await selectReservePuzzle({
        dateString: "2026-11-02",
        usedAnswerKeys: new Set(),
        recentPuzzles: [],
        now: () => new Date("2026-11-02T12:00:00.000Z"),
      })
    ).puzzle;
    // Every other reserve answer is already used, so `only` is the last candidate.
    const usedAnswerKeys = new Set(
      DEMANDING_RESERVE_PUZZLES.filter((puzzle) => puzzle.id !== only.id).map((puzzle) =>
        normalizeAnswerKey(puzzle.answer)
      )
    );
    const compileBoard = jest.fn().mockRejectedValue(new Error("broken board"));

    await expect(
      selectReserveWithCanonicalBoard({
        select: (excludeIds) =>
          selectReservePuzzle({
            dateString: "2026-11-02",
            usedAnswerKeys,
            recentPuzzles: [],
            now: () => new Date("2026-11-02T12:00:00.000Z"),
            excludeIds,
          }),
        compileBoard,
      })
    ).rejects.toBeInstanceOf(ReservePuzzleExhaustedError);
    expect(compileBoard).toHaveBeenCalledTimes(1);
  });
});
