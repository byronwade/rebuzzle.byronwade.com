/**
 * Publication ToolLoop active-tool lists.
 *
 * Kept free of AI SDK imports so contract tests can assert wiring without
 * loading the ESM `ai` package graph.
 */

/** Active ToolLoop tools for publication generation. */
export const PUBLICATION_AGENT_TOOLS = [
  "get_puzzle_type_spec",
  "get_difficulty_brief",
  "get_generation_brief",
  "list_recent_answers",
  "propose_concept_seeds",
  "list_technique_library",
  "list_pictogram_catalog",
  "inspect_answer_seed_cues",
  "preflight_compose_cue_plan",
  "compose_puzzle_visual",
  "craft_hint_ladder",
] as const;

/**
 * Tools that read official puzzle answers. A user-initiated (Studio) run puts
 * untrusted creator text in the loop, so these must never be reachable there;
 * novelty is still enforced host-side by `checkUniqueness` after the draft.
 */
export const OFFICIAL_ANSWER_READING_TOOLS = ["list_recent_answers"] as const;

/** Who started the generation run. */
export type PuzzleAgentToolSurface = "publication" | "studio";

/** Active ToolLoop tools for a generation surface. */
export function activeToolsForSurface(surface: PuzzleAgentToolSurface = "publication"): string[] {
  if (surface === "publication") return [...PUBLICATION_AGENT_TOOLS];
  const blocked = new Set<string>(OFFICIAL_ANSWER_READING_TOOLS);
  return PUBLICATION_AGENT_TOOLS.filter((name) => !blocked.has(name));
}

/** Host-side efficiency tools that must exist in both Eve and in-process surfaces. */
export const EFFICIENCY_AGENT_TOOLS = [
  "list_pictogram_catalog",
  "inspect_answer_seed_cues",
  "preflight_compose_cue_plan",
  "get_generation_brief",
] as const;
