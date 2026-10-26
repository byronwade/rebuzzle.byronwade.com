import { INK_PICTOGRAM_STYLE_ID } from "@/ai/puzzle-agent/visual/style";
import { withStudioEvidence } from "@/test/studio-evidence";

const insertOne = jest.fn(async () => ({ insertedId: "puzzle" }));
const updateOne = jest.fn(async () => ({ acknowledged: true, matchedCount: 1 }));
jest.mock("@/db/mongodb", () => ({
  getCollection: () => ({ findOne: async () => null, insertOne, updateOne }),
}));
jest.mock("@/lib/auth-middleware", () => ({
  getAuthenticatedUser: async () => ({ userId: "user" }),
}));
jest.mock("@/lib/ugc/require-studio-user", () => ({
  requireStudioUser: async () => ({ ok: true, user: { userId: "user", username: "creator" } }),
}));
jest.mock("@/lib/middleware/rate-limit", () => ({
  rateLimit: () => async () => ({ success: true }),
  getUserKey: () => "test",
}));
jest.mock("@/lib/logger", () => ({ logger: { info: jest.fn(), warn: jest.fn() } }));
jest.mock("@/lib/ugc/eve-review", () => ({
  runEveStudioReview: jest.fn(),
  publicEveReview: (r: unknown) => r,
}));
jest.mock("@/lib/ugc/grade-submission", () => ({ gradeUserPuzzleSubmission: jest.fn() }));

import { runEveStudioReview } from "@/lib/ugc/eve-review";
import { gradeUserPuzzleSubmission } from "@/lib/ugc/grade-submission";
import { POST } from "../route";

const content = withStudioEvidence({
  answer: "sunflower",
  explanation: "Sun and flower make sunflower.",
  hints: ["a", "b", "c"],
  techniqueId: "simple_compound",
  difficulty: 4,
  visual: {
    styleId: INK_PICTOGRAM_STYLE_ID,
    mode: "composed" as const,
    layout: "row" as const,
    layers: [{ kind: "text" as const, content: "SUN" }],
    unicodeFallback: "SUN",
  },
});
const grade = {
  ok: true,
  score: 90,
  funScore: 90,
  issues: [],
  visual: content.visual,
  rebusPuzzle: "SUN",
  answerKey: "sunflower",
};
const review = {
  ...content.eveReview!,
  grade,
  checks: [],
  spend: { critique: "ran" as const, playerSim: "ran" as const },
};
const request = (submit: boolean) =>
  new Request("http://localhost/api/studio/submissions", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      ...content,
      layout: "row",
      layers: content.visual.layers,
      submit,
      deepReview: false,
    }),
  });
beforeEach(() => {
  insertOne.mockClear();
  updateOne.mockClear();
  jest.mocked(runEveStudioReview).mockReset();
  jest.mocked(gradeUserPuzzleSubmission).mockResolvedValue(grade);
});
it("keeps pending reviews out of the puzzle collection", async () => {
  jest
    .mocked(runEveStudioReview)
    .mockResolvedValue({ ...review, ok: false, verdict: "pending", evidence: undefined });
  const response = await POST(request(true));
  expect(response.status).toBe(422);
  expect((await response.json()).submission.status).toBe("pending_grade");
  expect(insertOne).not.toHaveBeenCalled();
});
it("allows drafts while required providers are unavailable", async () => {
  const response = await POST(request(false));
  expect(response.status).toBe(200);
  expect((await response.json()).submission.status).toBe("draft");
  expect(insertOne).not.toHaveBeenCalled();
});
it("publishes only a complete matching server review", async () => {
  jest.mocked(runEveStudioReview).mockResolvedValue(review);
  const response = await POST(request(true));
  expect(response.status).toBe(200);
  expect((await response.json()).submission.status).toBe("approved");
  expect(insertOne).toHaveBeenCalledTimes(1);
});
