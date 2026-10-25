/**
 * Research grounding for the nightly archive post.
 *
 * The blog writer gets numbered, corroborated facts instead of being asked to
 * "discuss the history" from memory. Facts about the answer are spoilers, so
 * they are reserved for the Solution section; format-history facts feed the
 * History section. A deterministic gate then flags any year the draft states
 * that the research never verified, and the review PR lists every fact with
 * its source links.
 */

import { z } from "zod";
import { normalizeAnswerKey } from "../puzzle-agent/quality";
import { extractClaimNumbers, usableClaims } from "./corroboration";
import {
  parseStoredAnswerResearch,
  researchAnswerPhrase,
  toStoredAnswerResearch,
} from "./phrase-research";
import type { ResearchDossier, StoredAnswerResearch } from "./types";
import { runWebResearch } from "./web-research";

export interface BlogResearchFact {
  id: string;
  statement: string;
  /** `answer` facts are spoilers; `format` facts are safe for any section. */
  scope: "answer" | "format";
  kind: string;
  support: "verified" | "single-source";
  sources: Array<{ url: string; title: string; domain: string }>;
}

export interface BlogResearchPack {
  facts: BlogResearchFact[];
  answerResearch?: StoredAnswerResearch;
  status: "researched" | "partial" | "unavailable";
}

export interface BlogResearchNotes {
  status: BlogResearchPack["status"];
  facts: BlogResearchFact[];
  /** Claims in the final draft that research could not verify. */
  warnings: string[];
}

const FormatHistoryAssessmentSchema = z.object({
  coverage: z.enum(["good", "thin", "none"]),
});

function researchFormatHistory(typeName: string): Promise<ResearchDossier<unknown>> {
  const subject = `${typeName.toLowerCase()} puzzles`;
  return runWebResearch({
    subject,
    kind: "puzzle-format-history",
    operation: "research-format-history",
    objective: `Collect well-sourced facts about the history and cultural use of ${subject}.`,
    questions: [
      `Where and when are ${subject} first documented? Only report dates the sources state.`,
      `How have ${subject} been used in print, games, education, or popular culture over time?`,
      `What notable, verifiable examples or milestones of ${subject} exist?`,
    ],
    seedQueries: [
      `history of ${subject}`,
      `${typeName.toLowerCase()} puzzle origin`,
      `${typeName.toLowerCase()} etymology`,
    ],
    claimKinds: ["origin", "history", "example", "culture"],
    assessmentSchema: FormatHistoryAssessmentSchema,
    assessmentInstructions: "coverage: how well the sources document this history.",
  });
}

function answerFacts(research: StoredAnswerResearch): BlogResearchFact[] {
  const sourceById = new Map(research.sources.map((source) => [source.id, source]));
  return research.facts
    .filter((fact) => fact.kind === "meaning" || fact.kind === "origin" || fact.kind === "usage")
    .map((fact) => ({
      id: "",
      statement: fact.statement,
      scope: "answer" as const,
      kind: fact.kind,
      support: fact.support,
      sources: fact.sourceIds.flatMap((id) => {
        const source = sourceById.get(id);
        return source ? [{ url: source.url, title: source.title, domain: source.domain }] : [];
      }),
    }));
}

function formatFacts(dossier: ResearchDossier<unknown>): BlogResearchFact[] {
  const sourceById = new Map(dossier.sources.map((source) => [source.id, source]));
  return usableClaims(dossier.claims).map((claim) => ({
    id: "",
    statement: claim.statement,
    scope: "format" as const,
    kind: claim.kind,
    support: claim.support === "verified" ? "verified" : "single-source",
    sources: claim.sourceIds.flatMap((id) => {
      const source = sourceById.get(id);
      return source ? [{ url: source.url, title: source.title, domain: source.domain }] : [];
    }),
  }));
}

/**
 * Gather research for a post. Prefers the answer research stored on the
 * puzzle at generation time; researches fresh only when it is missing.
 */
