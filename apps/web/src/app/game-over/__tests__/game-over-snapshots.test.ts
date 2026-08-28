import { beforeEach, describe, expect, it } from "@jest/globals";
import {
  EMPTY_FEEDBACK_SNAPSHOT,
  readFeedbackSnapshot,
  readSolutionSnapshot,
  resetGameOverSnapshotCaches,
} from "../game-over-snapshots";

describe("game-over localStorage snapshots", () => {
  const store = new Map<string, string>();

  beforeAll(() => {
    Object.defineProperty(globalThis, "localStorage", {
      value: {
        getItem: (key: string) => store.get(key) ?? null,
        setItem: (key: string, value: string) => {
          store.set(key, value);
        },
        removeItem: (key: string) => {
          store.delete(key);
        },
        clear: () => {
          store.clear();
        },
      },
      configurable: true,
    });
  });

  beforeEach(() => {
    store.clear();
    resetGameOverSnapshotCaches();
  });

  it("returns a stable empty feedback snapshot for missing puzzle ids", () => {
    const a = readFeedbackSnapshot("");
    const b = readFeedbackSnapshot("");
    expect(a).toBe(EMPTY_FEEDBACK_SNAPSHOT);
    expect(b).toBe(a);
  });

  it("returns Object.is-stable feedback snapshots across repeated reads", () => {
    localStorage.setItem("difficultyPerception:p1", "just_right");
    localStorage.setItem("puzzleQualityVote:p1", "like");

    const first = readFeedbackSnapshot("p1");
    const second = readFeedbackSnapshot("p1");
    expect(second).toBe(first);
    expect(first.perception).toBe("just_right");
    expect(first.qualityVote).toBe("like");
  });

  it("returns a new feedback snapshot only when storage changes", () => {
    localStorage.setItem("difficultyPerception:p1", "too_easy");
    const first = readFeedbackSnapshot("p1");

    localStorage.setItem("difficultyPerception:p1", "too_hard");
    const second = readFeedbackSnapshot("p1");

    expect(second).not.toBe(first);
    expect(second.perception).toBe("too_hard");
    expect(readFeedbackSnapshot("p1")).toBe(second);
  });

  it("returns Object.is-stable solution snapshots across repeated reads", () => {
    const todayKey = new Date().toISOString().slice(0, 10);
    localStorage.setItem(
      "lastGameSolution:v1",
      JSON.stringify({ answer: "Deadline", explanation: "time limit", puzzleDate: todayKey })
    );

    const first = readSolutionSnapshot();
    const second = readSolutionSnapshot();
    expect(first).toEqual({ answer: "Deadline", explanation: "time limit" });
    expect(second).toBe(first);
  });
});
