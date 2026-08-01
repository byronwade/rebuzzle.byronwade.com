/**
 * Hard invent-DAG enforcement — required tools must actually be called.
 */

export type ToolEnforcementResult = {
  ok: boolean;
  called: string[];
  missing: string[];
  /** Soft-required tools that were skipped (warn only) */
  missingOptional: string[];
};

/** Always required for a publishable Eve candidate */
export const HARD_REQUIRED_TOOLS = [
  "compose_puzzle_visual",
  "craft_hint_ladder",
  "score_quality",
] as const;

/** Strongly preferred when invent plan lists them */
export const INVENT_CORE_TOOLS = [
  "sample_answer_corpus",
  "get_generation_brief",
  "check_anti_clone",
  "score_hint_fairness",
  "score_shareability",
] as const;

type StepLike = {
  toolCalls?: Array<{ toolName?: string; type?: string }>;
  toolResults?: Array<{ toolName?: string; type?: string }>;
};

/**
 * Extract tool names from an AI SDK generate result (best-effort).
 */
export function extractCalledTools(result: unknown): string[] {
  const names = new Set<string>();
  const root = result as {
    steps?: StepLike[];
    toolCalls?: Array<{ toolName?: string }>;
    response?: { messages?: unknown[] };
  };

  for (const step of root.steps ?? []) {
    for (const call of step.toolCalls ?? []) {
      const name = call.toolName || (call as { type?: string }).type;
      if (name && !String(name).startsWith("tool-")) names.add(String(name));
      // AI SDK sometimes uses type: "tool-call" with toolName
      if (call.toolName) names.add(call.toolName);
    }
    for (const tr of step.toolResults ?? []) {
      if (tr.toolName) names.add(tr.toolName);
    }
  }

  for (const call of root.toolCalls ?? []) {
    if (call.toolName) names.add(call.toolName);
  }

  return [...names];
}

/**
 * Check required tools against observed calls.
 * Hard tools always required; invent-plan tools are hard when listed in requiredTools.
 */
export function enforceRequiredTools(input: {
  calledTools: string[];
  requiredTools?: string[];
  /** When true, invent-core tools in requiredTools are hard-fail */
  strictInvent?: boolean;
}): ToolEnforcementResult {
  const called = [...new Set(input.calledTools.map((t) => t.trim()).filter(Boolean))];
  const calledSet = new Set(called);

  const hard = new Set<string>(HARD_REQUIRED_TOOLS);
  const optional = new Set<string>();

  for (const tool of input.requiredTools ?? []) {
    if (
      (HARD_REQUIRED_TOOLS as readonly string[]).includes(tool) ||
      (input.strictInvent !== false &&
        (INVENT_CORE_TOOLS as readonly string[]).includes(tool))
    ) {
      hard.add(tool);
    } else {
      optional.add(tool);
    }
  }

  // Brand / phonetic plan tools are optional hard — only if listed
  for (const tool of input.requiredTools ?? []) {
    if (
      tool === "lookup_brand_logo" ||
      tool === "lookup_phonetic_cues" ||
      tool === "lookup_word_senses" ||
      tool === "research_cultural_pulse" ||
      tool === "expand_wordplay"
    ) {
      // soft unless already in hard from invent core
      if (!hard.has(tool)) optional.add(tool);
    }
  }

  const missing = [...hard].filter((t) => !calledSet.has(t));
  const missingOptional = [...optional].filter((t) => !calledSet.has(t) && !hard.has(t));

  return {
    ok: missing.length === 0,
    called,
    missing,
    missingOptional,
  };
}

export function formatToolEnforcementFailure(result: ToolEnforcementResult): string {
  return `Missing required invent tools: ${result.missing.join(", ")}. Called: ${
    result.called.join(", ") || "(none)"
  }. You MUST call compose_puzzle_visual, craft_hint_ladder, score_quality, and invent-plan tools.`;
}
