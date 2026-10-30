import { createSubmissionTracker } from "../submission-tracker";

describe("session restore vs guess submission ordering", () => {
  it("applies a restore when no guess was submitted while it loaded", () => {
    const tracker = createSubmissionTracker();
    const snapshot = tracker.snapshot();
    expect(tracker.isStale(snapshot)).toBe(false);
  });

  it("rejects an empty restore that resolves after a first guess was submitted", () => {
    const tracker = createSubmissionTracker();
    // Guest creation refreshes auth and starts the restore...
    const snapshot = tracker.snapshot();
    // ...while the original guess goes on to be scored and confirmed.
    const end = tracker.begin();
    end();
    expect(tracker.isStale(snapshot)).toBe(true);
  });

  it("treats a restore started while a guess is in flight as stale", () => {
    const tracker = createSubmissionTracker();
    const end = tracker.begin();
    const snapshot = tracker.snapshot();
    expect(snapshot.busy).toBe(true);
    end();
    expect(tracker.isStale(snapshot)).toBe(true);
  });

  it("keeps in-flight accounting correct when a submission ends twice", () => {
    const tracker = createSubmissionTracker();
    const end = tracker.begin();
    end();
    end();
    const snapshot = tracker.snapshot();
    expect(snapshot.busy).toBe(false);
    expect(tracker.isStale(snapshot)).toBe(false);
  });
});
