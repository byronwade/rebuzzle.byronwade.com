import { beatMeShareLine, buildBeatMeUrl, parseBeatMeChallenge } from "../share-challenge";

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

  it("keeps share invite lines quiet", () => {
    expect(beatMeShareLine(12, true)).toBe("🔥 12");
    expect(beatMeShareLine(0, false)).toBe("Today's puzzle:");
    expect(beatMeShareLine(1, true)).toBe("");
  });
});
