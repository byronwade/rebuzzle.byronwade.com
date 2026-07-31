import {
  isPuzzleQualityVote,
  mapPuzzleQualityVote,
  qualityVotesToGuidance,
} from "../puzzle-quality-vote";

describe("puzzle quality vote", () => {
  it("maps like/dislike to rating fields", () => {
    expect(mapPuzzleQualityVote("like").rating).toBe(5);
    expect(mapPuzzleQualityVote("like").metrics.creative).toBe(true);
    expect(mapPuzzleQualityVote("dislike").rating).toBe(1);
    expect(mapPuzzleQualityVote("dislike").metrics.boring).toBe(true);
  });

  it("validates vote strings", () => {
    expect(isPuzzleQualityVote("like")).toBe(true);
    expect(isPuzzleQualityVote("dislike")).toBe(true);
    expect(isPuzzleQualityVote("meh")).toBe(false);
  });

  it("turns aggregates into prefer/avoid guidance", () => {
    const liked = qualityVotesToGuidance({
      likes: 12,
      dislikes: 2,
      total: 14,
      likeRate: 12 / 14,
      likedTechniques: ["homophone"],
      dislikedTechniques: [],
      notes: [],
    });
    expect(liked.preferPatterns.length).toBeGreaterThan(0);
    expect(liked.preferPatterns.some((p) => p.includes("homophone"))).toBe(true);

    const disliked = qualityVotesToGuidance({
      likes: 2,
      dislikes: 10,
      total: 12,
      likeRate: 2 / 12,
      likedTechniques: [],
      dislikedTechniques: ["emoji_sum"],
      notes: [],
    });
    expect(disliked.avoidPatterns.length).toBeGreaterThan(0);
    expect(disliked.avoidPatterns.some((p) => p.includes("emoji_sum"))).toBe(true);

    const thin = qualityVotesToGuidance({
      likes: 1,
      dislikes: 1,
      total: 2,
      likeRate: 0.5,
      likedTechniques: [],
      dislikedTechniques: [],
      notes: [],
    });
    expect(thin.preferPatterns).toEqual([]);
    expect(thin.avoidPatterns).toEqual([]);
  });
});
