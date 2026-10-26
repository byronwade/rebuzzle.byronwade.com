import { INK_PICTOGRAM_STYLE_ID } from "@/ai/puzzle-agent/visual/style";
import type { UserPuzzleSubmission } from "@/db/models";
import { withStudioEvidence } from "@/test/studio-evidence";

const updateOne = jest.fn(async () => ({ acknowledged: true }));
const findOne = jest.fn();

jest.mock("@/db/mongodb", () => ({
  getCollection: () => ({
    updateOne,
    findOne,
    insertOne: jest.fn(),
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

import { attachEveReviewSnapshot, upsertDraftSubmission } from "../submissions";

const draft: UserPuzzleSubmission = withStudioEvidence({
  id: "draft-1",
  slug: "sunflower-draft-1",
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
});

describe("attachEveReviewSnapshot", () => {
  beforeEach(() => {
    updateOne.mockClear();
    findOne.mockReset();
  });

  it("persists Eve review on the author draft", async () => {
    findOne.mockResolvedValueOnce(draft);
    const saved = await attachEveReviewSnapshot({
      submissionId: "draft-1",
      userId: "user-1",
      eveReview: {
        ...draft.eveReview!,
        reviewId: "rev-1",
        ok: true,
        verdict: "ship",
        summary: "Ready",
        blockers: [],
        warnings: [],
        checkedAt: "2026-08-04T00:00:00.000Z",
      },
    });
    expect(saved?.eveReview?.verdict).toBe("ship");
    expect(updateOne).toHaveBeenCalled();
  });

  it("refuses other authors and locked boards", async () => {
    findOne.mockResolvedValueOnce({ ...draft, userId: "other" });
    await expect(
      attachEveReviewSnapshot({
        submissionId: "draft-1",
        userId: "user-1",
        eveReview: {
          ...draft.eveReview!,
          reviewId: "rev-1",
          ok: false,
          verdict: "revise",
          summary: "Nope",
          blockers: ["x"],
          warnings: [],
          checkedAt: "2026-08-04T00:00:00.000Z",
        },
      })
    ).resolves.toBeNull();

    findOne.mockResolvedValueOnce({ ...draft, status: "approved" });
    await expect(
      attachEveReviewSnapshot({
        submissionId: "draft-1",
        userId: "user-1",
        eveReview: {
          ...draft.eveReview!,
          reviewId: "rev-1",
          ok: true,
          verdict: "ship",
          summary: "Ready",
          blockers: [],
          warnings: [],
          checkedAt: "2026-08-04T00:00:00.000Z",
        },
      })
    ).rejects.toThrow(/locked/i);
  });
});

it("clears old review and grade on draft edits", async () => {
  findOne.mockResolvedValueOnce({
    ...draft,
    grade: { ok: true, score: 99, funScore: 99, issues: [], gradedAt: "then" },
  });
  const saved = await upsertDraftSubmission({ ...draft, explanation: "changed" });
  expect(saved.eveReview).toBeUndefined();
  expect(saved.grade).toBeUndefined();
  expect(updateOne.mock.calls.at(-1)?.[1].$unset).toEqual({ grade: "", eveReview: "" });
});
it("refuses review persistence after a concurrent edit", async () => {
  findOne.mockResolvedValueOnce(draft);
  await expect(
    attachEveReviewSnapshot({
      submissionId: draft.id,
      userId: draft.userId,
      expectedUpdatedAt: new Date(0),
      eveReview: draft.eveReview!,
    })
  ).rejects.toThrow(/changed during review/);
});
