const generateText = jest.fn();
const enforceQuota = jest.fn().mockResolvedValue(undefined);
const gatewayModel = jest.fn((modelId: string) => ({ modelId }));

jest.mock("ai", () => ({
  generateText,
  streamText: jest.fn(),
  Output: { object: jest.fn((value) => value) },
}));
jest.mock("@ai-sdk/gateway", () => ({
  createGateway: jest.fn(() => gatewayModel),
  gateway: gatewayModel,
}));
jest.mock("../quota-manager", () => ({ enforceQuota }));

import { generateAIText, withRetry } from "../client";

describe("AI client hard budget behavior", () => {
  const originalKey = process.env.AI_GATEWAY_API_KEY;

  beforeEach(() => {
    jest.clearAllMocks();
    enforceQuota.mockResolvedValue(undefined);
    process.env.AI_GATEWAY_API_KEY = "vck_unit_test_credential";
  });

  afterAll(() => {
    if (originalKey === undefined) process.env.AI_GATEWAY_API_KEY = undefined;
    else process.env.AI_GATEWAY_API_KEY = originalKey;
  });

  it("does not try fallback models after a Gateway spending-cap response", async () => {
    generateText.mockRejectedValue({
      data: {
        error: {
          type: "quota_for_entity_exceeded",
          message: "API key budget exceeded. Current spend: $10.40, limit: $10.00.",
        },
      },
    });

    await expect(generateAIText({ prompt: "test", modelType: "smart" })).rejects.toMatchObject({
      code: "AI_BUDGET_EXCEEDED",
    });
    expect(generateText).toHaveBeenCalledTimes(1);
  });

  it("does not locally retry a nested spending-cap response", async () => {
    const operation = jest.fn().mockRejectedValue({
      lastError: { error: { type: "quota_for_entity_exceeded" } },
    });

    await expect(withRetry(operation, 3)).rejects.toMatchObject({
      code: "AI_BUDGET_EXCEEDED",
    });
    expect(operation).toHaveBeenCalledTimes(1);
  });
});
