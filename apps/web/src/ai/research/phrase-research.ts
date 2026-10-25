/**
 * Answer-phrase research.
 *
 * Before a tournament spends premium model and vision budget on an answer,
 * research what the phrase means, whether ordinary players know it, which
 * wordings people actually use, where it comes from, and whether it carries
 * sensitivity risk. The verdict is computed by the host from corroborated
 * claims, not taken from the model's self-assessment.
 */

import { z } from "zod";
import { normalizeAnswerKey } from "../puzzle-agent/quality";
import { usableClaims } from "./corroboration";
import {
  type PhraseFamiliarity,
  PhraseFamiliaritySchema,
  type ResearchClaim,
  type ResearchDossier,
  type StoredAnswerResearch,
  StoredAnswerResearchSchema,
} from "./types";
import { runWebResearch } from "./web-research";

export const PhraseAssessmentSchema = z.object({
  familiarity: PhraseFamiliaritySchema.describe(
    "How well a typical adult English speaker knows the phrase, judged only from the sources"
  ),
  isEstablishedPhrase: z
    .boolean()
    .describe("True when a reference source lists it as an idiom, compound, or set phrase"),
  meaning: z.string().max(300).optional(),
  variants: z
    .array(z.string().max(60))
    .max(6)
    .describe("Other wordings or spellings the sources show people use for the same phrase"),
  sensitivity: z.object({
    flagged: z.boolean(),
    reasons: z.array(z.string().max(160)).max(4),
  }),
  regional: z.string().max(200).optional(),
});
export type PhraseAssessment = z.infer<typeof PhraseAssessmentSchema>;

export type PhraseVerdict = "use" | "caution" | "avoid";

export interface PhraseResearch {
  answer: string;
  dossier: ResearchDossier<PhraseAssessment>;
  familiarity: PhraseFamiliarity;
  meaning?: string;
  variants: string[];
  facts: ResearchClaim[];
  verdict: PhraseVerdict;
  verdictReasons: string[];
}

const CLAIM_KINDS = ["meaning", "origin", "usage", "variant", "sensitivity", "popularity"] as const;

