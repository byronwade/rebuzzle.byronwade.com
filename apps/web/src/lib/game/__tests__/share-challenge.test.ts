import {
  beatMeShareLine,
  buildBeatMeUrl,
  buildShareSquares,
  parseBeatMeChallenge,
  shouldReportShareArrival,
} from "../share-challenge";

describe("share-challenge", () => {
  it("builds one share link without embedding the sharer's account id", () => {
    expect(buildBeatMeUrl("https://rebuzzle.com/old?beat=user-123&from=share#result")).toBe(
      "https://rebuzzle.com/?source=share"
    );
    expect(buildBeatMeUrl("https://rebuzzle.com/")).toBe("https://rebuzzle.com/?source=share");
  });

  it("recognizes canonical and legacy share links without exposing a sharer id", () => {
    expect(parseBeatMeChallenge("?source=share")).toEqual({
      fromShare: true,
    });
    expect(parseBeatMeChallenge("?beat=abc&from=share")).toEqual({
      fromShare: true,
    });
    expect(parseBeatMeChallenge("")).toEqual({ fromShare: false });
  });

  it("reports a share arrival only after identity and puzzle restoration are ready", () => {
    const ready = {
      fromShare: true,
      userId: "guest-1",
      authLoading: false,
      sessionRestoreSucceeded: true,
      alreadyReported: false,
    };

    expect(shouldReportShareArrival({ ...ready, sessionRestoreSucceeded: false })).toBe(false);
    expect(shouldReportShareArrival({ ...ready, userId: null })).toBe(false);
    expect(shouldReportShareArrival({ ...ready, authLoading: true })).toBe(false);
    expect(shouldReportShareArrival({ ...ready, alreadyReported: true })).toBe(false);
    expect(shouldReportShareArrival(ready)).toBe(true);
  });

  it("invites a spoiler-free challenge", () => {
    expect(beatMeShareLine(12, true)).toBe("🔥 12-day streak. Can you beat me?");
    expect(beatMeShareLine(0, false)).toBe("Today's puzzle:");
    expect(beatMeShareLine(1, true)).toBe("Can you beat me?");
  });
});

describe("share attempt history", () => {
  it("shows misses before the winning guess", () => {
    expect(buildShareSquares(true, 3, 5)).toBe("🟥🟥🟩⬜⬜");
    expect(buildShareSquares(true, 1, 3)).toBe("🟩⬜⬜");
    expect(buildShareSquares(false, 3, 3)).toBe("🟥🟥🟥");
  });
  it("bounds malformed or stale persisted counts", () => {
    expect(buildShareSquares(true, 9, 3)).toBe("🟥🟥🟩");
    expect(buildShareSquares(true, NaN, Infinity)).toBe("🟩");
  });
});
