import {
  conceptMatchesSeen,
  getIconFeatureHints,
  lookupIconFeatures,
} from "../icon-features";

describe("icon features", () => {
  it("looks up canonical features for common nouns", () => {
    expect(lookupIconFeatures("bee")?.features.length).toBeGreaterThan(0);
    expect(getIconFeatureHints("umbrella")).toMatch(/canopy|handle/i);
  });

  it("matches synonyms for recognition", () => {
    expect(conceptMatchesSeen("bee", "bumblebee")).toBe(true);
    expect(conceptMatchesSeen("clock", "alarm clock")).toBe(true);
    expect(conceptMatchesSeen("key", "umbrella")).toBe(false);
  });
});
