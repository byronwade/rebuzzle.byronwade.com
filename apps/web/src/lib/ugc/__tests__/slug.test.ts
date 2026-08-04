import { communityPuzzlePath, profilePathForUsername, slugifyHandle } from "../slug";

describe("ugc slugs", () => {
  it("slugifies titles safely", () => {
    expect(slugifyHandle("Sun Flower!!")).toBe("sun-flower");
  });

  it("builds profile and community paths", () => {
    expect(profilePathForUsername("Ada")).toBe("/u/Ada");
    expect(communityPuzzlePath("sun-flower-abcd1234")).toBe(
      "/community/puzzles/sun-flower-abcd1234"
    );
  });
});
