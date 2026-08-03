/**
 * Invent concept / answer / difficulty for Dev Visual Lab when the UI omits them.
 */

import { z } from "zod";
import { generateAIObject } from "@/ai/client";
import { resolveAdaptiveDifficultyForDate } from "@/ai/learning";
import { PHRASE_BANK } from "../apex/phrase-bank";

export type LabBrief = {
  concept: string;
  answer: string;
  difficulty: number;
  source: "ai" | "phrase-bank" | "adaptive";
};

const LabBriefSchema = z.object({
  concept: z
    .string()
    .min(2)
    .max(48)
    .describe("Concrete visual noun or short imageable idea for a rebus board"),
  answer: z.string().min(3).max(64).describe("Idiom, compound, or phrase the rebus could encode"),
  difficulty: z.number().min(4).max(9),
});

function pickPhraseBankBrief(difficulty: number): LabBrief {
  const pool = PHRASE_BANK.filter((p) => Math.abs((p.difficultyHint ?? 5) - difficulty) <= 2);
  const entries = pool.length ? pool : [...PHRASE_BANK];
  const entry = entries[Math.floor(Math.random() * entries.length)]!;
  const answer = entry.answer;
  // Prefer a concrete visual noun from the answer for pictogram probes
  const concept =
    answer
      .split(/[\s-]+/)
      .find((w) => w.length >= 3)
      ?.replace(/[^a-zA-Z]/g, "")
      .toLowerCase() || "sun";

  return {
    concept: concept.slice(0, 48),
    answer: answer.slice(0, 64),
    difficulty: Math.max(4, Math.min(9, entry.difficultyHint ?? difficulty)),
    source: "phrase-bank",
  };
}

/**
 * Resolve a lab brief. Prefer AI invention; fall back to phrase bank + adaptive difficulty.
 */
export async function inventLabBrief(input?: {
  concept?: string;
  answer?: string;
  difficulty?: number;
}): Promise<LabBrief> {
  const adaptive = await resolveAdaptiveDifficultyForDate(new Date());
  const difficulty = Math.max(4, Math.min(9, input?.difficulty ?? adaptive.target));

  const hasConcept = Boolean(input?.concept?.trim());
  const hasAnswer = Boolean(input?.answer?.trim());
  if (hasConcept && hasAnswer) {
    return {
      concept: input!.concept!.trim().slice(0, 48),
      answer: input!.answer!.trim().slice(0, 64),
      difficulty,
      source: "adaptive",
    };
  }

  try {
    const invented = await generateAIObject({
      modelType: "fast",
      temperature: 0.9,
      schema: LabBriefSchema,
      system: `You invent fresh rebus Visual Lab seeds.
Return:
1) concept — a CONCRETE imageable noun an icon designer can draw in 1 second (key, umbrella, lighthouse, anchor, hourglass). Never abstract words like love/time/success/energy alone.
2) answer — a playful idiom/compound/phrase the rebus could encode
3) difficulty 4–9
Hard-avoid overused answers: before, sunflower, piece of cake, belief, reading between the lines, big deal.
Prefer idioms and compounds with clear visual nouns and a clever but fair aha.`,
      prompt: [
        `Invent a Visual Lab seed around difficulty ${difficulty} (${adaptive.tierLabel}).`,
        hasConcept
          ? `Concept hint: ${input!.concept}`
          : "Choose a concrete noun yourself (object/animal/tool — not an abstract idea).",
        hasAnswer
          ? `Answer hint: ${input!.answer}`
          : "Choose a fresh answer yourself (not a classic rebus cliché).",
      ].join("\n"),
    });

    return {
      concept: invented.concept.trim().slice(0, 48),
      answer: invented.answer.trim().slice(0, 64),
      difficulty: Math.max(4, Math.min(9, invented.difficulty || difficulty)),
      source: "ai",
    };
  } catch {
    return pickPhraseBankBrief(difficulty);
  }
}