export async function gatherBlogResearch(input: {
  answer: string;
  typeName: string;
  storedAnswerResearch?: unknown;
}): Promise<BlogResearchPack> {
  const stored = parseStoredAnswerResearch(input.storedAnswerResearch);
  const [answerResearch, formatDossier] = await Promise.all([
    // Reuse stored research only for the same answer: an admin may have
    // edited the answer since generation.
    stored &&
    stored.status === "researched" &&
    normalizeAnswerKey(stored.answer) === normalizeAnswerKey(input.answer)
      ? Promise.resolve(stored)
      : researchAnswerPhrase(input.answer).then((research) =>
          research.dossier.status === "researched" ? toStoredAnswerResearch(research) : undefined
        ),
    researchFormatHistory(input.typeName),
  ]);

  const facts = [
    ...(answerResearch ? answerFacts(answerResearch) : []),
    ...(formatDossier.status === "researched" ? formatFacts(formatDossier) : []),
  ]
    .slice(0, 16)
    .map((fact, index) => ({ ...fact, id: `F${index + 1}` }));

  const sides = [Boolean(answerResearch), formatDossier.status === "researched"];
  return {
    facts,
    answerResearch,
    status: sides.every(Boolean) ? "researched" : sides.some(Boolean) ? "partial" : "unavailable",
  };
}

export function formatBlogResearchForPrompt(pack: BlogResearchPack): string {
  const format = pack.facts.filter((fact) => fact.scope === "format");
  const answer = pack.facts.filter((fact) => fact.scope === "answer");
  const line = (fact: BlogResearchFact) =>
    `[${fact.id}] ${fact.statement} (${fact.support}; ${fact.sources.map((s) => s.domain).join(", ") || "source"})`;

  return [
    "## Research brief (web-verified facts)",
    "Every historical or factual statement must come from these facts. Do not invent dates, people, places, first uses, or statistics.",
    "If a fact you want is missing, write about the solving experience instead of guessing.",
    format.length
      ? ["Format history — use these in sections.puzzleHistory:", ...format.map(line)].join("\n")
      : "Format history: no verified facts. Keep sections.puzzleHistory general and free of dates and named firsts.",
    answer.length
      ? [
          "Answer facts — SPOILERS: use these only in sections.solution and under ## The Solution:",
          ...answer.map(line),
        ].join("\n")
      : null,
  ]
    .filter(Boolean)
    .join("\n\n");
}

/** Years the post may mention without a verified fact (e.g. the puzzle date). */
function exemptYears(publishedKey: string): Set<string> {
  const years = new Set<string>([String(new Date().getUTCFullYear())]);
  const match = /^(\d{4})/.exec(publishedKey);
  if (match?.[1]) years.add(match[1]);
  return years;
}

/**
 * Flag years and decades in the draft that no research fact contains. These
 * are the most common shape of an invented history ("first appeared in 1843").
 */
export function getBlogResearchIssues(
  text: string,
  pack: BlogResearchPack,
  publishedKey: string
): string[] {
  const verifiedText = pack.facts.map((fact) => fact.statement).join(" ");
  const verifiedFigures = new Set(extractClaimNumbers(verifiedText));
  const exempt = exemptYears(publishedKey);
  const years = extractClaimNumbers(text).filter((figure) =>
    /^(1[0-9]{3}|20[0-9]{2})s?$/.test(figure)
  );
  const unverified = years.filter((year) => {
    const base = year.replace(/s$/, "");
    return !exempt.has(base) && !verifiedFigures.has(year) && !verifiedFigures.has(base);
  });
  return Array.from(new Set(unverified)).map(
    (year) => `mentions "${year}" but no researched fact supports that date`
  );
}

export function formatBlogResearchNotes(notes: BlogResearchNotes | undefined): string[] {
  if (!notes) return [];
  const lines = ["## Research notes", ""];
  if (notes.status === "unavailable") {
    lines.push(
      "Web research was unavailable for this post, so any historical claim needs a manual check."
    );
  } else {
    lines.push(
      `Eve grounded this post in ${notes.facts.length} web-verified fact${notes.facts.length === 1 ? "" : "s"} (${notes.status}). Answer facts contain spoilers.`,
      ""
    );
    for (const fact of notes.facts) {
      const links = fact.sources.map((s) => `[${s.domain}](${s.url})`).join(", ");
      lines.push(
        `- **${fact.id}** (${fact.scope}, ${fact.support}): ${fact.statement}${links ? ` — ${links}` : ""}`
      );
    }
  }
  if (notes.warnings.length) {
    lines.push("", "**Unverified claims in the draft:**", ...notes.warnings.map((w) => `- ${w}`));
  }
  lines.push("");
  return lines;
}
