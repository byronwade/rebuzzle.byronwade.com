import { distinctJudgeResults } from "../quality-contract";
import type { PuzzleVisual } from "./composition";
import { conceptMatchesSeen } from "./icon-features";

export type BoardPerception = {
  model: string;
  objects: Array<{ label: string; confidence: number }>;
  visibleText: string[];
  relationships: string[];
  hasClipping: boolean;
  hasAccidentalOverlap: boolean;
  unreadableElements: string[];
  overallConfidence: number;
};

export type BoardRecognitionResult = {
  ok: boolean;
  reason?: string;
  perceptions: BoardPerception[];
  conceptVotes: Record<string, number>;
  profileResults?: BoardProfileRecognitionResult[];
};

export type BoardProfileRecognitionResult = Omit<BoardRecognitionResult, "profileResults"> & {
  profileId: string;
  viewportWidth: number;
  tileSize: number;
  width: number;
  height: number;
  wrappedRows: number;
};

export function evaluateBoardPerceptionConsensus(input: {
  visual: PuzzleVisual;
  perceptions: BoardPerception[];
  requiredVotes: number;
  minConfidence: number;
}): BoardRecognitionResult {
  const perceptions = distinctJudgeResults(input.perceptions);
  if (perceptions.length < input.requiredVotes) {
    return {
      ok: false,
      reason: "Not enough independent board perception judges",
      perceptions,
      conceptVotes: {},
    };
  }

  const expectedConcepts = Array.from(
    new Set(
      input.visual.layers.flatMap((layer) => (layer.kind === "pictogram" ? [layer.concept] : []))
    )
  );
  const conceptVotes = Object.fromEntries(
    expectedConcepts.map((concept) => [
      concept,
      perceptions.filter((perception) =>
        perception.objects.some(
          (object) =>
            object.confidence >= input.minConfidence && conceptMatchesSeen(concept, object.label)
        )
      ).length,
    ])
  );

  const missing = expectedConcepts.filter(
    (concept) => (conceptVotes[concept] ?? 0) < input.requiredVotes
  );
  if (missing.length) {
    return {
      ok: false,
      reason: `Rendered board objects not recognized: ${missing.join(", ")}`,
      perceptions,
      conceptVotes,
    };
  }

  if (perceptions.some((perception) => perception.hasClipping)) {
    return {
      ok: false,
      reason: "Rendered board has clipped visual content",
      perceptions,
      conceptVotes,
    };
  }
  if (perceptions.some((perception) => perception.hasAccidentalOverlap)) {
    return {
      ok: false,
      reason: "Rendered board has accidental overlap",
      perceptions,
      conceptVotes,
    };
  }
  if (perceptions.some((perception) => perception.unreadableElements.length > 0)) {
    return {
      ok: false,
      reason: "Rendered board contains unreadable elements",
      perceptions,
      conceptVotes,
    };
  }

  return { ok: true, perceptions, conceptVotes };
}

/** Require every production board profile to pass; aggregate the weakest evidence. */
export function evaluateBoardProfileConsensus(input: {
  visual: PuzzleVisual;
  profileResults: BoardProfileRecognitionResult[];
  expectedProfileIds: readonly string[];
}): BoardRecognitionResult {
  const failed = input.profileResults.filter((profile) => !profile.ok);
  const testedProfiles = new Set(input.profileResults.map((profile) => profile.profileId));
  const missingProfiles = input.expectedProfileIds.filter((id) => !testedProfiles.has(id));
  const expectedConcepts = Array.from(
    new Set(
      input.visual.layers.flatMap((layer) => (layer.kind === "pictogram" ? [layer.concept] : []))
    )
  );
  const conceptVotes = Object.fromEntries(
    expectedConcepts.map((concept) => [
      concept,
      input.profileResults.length
        ? Math.min(...input.profileResults.map((profile) => profile.conceptVotes[concept] ?? 0))
        : 0,
    ])
  );
  const perceptions: BoardPerception[] = input.profileResults.flatMap((profile) =>
    profile.perceptions.map((perception) => ({
      ...perception,
      model: `${perception.model}@${profile.profileId}`,
    }))
  );
  const reasons = [
    ...failed.map((profile) => `${profile.profileId}: ${profile.reason ?? "failed"}`),
    ...(missingProfiles.length ? [`Missing profiles: ${missingProfiles.join(", ")}`] : []),
  ];

  return {
    ok: input.profileResults.length > 0 && reasons.length === 0,
    reason: reasons.length ? reasons.join(" | ") : undefined,
    perceptions,
    conceptVotes,
    profileResults: input.profileResults,
  };
}
