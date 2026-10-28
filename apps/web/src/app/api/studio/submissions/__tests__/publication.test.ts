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
const request = (submit: boolean, freeCanvasHeight?: number) =>
  new Request("http://localhost/api/studio/submissions", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      ...content,
      layout: freeCanvasHeight ? "free" : "row",
      layers: content.visual.layers,
      ...(freeCanvasHeight ? { freeCanvasHeight } : {}),
      submit,
      deepReview: false,
    }),
  });
beforeEach(() => {
  insertOne.mockClear();
  updateOne.mockClear();
  jest.mocked(runEveStudioReview).mockReset();
  jest.mocked(gradeUserPuzzleSubmission).mockClear();
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
it("passes the expanded free-canvas height through grading and draft persistence", async () => {
  jest.mocked(gradeUserPuzzleSubmission).mockResolvedValue({
    ...grade,
    visual: { ...content.visual, layout: "free", freeCanvasHeight: 876 },
  });

  const response = await POST(request(false, 876));

  expect(response.status).toBe(200);
  expect(gradeUserPuzzleSubmission).toHaveBeenCalledWith(
    expect.objectContaining({
      visual: expect.objectContaining({ layout: "free", freeCanvasHeight: 876 }),
    })
  );
  expect(updateOne).toHaveBeenCalledWith(
    expect.anything(),
    expect.objectContaining({
      $set: expect.objectContaining({
        visual: expect.objectContaining({ freeCanvasHeight: 876 }),
      }),
    }),
    expect.anything()
  );
});
it("keeps tall free canvases editable as drafts", async () => {
  jest.mocked(gradeUserPuzzleSubmission).mockResolvedValue({
    ...grade,
    visual: { ...content.visual, layout: "free", freeCanvasHeight: 8_000 },
  });

  const response = await POST(request(false, 8_000));

  expect(response.status).toBe(200);
  expect(updateOne).toHaveBeenCalledWith(
    expect.anything(),
    expect.objectContaining({
      $set: expect.objectContaining({
        visual: expect.objectContaining({ freeCanvasHeight: 8_000 }),
      }),
    }),
    expect.anything()
  );
});
it("rejects unsupported free-canvas heights", async () => {
  const response = await POST(request(false, 20_161));
  expect(response.status).toBe(400);
  expect(gradeUserPuzzleSubmission).not.toHaveBeenCalled();
});
it("allows tall free-canvas drafts but blocks submissions the canonical renderer cannot fit", async () => {
  const response = await POST(request(true, 8_000));

  expect(response.status).toBe(400);
  expect((await response.json()).error).toMatch(/up to 2,000 pixels tall/);
  expect(runEveStudioReview).not.toHaveBeenCalled();
});
it("publishes only a complete matching server review", async () => {
  jest.mocked(runEveStudioReview).mockResolvedValue(review);
  const response = await POST(request(true));
  expect(response.status).toBe(200);
  expect((await response.json()).submission.status).toBe("approved");
  expect(insertOne).toHaveBeenCalledTimes(1);
});