function normalizePhrase(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/** Keep only variants that a retrieved source or usable claim actually shows. */
export function groundedVariants(
  answer: string,
  candidates: readonly string[],
  evidence: readonly string[]
): string[] {
  const answerKey = normalizeAnswerKey(answer);
  const haystack = ` ${evidence.map(normalizePhrase).join(" | ")} `;
  const seen = new Set<string>([answerKey]);
  const variants: string[] = [];
  for (const candidate of candidates) {
    const phrase = normalizePhrase(candidate);
    const key = normalizeAnswerKey(candidate);
    if (!phrase || !key || seen.has(key)) continue;
    if (phrase.split(" ").length > 8) continue;
    if (!haystack.includes(` ${phrase} `)) continue;
    seen.add(key);
    variants.push(candidate.trim());
  }
  return variants.slice(0, 6);
}

/** Host-owned verdict from corroborated evidence. */
export function decidePhraseVerdict(input: {
  status: ResearchDossier["status"];
  reason?: string;
  assessment?: PhraseAssessment;
  facts: readonly ResearchClaim[];
}): { verdict: PhraseVerdict; reasons: string[]; familiarity: PhraseFamiliarity } {
  if (input.status !== "researched" || !input.assessment) {
    return {
      verdict: "caution",
      reasons: [`research unavailable (${input.reason ?? input.status})`],
      familiarity: "unknown",
    };
  }

  const reasons: string[] = [];
  const hasMeaning = input.facts.some((fact) => fact.kind === "meaning");
  const sensitivityFacts = input.facts.filter((fact) => fact.kind === "sensitivity");
  let familiarity = input.assessment.familiarity;
  // A phrase no retrieved reference defines cannot be called everyday.
  if (!hasMeaning && (familiarity === "everyday" || familiarity === "common")) {
    familiarity = "unknown";
    reasons.push("no corroborated definition found");
  }

  let verdict: PhraseVerdict = "use";
  if (input.assessment.sensitivity.flagged) {
    if (sensitivityFacts.length) {
      verdict = "avoid";
      reasons.push(
        `sensitivity: ${input.assessment.sensitivity.reasons.join("; ") || sensitivityFacts[0]?.statement}`
      );
    } else {
      verdict = "caution";
      reasons.push("possible sensitivity issue without corroboration");
    }
  }
  if (familiarity === "obscure") {
    verdict = "avoid";
    reasons.push("sources indicate the phrase is obscure to general players");
  } else if (familiarity === "niche" || familiarity === "unknown") {
    if (verdict === "use") verdict = "caution";
    reasons.push(`familiarity ${familiarity}`);
  }
  if (!input.assessment.isEstablishedPhrase && !hasMeaning) {
    if (verdict === "use") verdict = "caution";
    reasons.push("no reference attests it as an established phrase");
  }
  if (input.assessment.regional) reasons.push(`regional: ${input.assessment.regional}`);

  return { verdict, reasons, familiarity };
}

export async function researchAnswerPhrase(answer: string): Promise<PhraseResearch> {
  const subject = answer.trim();
  const dossier = await runWebResearch({
    subject,
    kind: "answer-phrase",
    operation: "research-answer",
    objective:
      "Verify a daily puzzle answer phrase: its meaning, how widely it is known, accepted wordings, documented origin, and any sensitivity risk.",
    questions: [
      `What does "${subject}" mean, according to dictionaries or idiom references?`,
      `Would a typical adult English speaker in the US or UK recognize "${subject}"? Is it everyday, common, niche, or obscure?`,
      `What other wordings or spellings are used for "${subject}" (articles, hyphenation, plural, regional forms)?`,
      `What is the documented origin or earliest recorded use of "${subject}"? Only report dates the sources state.`,
      `Is "${subject}" offensive, crude, a slur, a trademark, or tied to a tragedy, in any common reading?`,
    ],
    seedQueries: [
      `"${subject}" meaning`,
      `"${subject}" idiom origin`,
      `"${subject}" etymology earliest use`,
    ],
    claimKinds: CLAIM_KINDS,
    assessmentSchema: PhraseAssessmentSchema,
    assessmentInstructions: [
      "familiarity: everyday (nearly everyone knows it), common (most adults), niche (hobbyists/regions), obscure (rare/archaic), unknown (sources do not say).",
      "isEstablishedPhrase: true only if a dictionary or idiom reference lists it.",
      "variants: only wordings that appear in the source text.",
      "sensitivity.flagged: true only when a source documents an offensive, crude, or tragic association.",
    ].join("\n"),
  });

  const facts = usableClaims(dossier.claims);
  const decision = decidePhraseVerdict({
    status: dossier.status,
    reason: dossier.reason,
    assessment: dossier.assessment,
    facts,
  });
  const evidence = [
    ...dossier.sources.map((s) => `${s.title} ${s.snippet}`),
    ...facts.map((f) => f.statement),
  ];

  return {
    answer: subject,
    dossier,
    familiarity: decision.familiarity,
    meaning: facts.find((fact) => fact.kind === "meaning")?.statement,
    variants: groundedVariants(subject, dossier.assessment?.variants ?? [], evidence),
    facts,
    verdict: decision.verdict,
    verdictReasons: decision.reasons,
  };
}

/**
 * Prompt block for generation and critique. Only corroborated facts are
 * included, so the puzzle explanation and hints cannot inherit an invented
 * etymology.
 */
export function formatPhraseResearchForPrompt(
  research: Pick<
    PhraseResearch,
    "answer" | "familiarity" | "meaning" | "variants" | "facts" | "verdict" | "verdictReasons"
  > & { dossier?: { status: string } }
): string | undefined {
  if (research.dossier && research.dossier.status !== "researched") return undefined;
  if (!research.facts.length && !research.meaning) return undefined;
  const origin = research.facts.filter((f) => f.kind === "origin").slice(0, 2);
  const usage = research.facts.filter((f) => f.kind === "usage" || f.kind === "popularity");
  return [
    `WEB-RESEARCHED ANSWER BRIEF for "${research.answer}" (corroborated sources only):`,
    research.meaning ? `- Meaning: ${research.meaning}` : null,
    `- Familiarity: ${research.familiarity}; editorial verdict: ${research.verdict}${research.verdictReasons.length ? ` (${research.verdictReasons.join("; ")})` : ""}.`,
    research.variants.length
      ? `- Other wordings players may type: ${research.variants.join(", ")}`
      : null,
    ...origin.map((f) => `- Origin (${f.support}): ${f.statement}`),
    ...usage.slice(0, 1).map((f) => `- Usage: ${f.statement}`),
    "Use the researched meaning for the explanation and hints. Do not add history, dates, or origin stories beyond this brief.",
  ]
    .filter(Boolean)
    .join("\n");
}

export function toStoredAnswerResearch(research: PhraseResearch): StoredAnswerResearch {
  const citedIds = new Set(research.facts.flatMap((fact) => fact.sourceIds));
  return StoredAnswerResearchSchema.parse({
    version: 1,
    answer: research.answer,
    status: research.dossier.status,
    verdict: research.verdict,
    verdictReasons: research.verdictReasons.slice(0, 8),
    familiarity: research.familiarity,
    ...(research.meaning ? { meaning: research.meaning } : {}),
    variants: research.variants.slice(0, 8),
    facts: research.facts.slice(0, 16).map((fact) => ({
      statement: fact.statement,
      kind: fact.kind,
      support: fact.support === "verified" ? "verified" : "single-source",
      sourceIds: fact.sourceIds.slice(0, 6),
    })),
    sources: research.dossier.sources
      .filter((source) => citedIds.has(source.id))
      .slice(0, 16)
      .map(({ id, url, title, domain, tier }) => ({ id, url, title, domain, tier })),
    researchedAt: research.dossier.researchedAt,
  });
}

export function parseStoredAnswerResearch(value: unknown): StoredAnswerResearch | undefined {
  const parsed = StoredAnswerResearchSchema.safeParse(value);
  return parsed.success ? parsed.data : undefined;
}
