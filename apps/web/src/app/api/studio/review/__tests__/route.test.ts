const runEveStudioReview = jest.fn();

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
jest.mock("@/lib/ugc/eve-review", () => ({
  runEveStudioReview: (...args: unknown[]) => runEveStudioReview(...args),
  publicEveReview: (review: unknown) => review,
}));

import { POST } from "../route";

const review = { reviewId: "review", verdict: "pending" };

beforeEach(() => {
  runEveStudioReview.mockReset().mockResolvedValue(review);
});

function request(freeCanvasHeight: number) {
  return new Request("http://localhost/api/studio/review", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      answer: "sunflower",
      explanation: "Sun and flower make sunflower.",
      hints: ["a", "b", "c"],
      techniqueId: "simple_compound",
      difficulty: 4,
      layout: "free",
      freeCanvasHeight,
      layers: [{ kind: "text", content: "SUN" }],
      sync: true,
      persist: false,
    }),
  });
}

it("keeps an expanded free-canvas height in the review visual", async () => {
  const response = await POST(request(1_800));

  expect(response.status).toBe(200);
  expect(runEveStudioReview).toHaveBeenCalledWith(
    expect.objectContaining({
      visual: expect.objectContaining({ layout: "free", freeCanvasHeight: 1_800 }),
    })
  );
});

it("keeps tall draft canvases out of review until they fit the canonical render limit", async () => {
  const response = await POST(request(8_000));

  expect(response.status).toBe(400);
  expect((await response.json()).error).toMatch(/up to 2,000 pixels tall/);
  expect(runEveStudioReview).not.toHaveBeenCalled();
});

it("rejects free-canvas heights outside the supported board range", async () => {
  const response = await POST(request(20_161));

  expect(response.status).toBe(400);
  expect(runEveStudioReview).not.toHaveBeenCalled();
});
