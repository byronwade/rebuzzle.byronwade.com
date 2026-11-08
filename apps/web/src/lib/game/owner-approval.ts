import { createHash } from "node:crypto";
import type { DailyPuzzleCandidateOwnerApproval, PuzzleVisual } from "@/db/models";

export type OwnerApprovedContent = {
  answer: string;
  acceptedAnswers?: string[];
  visual?: PuzzleVisual;
};

const DATE_KEY = /^\d{4}-\d{2}-\d{2}$/;

function normalizePhrase(value: string): string {
  return value.trim().replace(/\s+/g, " ").toLowerCase();
}

/** Canonical answer plus approved alternates, normalized, de-duplicated and sorted. */
export function normalizeAcceptedAnswers(answer: string, acceptedAnswers: string[] = []): string[] {
  const all = [answer, ...acceptedAnswers].map(normalizePhrase).filter(Boolean);
  return [...new Set(all)].sort();
}

function canonicalJson(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value) ?? "null";
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  const entries = Object.entries(value as Record<string, unknown>)
    .filter(([, entry]) => entry !== undefined)
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
  return `{${entries.map(([key, entry]) => `${JSON.stringify(key)}:${canonicalJson(entry)}`).join(",")}}`;
}

/** Hash of everything a player sees or is judged against. */
export function computeOwnerContentHash(content: OwnerApprovedContent): string {
  const canonical = canonicalJson({
    answer: normalizePhrase(content.answer),
    acceptedAnswers: normalizeAcceptedAnswers(content.answer, content.acceptedAnswers),
    visual: content.visual ?? null,
  });
  return createHash("sha256").update(canonical).digest("hex");
}

export function hasValidOwnerApproval(
  content: OwnerApprovedContent,
  approval: DailyPuzzleCandidateOwnerApproval | undefined
): approval is DailyPuzzleCandidateOwnerApproval {
  return Boolean(approval && approval.contentHash === computeOwnerContentHash(content));
}

/** Owner approval applies to date keys on/after OWNER_APPROVAL_REQUIRED_FROM; unset means off. */
export function isOwnerApprovalRequired(dateKey: string): boolean {
  const from = process.env.OWNER_APPROVAL_REQUIRED_FROM?.trim();
  if (!from || !DATE_KEY.test(from) || !DATE_KEY.test(dateKey)) return false;
  return dateKey >= from;
}
