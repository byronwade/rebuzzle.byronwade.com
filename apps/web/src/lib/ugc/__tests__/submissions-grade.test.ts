import { INK_PICTOGRAM_STYLE_ID } from "@/ai/puzzle-agent/visual/style";
import type { UserPuzzleSubmission } from "@/db/models";

const updateOne = jest.fn(async () => ({ acknowledged: true }));
const findOne = jest.fn(async () => null);
const insertOne = jest.fn(async () => ({ insertedId: "x" }));

jest.mock("@/db/mongodb", () => ({
  getCollection: () => ({
    updateOne,
    findOne,
    insertOne,
    find: () => ({
      sort: () => ({
        limit: () => ({
          toArray: async () => [],
        }),
      }),
    }),
  }),
}));

jest.mock("@/lib/logger", () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));

import { markSubmissionGraded } from "../submissions";

function baseSubmission(overrides: Partial<UserPuzzleSubmission> = {}): UserPuzzleSubmission {
  return {
    id: "sub-1",
    slug: "sunflower-sub-1",
    userId: "user-1",
    username: "creator",
    status: "draft",
    answer: "sunflower",
    answerKey: "sunflower",
    explanation: "Sun plus flower.",
    hints: ["a", "b", "c"],
    techniqueId: "simple_compound",
    difficulty: 4,
    visual: {
      styleId: INK_PICTOGRAM_STYLE_ID,
      mode: "composed",
      layout: "row",
      layers: [],
      unicodeFallback: "SU + FL",
    },
    rebusPuzzle: "SU + FL",
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    updatedAt: new Date("2026-01-01T00:00:00.000Z"),
    ...overrides,
  };
}

describe("markSubmissionGraded", () => {
  beforeEach(() => {
    updateOne.mockClear();
    findOne.mockClear();
    insertOne.mockClear();
    findOne.mockResolvedValue(null);
  });

  it("holds pending_grade on failed revise (not rejected)", async () => {
    const result = await markSubmissionGraded({
      submission: baseSubmission(),
      ok: false,
      score: 40,
      funScore: 40,
      issues: ["needs work"],
      visual: baseSubmission().visual,
      rebusPuzzle: "SU + FL",
      answerKey: "sunflower",
      pendingOnFail: true,
    });

    expect(result.status).toBe("pending_grade");
    expect(updateOne).toHaveBeenCalledTimes(1);
    const payload = updateOne.mock.calls[0]?.[1]?.$set as UserPuzzleSubmission;
    expect(payload.status).toBe("pending_grade");
  });

  it("rejects hard when pendingOnFail is false", async () => {
    const result = await markSubmissionGraded({
      submission: baseSubmission(),
      ok: false,
      score: 0,
      funScore: 0,
      issues: ["unsafe"],
      visual: baseSubmission().visual,
      rebusPuzzle: "SU + FL",
      answerKey: "sunflower",
      pendingOnFail: false,
    });
    expect(result.status).toBe("rejected");
  });

  it("creates community puzzle before approving", async () => {
    const result = await markSubmissionGraded({
      submission: baseSubmission(),
      ok: true,
      score: 80,
      funScore: 70,
      issues: [],
      visual: baseSubmission().visual,
      rebusPuzzle: "SU + FL",
      answerKey: "sunflower",
    });

    expect(insertOne).toHaveBeenCalled();
    expect(result.status).toBe("approved");
    expect(result.puzzleId).toEqual(expect.any(String));
    // staging pending_grade, puzzleId write, then approved
    expect(updateOne.mock.calls.length).toBeGreaterThanOrEqual(2);
    const statuses = updateOne.mock.calls.map(
      (call) => (call[1] as { $set: UserPuzzleSubmission }).$set.status
    );
    expect(statuses).toContain("pending_grade");
    expect(statuses[statuses.length - 1]).toBe("approved");
  });

  it("rolls back to draft if community puzzle insert fails", async () => {
    insertOne.mockRejectedValueOnce(new Error("mongo down"));
    await expect(
      markSubmissionGraded({
        submission: baseSubmission(),
        ok: true,
        score: 80,
        funScore: 70,
        issues: [],
        visual: baseSubmission().visual,
        rebusPuzzle: "SU + FL",
        answerKey: "sunflower",
      })
    ).rejects.toThrow(/mongo down/i);

    const last = updateOne.mock.calls[updateOne.mock.calls.length - 1] as [
      unknown,
      { $set: UserPuzzleSubmission },
    ];
    const payload = last[1].$set;
    expect(payload.status).toBe("draft");
    expect(payload.grade?.ok).toBe(false);
  });
});
