/**
 * Stable localStorage snapshots for the game-over page.
 * Extracted so useSyncExternalStore getSnapshot stays Object.is-stable
 * (returning a fresh object every call causes React error #185).
 */

export type PerceptionChoice = "too_easy" | "just_right" | "too_hard";
export type QualityVote = "like" | "dislike";
export type QualityReason =
  | "unrecognizable"
  | "ambiguous"
  | "unfair"
  | "boring"
  | "bad_hints"
  | "too_easy"
  | "too_hard";

export const QUALITY_REASON_OPTIONS: Array<{ id: QualityReason; label: string }> = [
  { id: "unrecognizable", label: "Couldn't recognize it" },
  { id: "ambiguous", label: "Too ambiguous" },
  { id: "unfair", label: "Felt unfair" },
  { id: "bad_hints", label: "Hints didn't help" },
  { id: "boring", label: "Not interesting" },
  { id: "too_easy", label: "Too easy" },
  { id: "too_hard", label: "Too hard" },
];

export type FeedbackSnapshot = {
  perception: PerceptionChoice | null;
  qualityVote: QualityVote | null;
  qualityReasons: QualityReason[];
};

/** Stable empty snapshot — useSyncExternalStore requires Object.is-stable getSnapshot. */
export const EMPTY_FEEDBACK_SNAPSHOT: FeedbackSnapshot = Object.freeze({
  perception: null,
  qualityVote: null,
  qualityReasons: Object.freeze([]) as QualityReason[],
});

const feedbackSnapshotCache = new Map<
  string,
  {
    fingerprint: string;
    value: FeedbackSnapshot;
  }
>();

let solutionSnapshotCache: {
  raw: string | null;
  value: { answer: string; explanation: string } | null;
} = { raw: null, value: null };

/** Test helper — clear module caches between cases. */
export function resetGameOverSnapshotCaches(): void {
  feedbackSnapshotCache.clear();
  solutionSnapshotCache = { raw: null, value: null };
}

export function readFeedbackSnapshot(puzzleFeedbackKey: string): FeedbackSnapshot {
  if (!puzzleFeedbackKey) return EMPTY_FEEDBACK_SNAPSHOT;

  try {
    const perceptionStored = localStorage.getItem(`difficultyPerception:${puzzleFeedbackKey}`);
    const qualityStored = localStorage.getItem(`puzzleQualityVote:${puzzleFeedbackKey}`);
    const reasonStored = localStorage.getItem(`puzzleQualityReasons:${puzzleFeedbackKey}`);
    const fingerprint = `${perceptionStored ?? ""}\0${qualityStored ?? ""}\0${reasonStored ?? ""}`;

    const cached = feedbackSnapshotCache.get(puzzleFeedbackKey);
    if (cached?.fingerprint === fingerprint) {
      return cached.value;
    }

    const perception =
      perceptionStored === "too_easy" ||
      perceptionStored === "just_right" ||
      perceptionStored === "too_hard"
        ? perceptionStored
        : null;
    const qualityVote =
      qualityStored === "like" || qualityStored === "dislike" ? qualityStored : null;
    let qualityReasons: QualityReason[] = [];
    if (reasonStored) {
      const parsed = JSON.parse(reasonStored) as unknown;
      if (Array.isArray(parsed)) {
        qualityReasons = parsed.filter((reason): reason is QualityReason =>
          QUALITY_REASON_OPTIONS.some((option) => option.id === reason)
        );
      }
    }

    const value: FeedbackSnapshot =
      perception === null && qualityVote === null && qualityReasons.length === 0
        ? EMPTY_FEEDBACK_SNAPSHOT
        : { perception, qualityVote, qualityReasons };
    feedbackSnapshotCache.set(puzzleFeedbackKey, { fingerprint, value });
    return value;
  } catch {
    return EMPTY_FEEDBACK_SNAPSHOT;
  }
}

export function readSolutionSnapshot(): { answer: string; explanation: string } | null {
  try {
    const raw =
      localStorage.getItem("lastGameSolution:v1") ?? localStorage.getItem("lastGameSolution");
    if (raw === solutionSnapshotCache.raw) {
      return solutionSnapshotCache.value;
    }

    if (!raw) {
      solutionSnapshotCache = { raw, value: null };
      return null;
    }

    const todayKey = new Date().toISOString().slice(0, 10);
    const parsed = JSON.parse(raw) as {
      answer?: string;
      explanation?: string;
      puzzleDate?: string;
    };

    const value =
      parsed.answer && (!parsed.puzzleDate || parsed.puzzleDate === todayKey)
        ? { answer: parsed.answer, explanation: parsed.explanation || "" }
        : null;

    solutionSnapshotCache = { raw, value };
    return value;
  } catch {
    solutionSnapshotCache = { raw: null, value: null };
    return null;
  }
}
