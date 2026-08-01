/**
 * Research-backed rebus craft principles.
 *
 * Sources informing these rules:
 * - EnigMarch Academy: backform from the answer; equation / phonetic / position / literal devices
 * - Designbeep rebus guide: one clean reading via position, size, repetition, direction, style
 * - NPL / puzzle community: avoid phonetic clichés (C=see); be kind — hard rubric needs fair hints
 * - Iconography research: silhouette-first recognition; one focal object; exaggerate distinguishing marks
 */

export const REBUS_CRAFT_RULES = [
  "Backform from the answer: pick the phrase first, then choose ONE primary device (compound, position, size, phonetic, equation, literal idiom).",
  "One clean reading: a fair board has a single intended parse once seen — not multiple equally plausible answers.",
  "Concrete nouns only for pictograms: every icon must be a drawable object a stranger can name in one second.",
  "Mechanism carries the wit: prefer position/size/repetition/direction/equation over tired phonetic letter swaps (C=see).",
  "Fair discovery path: early hints name the device family; later hints narrow; only the final hint may nudge a letter.",
  "Accessibility: unicodeFallback / share text should still describe the board when SVGs are unavailable.",
] as const;

/** Short prompt block for Eve / Apex briefs */
export function rebusCraftBrief(): string {
  return [
    "Rebus craft (research-backed):",
    ...REBUS_CRAFT_RULES.map((rule) => `- ${rule}`),
    "Freshness: invent mechanisms cousins of classic tropes — do not ship before/sunflower/piece-of-cake clones.",
  ].join("\n");
}

/**
 * Positive mechanism templates — invent around these shapes, don't copy the examples.
 */
export const MECHANISM_TEMPLATES = [
  {
    id: "compound_pair",
    summary: "Two concrete icons whose spoken names concatenate into a familiar compound",
    example: "key + hole → keyhole",
  },
  {
    id: "positional_idiom",
    summary: "Layout encodes a preposition (over/under/in/between/before)",
    example: "HEAD stacked above HEELS → head over heels",
  },
  {
    id: "size_semantics",
    summary: "Scale or emphasis is the joke (tiny/large/strike)",
    example: "tiny FISH beside large POND → small fish in a big pond",
  },
  {
    id: "equation_trim",
    summary: "Add/subtract a sound or letter from a pictured noun",
    example: "BREAD − B + HAIR + RING → red herring (phonetic chain)",
  },
  {
    id: "literal_idiom",
    summary: "Idiom shown as a literal scene with 1–2 icons + optional styled text",
    example: "spill + tea cup → spill the tea",
  },
  {
    id: "false_lead_then_twist",
    summary: "Board tempts a wrong compound; placement or operator reveals the real phrase",
    example: "Looks like cat+box until UNDER placement yields 'under the weather'",
  },
] as const;

export function mechanismTemplateBrief(): string {
  return [
    "Invent using one of these mechanism shapes (do not copy the examples):",
    ...MECHANISM_TEMPLATES.map((t) => `- ${t.id}: ${t.summary}`),
  ].join("\n");
}
