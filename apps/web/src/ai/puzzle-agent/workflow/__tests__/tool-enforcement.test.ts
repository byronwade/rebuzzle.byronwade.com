import {
  HARD_REQUIRED_TOOLS,
  enforceRequiredTools,
  extractCalledTools,
  formatToolEnforcementFailure,
} from "../tool-enforcement";

describe("tool enforcement", () => {
  it("extracts tool names from AI SDK-like steps", () => {
    const called = extractCalledTools({
      steps: [
        { toolCalls: [{ toolName: "sample_answer_corpus" }] },
        {
          toolCalls: [{ toolName: "compose_puzzle_visual" }],
          toolResults: [{ toolName: "craft_hint_ladder" }],
        },
      ],
    });
    expect(called).toEqual(
      expect.arrayContaining([
        "sample_answer_corpus",
        "compose_puzzle_visual",
        "craft_hint_ladder",
      ])
    );
  });

  it("hard-fails when compose/score tools are missing", () => {
    const result = enforceRequiredTools({
      calledTools: ["sample_answer_corpus", "get_generation_brief"],
      requiredTools: [
        "sample_answer_corpus",
        "compose_puzzle_visual",
        "craft_hint_ladder",
        "score_quality",
        "check_anti_clone",
      ],
    });
    expect(result.ok).toBe(false);
    expect(result.missing).toEqual(
      expect.arrayContaining([...HARD_REQUIRED_TOOLS])
    );
    expect(formatToolEnforcementFailure(result)).toMatch(/Missing required/);
  });

  it("passes when invent-core + hard tools were called", () => {
    const result = enforceRequiredTools({
      calledTools: [
        "get_generation_brief",
        "sample_answer_corpus",
        "compose_puzzle_visual",
        "craft_hint_ladder",
        "score_quality",
        "check_anti_clone",
        "score_hint_fairness",
        "score_shareability",
      ],
      requiredTools: [
        "get_generation_brief",
        "sample_answer_corpus",
        "compose_puzzle_visual",
        "craft_hint_ladder",
        "score_quality",
        "check_anti_clone",
        "score_hint_fairness",
        "score_shareability",
      ],
    });
    expect(result.ok).toBe(true);
    expect(result.missing).toEqual([]);
  });
});
