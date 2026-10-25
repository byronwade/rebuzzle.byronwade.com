jest.mock("../../client", () => ({
  generateAIObject: jest.fn().mockResolvedValue({}),
  withRetry: jest.fn((fn: () => Promise<unknown>) => fn()),
}));

import { generateAIObject } from "../../client";
import { aiSelfTest } from "../difficulty-calibrator";

it("keeps answers and hint spoilers out of unaided calibration", async () => {
  await aiSelfTest({ rebusPuzzle: "👁️ + LAND", answer: "SECRET_ANSWER", hints: ["SECRET_HINT"] });
  const request = jest.mocked(generateAIObject).mock.calls[0]![0];
  expect(request.prompt).toContain("👁️ + LAND");
  expect(request.prompt).not.toContain("SECRET_ANSWER");
  expect(request.prompt).not.toContain("SECRET_HINT");
});
