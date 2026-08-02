import { distinctJudgeResults } from "../quality-contract";
import { conceptMatchesSeen } from "./icon-features";

export type IconRecognitionJudgment = {
  model: string;
  seenLabel: string;
  confidence: number;
  alternateReadings: string[];
  isAmbiguous: boolean;
  redrawAdvice: string;
};

export type IconRecognitionJudgeResult = IconRecognitionJudgment & {
  matchesConcept: boolean;
  passed: boolean;
};

export type IconRecognitionResultBase = Omit<IconRecognitionJudgment, "model"> & {
  matchesConcept: boolean;
  ok: boolean;
  judges: IconRecognitionJudgeResult[];
};

export type IconRecognitionProfileResult = IconRecognitionResultBase & {
  tileSize: number;
};

export type IconRecognitionResult = IconRecognitionResultBase & {
  profileResults?: IconRecognitionProfileResult[];
};

export function evaluateRecognitionConsensus(input: {
  concept: string;
  judgments: IconRecognitionJudgment[];
  minConfidence: number;
  requiredVotes: number;
}): IconRecognitionResult {
  const judges: IconRecognitionJudgeResult[] = distinctJudgeResults(input.judgments).map(
    (judgment) => {
      const matchesConcept = conceptMatchesSeen(input.concept, judgment.seenLabel);
      const passed =
        judgment.seenLabel.toLowerCase() !== "unclear" &&
        !judgment.isAmbiguous &&
        judgment.confidence >= input.minConfidence &&
        matchesConcept;
      return { ...judgment, matchesConcept, passed };
    }
  );

  const passing = judges.filter((judge) => judge.passed);
  const lead = passing[0] ?? judges[0];
  const ok = passing.length >= input.requiredVotes;

  return {
    seenLabel: lead?.seenLabel ?? "unclear",
    confidence: passing.length
      ? Math.min(...passing.map((judge) => judge.confidence))
      : (lead?.confidence ?? 0),
    alternateReadings: Array.from(
      new Set(judges.flatMap((judge) => [judge.seenLabel, ...judge.alternateReadings]))
    )
      .filter((label) => label.toLowerCase() !== (lead?.seenLabel ?? "").toLowerCase())
      .slice(0, 4),
    isAmbiguous: !ok || judges.some((judge) => judge.isAmbiguous),
    redrawAdvice:
      judges
        .filter((judge) => !judge.passed)
        .map((judge) => judge.redrawAdvice)
        .filter(Boolean)
        .join(" ")
        .slice(0, 200) || "Keep the silhouette chunky and unmistakable.",
    matchesConcept: ok,
    ok,
    judges,
  };
}

/** Require every production icon size to pass; the weakest size sets confidence. */
export function evaluateRecognitionProfiles(input: {
  profileResults: IconRecognitionProfileResult[];
  expectedTileSizes: readonly number[];
}): IconRecognitionResult {
  const lead = input.profileResults.find((profile) => profile.ok) ?? input.profileResults[0];
  const failed = input.profileResults.filter((profile) => !profile.ok);
  const testedSizes = new Set(input.profileResults.map((profile) => profile.tileSize));
  const missingSizes = input.expectedTileSizes.filter((size) => !testedSizes.has(size));
  const ok = input.profileResults.length > 0 && failed.length === 0 && missingSizes.length === 0;

  return {
    seenLabel: lead?.seenLabel ?? "unclear",
    confidence: input.profileResults.length
      ? Math.min(...input.profileResults.map((profile) => profile.confidence))
      : 0,
    alternateReadings: Array.from(
      new Set(input.profileResults.flatMap((profile) => profile.alternateReadings))
    ).slice(0, 4),
    isAmbiguous: !ok,
    redrawAdvice:
      [
        ...failed.map((profile) => `${profile.tileSize}px: ${profile.redrawAdvice}`),
        ...(missingSizes.length ? [`Missing tests at ${missingSizes.join(", ")}px`] : []),
      ]
        .join(" ")
        .slice(0, 200) || "Keep the silhouette chunky and unmistakable at every player size.",
    matchesConcept: ok,
    ok,
    judges: input.profileResults.flatMap((profile) =>
      profile.judges.map((judge) => ({
        ...judge,
        model: `${judge.model}@${profile.tileSize}px`,
      }))
    ),
    profileResults: input.profileResults,
  };
}
