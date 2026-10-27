import { createHash } from "node:crypto";
import { PUZZLE_BOARD_RECOGNITION_PROFILES } from "@/ai/puzzle-agent/visual/presentation";
import {
  completePlayerEvidence,
  hasCompletePublicationEvidence,
  reviewFingerprint,
  STUDIO_EVIDENCE_POLICY,
} from "../review-evidence";

const png = Buffer.from("fixture");
const content = {
  answer: "sunflower",
  explanation: "Sun and flower",
  hints: ["one", "two", "three"],
  difficulty: 4,
  techniqueId: "simple_compound",
  visual: {
    layout: "row",
    layers: [],
    canonicalBoard: {
      version: 1,
      pngDataUrl: `data:image/png;base64,${png.toString("base64")}`,
      sha256: createHash("sha256").update(png).digest("hex"),
      width: 100,
      height: 100,
      sourceFingerprint: "source",
    },
  },
};
const profiles = PUZZLE_BOARD_RECOGNITION_PROFILES.map((p) => p.id);
it("binds approval to all content and exact bytes", () => {
  const evidence = {
    policyVersion: STUDIO_EVIDENCE_POLICY,
    fingerprint: reviewFingerprint(content),
    complete: true,
    profileIds: profiles,
  };
  const approved = {
    ...content,
    eveReview: {
      ok: true,
      verdict: "ship",
      evidence,
      spend: { critique: "ran", playerSim: "ran" },
    },
  };
  expect(hasCompletePublicationEvidence(approved)).toBe(true);
  expect(hasCompletePublicationEvidence({ ...approved, hints: ["changed"] })).toBe(false);
  expect(
    hasCompletePublicationEvidence({
      ...approved,
      visual: {
        ...content.visual,
        canonicalBoard: {
          ...content.visual.canonicalBoard,
          pngDataUrl: "data:image/png;base64,AAAA",
        },
      },
    })
  ).toBe(false);
  expect(
    hasCompletePublicationEvidence({
      ...approved,
      eveReview: {
        ...approved.eveReview,
        evidence: { ...evidence, profileIds: profiles.slice(1) },
      },
    })
  ).toBe(false);
});
it("requires every profile and nonzero judge evidence", () => {
  const complete = {
    blindProfileCount: profiles.length,
    editorialProfileCount: profiles.length,
    editorialProfileResults: profiles.map((profileId) => ({ profileId, judgeCount: 2 })),
    blindRequiredVotes: 2,
    blindProfileResults: profiles.map((profileId) => ({ profileId, judgeCount: 2 })),
  };
  expect(completePlayerEvidence(complete, 2)).toBe(true);
  expect(
    completePlayerEvidence(
      {
        ...complete,
        editorialProfileResults: profiles.map((profileId) => ({ profileId, judgeCount: 1 })),
      },
      2
    )
  ).toBe(false);
  expect(completePlayerEvidence({ ...complete, blindProfileResults: [] }, 2)).toBe(false);
  expect(
    completePlayerEvidence(
      { ...complete, blindProfileResults: complete.blindProfileResults.slice(1) },
      2
    )
  ).toBe(false);
  expect(
    completePlayerEvidence(
      {
        ...complete,
        blindProfileResults: complete.blindProfileResults.map((p) => ({ ...p, judgeCount: 0 })),
      },
      2
    )
  ).toBe(false);
});

it("rejects approval from before the artwork reading policy", () => {
  expect(
    hasCompletePublicationEvidence({
      ...content,
      eveReview: {
        ok: true,
        verdict: "ship",
        spend: { critique: "ran", playerSim: "ran" },
        evidence: {
          policyVersion: "studio-evidence-v1",
          fingerprint: reviewFingerprint(content),
          complete: true,
          profileIds: profiles,
        },
      },
    })
  ).toBe(false);
});
