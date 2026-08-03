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

/** Host-side efficiency tools that must exist in both Eve and in-process surfaces. */
export const EFFICIENCY_AGENT_TOOLS = [
  "list_pictogram_catalog",
  "inspect_answer_seed_cues",
  "preflight_compose_cue_plan",
  "get_generation_brief",
] as const;
