import { recognizePuzzleBoard } from "../visual/critique-board";
import { evaluateNearMissStress } from "./near-miss-stress";
import {
  applyPlayerSimHeuristics,
  playerSimPublishBlockers,
  simulatePlayerSolve,
} from "./player-sim";
import { scoreRubric } from "./rubric";
import type { ApexCandidate } from "./types";

type SimCalibration = { adjustment: number; sampleSize: number };

/** Attach the rendered evidence required for publication to one pre-ranked finalist. */
export async function qualifyRenderedCandidate(
  candidate: ApexCandidate,
  simCalibration?: SimCalibration
): Promise<ApexCandidate> {
  const boardRecognition = await recognizePuzzleBoard(candidate.visual);
  if (!boardRecognition.ok) {
    const rejected = {
      ...candidate,
      publishable: false,
      rejectReasons: [
        ...candidate.rejectReasons,
        boardRecognition.reason ?? "Rendered board recognition failed",
      ],
    };
    return { ...rejected, rubric: scoreRubric(rejected) };
  }

  const rawSim = await simulatePlayerSolve({
    rebusPuzzle: candidate.rebusPuzzle,
    answer: candidate.answer,
    explanation: candidate.explanation,
    hints: candidate.hints,
    techniqueId: candidate.techniqueId,
    tierLabel: candidate.difficultyLevel,
    visual: candidate.visual,
  });
  let playerSim = applyPlayerSimHeuristics(rawSim, {
    answer: candidate.answer,
    hints: candidate.hints,
    tierLabel: candidate.difficultyLevel,
  });

  if (
    simCalibration &&
    simCalibration.sampleSize >= 6 &&
    Math.abs(simCalibration.adjustment) >= 0.02
  ) {
    const { applySimCalibration } = await import("../../learning/sim-calibration");
    playerSim = {
      ...playerSim,
      estimatedSolveRate: applySimCalibration(playerSim.estimatedSolveRate, simCalibration),
    };
  }

  const blockers = [...playerSimPublishBlockers(playerSim)];
  const nearMissStress = evaluateNearMissStress({
    answer: candidate.answer,
    extraCandidates: playerSim.firstWrongParses,
    includePhraseBank: false,
  });
  if (!nearMissStress.ok) {
    blockers.push(...nearMissStress.issues);
  }
  const profileResults = boardRecognition.profileResults ?? [];
  const qualified: ApexCandidate = {
    ...candidate,
    playerSim,
    publishable: candidate.publishable && blockers.length === 0,
    rejectReasons: [...candidate.rejectReasons, ...blockers],
    boardRecognitionConfidence: boardRecognition.perceptions.length
      ? Math.min(
          ...boardRecognition.perceptions.map((perception) =>
            Math.max(0, Math.min(1, perception.overallConfidence))
          )
        )
      : undefined,
    boardRecognitionModels: boardRecognition.perceptions.length
      ? boardRecognition.perceptions.map((perception) => perception.model)
      : undefined,
    boardConceptVotes: boardRecognition.perceptions.length
      ? boardRecognition.conceptVotes
      : undefined,
    boardTextVotes: boardRecognition.perceptions.length ? boardRecognition.textVotes : undefined,
    boardOperatorVotes: boardRecognition.perceptions.length
      ? boardRecognition.operatorVotes
      : undefined,
    boardRecognitionProfiles: profileResults.length
      ? profileResults.map((profile) => ({
          profileId: profile.profileId,
          viewportWidth: profile.viewportWidth,
          tileSize: profile.tileSize,
          confidence: profile.perceptions.length
            ? Math.min(
                ...profile.perceptions.map((perception) =>
                  Math.max(0, Math.min(1, perception.overallConfidence))
                )
              )
            : 0,
          models: profile.perceptions.map((perception) => perception.model),
          conceptVotes: profile.conceptVotes,
          textVotes: profile.textVotes,
          operatorVotes: profile.operatorVotes,
          wrappedRows: profile.wrappedRows,
        }))
      : undefined,
  };

  return { ...qualified, rubric: scoreRubric(qualified) };
}
