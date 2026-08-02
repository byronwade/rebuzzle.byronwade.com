import {
  AIBudgetExceededError,
  createErrorResponse,
  isHardAIBudgetError,
  parseAIError,
  QuotaExceededError,
} from "../errors";

describe("AI budget errors", () => {
  it("classifies nested Gateway budget payloads as terminal and sanitized", () => {
    const raw = Object.assign(new Error("Gateway request failed"), {
      name: "GatewayError",
      data: {
        error: {
          type: "quota_for_entity_exceeded",
          message: "API key budget exceeded. Current spend: $10.40, limit: $10.00.",
        },
      },
    });

    expect(isHardAIBudgetError(raw)).toBe(true);
    const parsed = parseAIError(raw);
    expect(parsed).toBeInstanceOf(AIBudgetExceededError);
    expect(parsed.code).toBe("AI_BUDGET_EXCEEDED");
    expect(parsed.message).not.toContain("$10.40");
    expect(parsed.message).not.toContain("$10.00");
    expect(createErrorResponse(parsed)).toMatchObject({
      retryable: false,
      fallbackAvailable: false,
      code: "AI_BUDGET_EXCEEDED",
    });
  });

  it("finds a hard budget error through RetryError-style nesting", () => {
    const raw = {
      name: "RetryError",
      errors: [
        new Error("temporary provider error"),
        { error: { type: "quota_for_entity_exceeded" } },
      ],
    };

    expect(parseAIError(raw)).toBeInstanceOf(AIBudgetExceededError);
  });

  it("keeps transient request quotas retryable", () => {
    const parsed = parseAIError(new Error("Quota exceeded for metric requests_per_minute"));

    expect(isHardAIBudgetError(parsed)).toBe(false);
    expect(parsed).toBeInstanceOf(QuotaExceededError);
    expect(createErrorResponse(parsed).retryable).toBe(true);
  });
});
