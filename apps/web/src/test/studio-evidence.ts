import { createHash } from "node:crypto";
import { PUZZLE_BOARD_RECOGNITION_PROFILES } from "@/ai/puzzle-agent/visual/presentation";
import type { UserPuzzleSubmission } from "@/db/models";
import { reviewFingerprint, STUDIO_EVIDENCE_POLICY } from "@/lib/ugc/review-evidence";
export function withStudioEvidence<
  T extends Pick<UserPuzzleSubmission, "visual" | "answer" | "techniqueId" | "difficulty">,
>(input: T): T & Pick<UserPuzzleSubmission, "eveReview"> {
  const png = Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aD1sAAAAASUVORK5CYII=",
    "base64"
  );
  const result = {
    ...input,
    visual: {
      ...input.visual,
      canonicalBoard: {
        version: 1 as const,
        pngDataUrl: `data:image/png;base64,${png.toString("base64")}`,
        sha256: createHash("sha256").update(png).digest("hex"),
        sourceFingerprint: "fixture",
        width: 1,
        height: 1,
      },
    },
  };
  return {
    ...result,
    eveReview: {
      reviewId: "review",
      ok: true,
      verdict: "ship",
      summary: "Reviewed",
      blockers: [],
      warnings: [],
      checkedAt: "2026-10-26",
      spend: { critique: "ran", playerSim: "ran" },
      evidence: {
        policyVersion: STUDIO_EVIDENCE_POLICY,
        complete: true,
        profileIds: PUZZLE_BOARD_RECOGNITION_PROFILES.map((p) => p.id),
        fingerprint: reviewFingerprint(result),
      },
    },
  };
}
