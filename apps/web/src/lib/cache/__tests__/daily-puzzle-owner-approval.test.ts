jest.mock("next/cache", () => ({
  cacheLife: jest.fn(),
  cacheTag: jest.fn(),
  revalidateTag: jest.fn(),
}));
jest.mock("@/db", () => ({ db: { puzzleOps: { findByDate: jest.fn() } } }));
jest.mock("@/lib/logger", () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));

import type { Puzzle } from "@/db/models";
import { computeOwnerContentHash } from "@/lib/game/owner-approval";
import { formatPuzzleFromDb } from "../daily-puzzle";

const row = {
  id: "puzzle-1",
  puzzle: "T E E F",
  puzzleType: "rebus",
  answer: "two left feet",
  acceptedAnswers: ["2 left feet"],
  difficulty: 7,
  publishedAt: new Date("2026-11-20T00:00:00Z"),
  createdAt: new Date("2026-11-19T00:00:00Z"),
  active: true,
  metadata: {},
} as unknown as Puzzle;

describe("formatPuzzleFromDb ownerApproved", () => {
  it("is true only when the stored approval matches the row content", () => {
    const contentHash = computeOwnerContentHash({
      answer: row.answer,
      acceptedAnswers: row.acceptedAnswers,
      visual: row.visual,
    });
    const approved = {
      ...row,
      metadata: {
        ownerApproval: { approvedBy: "o", approvedAt: new Date(), role: "scheduled", contentHash },
      },
    } as unknown as Puzzle;

    expect(formatPuzzleFromDb(approved, "2026-11-20").ownerApproved).toBe(true);
    expect(formatPuzzleFromDb(row, "2026-11-20").ownerApproved).toBe(false);
    expect(
      formatPuzzleFromDb({ ...approved, answer: "two right feet" } as Puzzle, "2026-11-20")
        .ownerApproved
    ).toBe(false);
  });
});
