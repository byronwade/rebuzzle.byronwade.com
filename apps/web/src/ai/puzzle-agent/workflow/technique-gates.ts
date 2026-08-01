/**
 * Hard technique gating by difficulty tier + diversity families for workflow slots.
 */

import { isTechniqueAllowedForTarget } from "../quality";
import type { TechniqueId } from "../technique-library";

/** Mechanism families for diverse Apex/workflow slots */
export const TECHNIQUE_FAMILIES = {
  compound: [
    "simple_compound",
    "multi_emoji_compound",
    "obvious_emoji_sum",
    "hyphen_compound",
  ],
  positional: [
    "basic_positional",
    "positional_phrase",
    "spatial_preposition_play",
    "container_phrase",
    "direction_wordplay",
  ],
  phonetic: ["single_homophone", "nested_homophone", "multi_layer_phonetic"],
  idiom: ["idiom_as_picture", "rare_but_fair_idiom"],
  typography: ["size_or_case_semantics", "letter_play"],
  brand: ["brand_logo_wordplay", "cultural_common_knowledge_plus_twist"],
  advanced: [
    "false_lead_visual",
    "triple_layer_composition",
    "recursive_visual_pun",
    "math_symbol_wordplay",
    "letter_play",
    "container_phrase",
  ],
} as const;

export type TechniqueFamily = keyof typeof TECHNIQUE_FAMILIES;

export const isTechniqueAllowedForTier = isTechniqueAllowedForTarget;

export function familyForTechnique(techniqueId: string): TechniqueFamily | null {
  for (const [family, ids] of Object.entries(TECHNIQUE_FAMILIES) as Array<
    [TechniqueFamily, readonly string[]]
  >) {
    if (ids.includes(techniqueId)) return family;
  }
  return null;
}

/**
 * Pick distinct technique focuses for tournament slots (max diversity).
 */
export function pickDiverseTechniqueFocuses(
  preferred: TechniqueId[],
  slotCount: number,
  targetDifficulty: number
): TechniqueId[] {
  const allowed = preferred.filter((id) =>
    isTechniqueAllowedForTier(id, targetDifficulty)
  );
  const pool = allowed.length ? allowed : preferred;
  const usedFamilies = new Set<TechniqueFamily>();
  const picks: TechniqueId[] = [];

  for (const id of pool) {
    if (picks.length >= slotCount) break;
    const family = familyForTechnique(id);
    if (family && usedFamilies.has(family)) continue;
    picks.push(id);
    if (family) usedFamilies.add(family);
  }

  // Fill remaining slots if we ran out of families
  for (const id of pool) {
    if (picks.length >= slotCount) break;
    if (!picks.includes(id)) picks.push(id);
  }

  while (picks.length < slotCount && pool[0]) {
    picks.push(pool[picks.length % pool.length]!);
  }

  return picks;
}
