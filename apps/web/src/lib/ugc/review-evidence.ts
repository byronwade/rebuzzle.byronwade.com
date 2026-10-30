import { createHash } from "node:crypto";
import { CURATED_PICTOGRAM_READING_POLICY_VERSION } from "@/ai/puzzle-agent/visual/curated-pictograms";
import { PUZZLE_BOARD_RECOGNITION_PROFILES } from "@/ai/puzzle-agent/visual/presentation";
import type { ReasoningEvidence } from "@/ai/puzzle-agent/visual/reasoning-evidence";

export const STUDIO_EVIDENCE_POLICY = `studio-evidence-v2:${CURATED_PICTOGRAM_READING_POLICY_VERSION}`;
export type StudioReviewEvidence = {
  policyVersion: string;
  fingerprint: string;
  complete: boolean;
  profileIds: string[];
  /** Editorial screenshot reviewers' operation trace, produced server-side by the player sim. */
  reasoningEvidence?: ReasoningEvidence;
};

type ReviewContent = {
  title?: string;
  answer: string;
  explanation?: string;
  hints?: string[];
  techniqueId: string;
  difficulty: number;
  visual: unknown;
};
function stable(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stable);
  if (value && typeof value === "object")
    return Object.fromEntries(
      Object.entries(value)
        .filter(([, v]) => v !== undefined)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([k, v]) => [k, stable(v)])
    );
  return value;
}
/** Binds hydrated assets, PNG bytes, geometry and every reviewed author field. */
export function reviewFingerprint(input: ReviewContent): string {
  return createHash("sha256")
    .update(
      JSON.stringify(
        stable({
          policy: STUDIO_EVIDENCE_POLICY,
          renderer: "canonical-board-v1",
          title:
            input.title?.toLowerCase().replace(/[^a-z0-9]/g, "") ===
            input.answer.toLowerCase().replace(/[^a-z0-9]/g, "")
              ? undefined
              : input.title || undefined,
          answer: input.answer,
          explanation: input.explanation,
          hints: input.hints,
          techniqueId: input.techniqueId,
          difficulty: input.difficulty,
          visual: input.visual,
        })
      )
    )
    .digest("hex");
}
export function completePlayerEvidence(
  sim: {
    blindProfileCount?: number;
    editorialProfileCount?: number;
    editorialProfileResults?: { profileId: string; judgeCount: number }[];
    blindProfileResults?: { profileId: string; judgeCount: number }[];
  },
  requiredVotes: number
): boolean {
  const expected = PUZZLE_BOARD_RECOGNITION_PROFILES.map((p) => p.id);
  return (
    requiredVotes > 0 &&
    sim.blindProfileCount === expected.length &&
    sim.editorialProfileCount === expected.length &&
    expected.every(
      (id) =>
        sim.blindProfileResults?.some(
          (p) => p.profileId === id && p.judgeCount >= requiredVotes
        ) === true &&
        sim.editorialProfileResults?.some(
          (p) => p.profileId === id && p.judgeCount >= requiredVotes
        ) === true
    )
  );
}
export function hasCompletePublicationEvidence(
  input: ReviewContent & {
    eveReview?: {
      ok: boolean;
      verdict: string;
      spend?: { critique: string; playerSim: string };
      evidence?: StudioReviewEvidence;
    };
  }
): boolean {
  const review = input.eveReview;
  const evidence = review?.evidence;
  const board = (
    input.visual as
      | { canonicalBoard?: { pngDataUrl: string; sha256: string; version: number } }
      | undefined
  )?.canonicalBoard;
  if (board?.version !== 1 || !board.pngDataUrl.startsWith("data:image/png;base64,")) return false;
  const hash = createHash("sha256")
    .update(Buffer.from(board.pngDataUrl.slice("data:image/png;base64,".length), "base64"))
    .digest("hex");
  return (
    hash === board.sha256 &&
    review?.ok === true &&
    review.verdict === "ship" &&
    review.spend?.critique === "ran" &&
    review.spend.playerSim === "ran" &&
    evidence?.complete === true &&
    evidence.policyVersion === STUDIO_EVIDENCE_POLICY &&
    evidence.fingerprint === reviewFingerprint(input) &&
    PUZZLE_BOARD_RECOGNITION_PROFILES.every((p) => evidence.profileIds.includes(p.id))
  );
}
