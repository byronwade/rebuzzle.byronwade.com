import {
  beatMeShareLine,
  buildBeatMeUrl,
  buildShareSquares,
  parseBeatMeChallenge,
} from "../share-challenge";

describe("share-challenge", () => {
  it("builds a beat-me deep link with sharer id", () => {
    expect(buildBeatMeUrl("https://rebuzzle.com", "user-123")).toBe(
      "https://rebuzzle.com/?beat=user-123&from=share"
    );
    expect(buildBeatMeUrl("https://rebuzzle.com/", null)).toBe("https://rebuzzle.com");
  });

  it("parses challenge params from the landing query", () => {
    expect(parseBeatMeChallenge("?beat=abc&from=share")).toEqual({
      challengerId: "abc",
      fromShare: true,
    });
    expect(parseBeatMeChallenge("")).toEqual({ challengerId: null, fromShare: false });
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
