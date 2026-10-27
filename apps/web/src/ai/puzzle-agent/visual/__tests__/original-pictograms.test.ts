import { createHash } from "node:crypto";
import { isAuthenticCuratedPictogram } from "../curated-pictograms";
import { listOriginalPictogramCandidates } from "../original-pictograms";
import { sanitizePictogramSvg } from "../sanitize-svg";

const firstBatch = [
  "clock",
  "key",
  "umbrella",
  "bee",
  "eye",
  "bell",
  "book",
  "house",
  "moon",
  "sun",
  "leaf",
  "lightbulb",
];

describe("original Rebuzzle artwork candidates", () => {
  it("contains the complete first family with distinct immutable identities", () => {
    const candidates = listOriginalPictogramCandidates();
    expect(candidates.slice(0, 12).map((asset) => asset.concept)).toEqual(firstBatch);
    expect(new Set(candidates.map((asset) => asset.assetId)).size).toBe(40);
    for (const asset of candidates) {
      expect(asset.assetId).toBe(`rebuzzle-ink:${asset.concept}:v1`);
      expect(asset.status).toBe("candidate");
      expect(asset.provenance).toBe("authored-svg");
      expect(asset.approvedReadings).toContain(asset.concept);
      expect(
        isAuthenticCuratedPictogram({
          concept: asset.concept,
          assetId: asset.assetId,
          svg: asset.svg,
        })
      ).toBe(false);
    }
  });

  it("cannot mutate shared source records or reading arrays", () => {
    const candidates = listOriginalPictogramCandidates();
    expect(Object.isFrozen(candidates)).toBe(true);
    for (const asset of candidates) {
      expect(Object.isFrozen(asset)).toBe(true);
      expect(Object.isFrozen(asset.approvedReadings)).toBe(true);
      expect(Object.isFrozen(asset.searchAliases)).toBe(true);
      expect(Object.isFrozen(asset.commonConfusions)).toBe(true);
    }
  });

  it("uses portable closed SVG artwork without external or executable content", () => {
    for (const asset of listOriginalPictogramCandidates()) {
      expect(asset.svg).toContain('viewBox="0 0 64 64"');
      expect(sanitizePictogramSvg(asset.svg)).toBeTruthy();
      expect(asset.svg).not.toMatch(
        /<(?:script|foreignObject|image|text|filter|linearGradient|radialGradient)\b|\bon\w+=|\bhref=/i
      );
      expect(asset.svg.match(/<svg\b/g)).toHaveLength(1);
      expect(asset.svg).toContain('stroke-width="2.25"');
    }
  });

  it("freezes exact bytes so revised drawings require new identities", () => {
    expect(
      Object.fromEntries(
        listOriginalPictogramCandidates().map((a) => [
          a.assetId,
          createHash("sha256").update(a.svg).digest("hex"),
        ])
      )
    ).toMatchSnapshot();
  });
});

it("includes the source-demand nature batch without replacing earlier drawings", () => {
  const assets = listOriginalPictogramCandidates();
  expect(assets.slice(12, 21).map((asset) => asset.concept)).toEqual([
    "fire",
    "snowflake",
    "rain",
    "flower",
    "wheat",
    "tree",
    "star",
    "egg",
    "sprout",
  ]);
  expect(assets.every((asset) => asset.collectionVersion === "rebuzzle-ink-collection-v3")).toBe(
    true
  );
});

it("completes the forty-object source-demand collection", () => {
  expect(
    listOriginalPictogramCandidates()
      .slice(21)
      .map((asset) => asset.concept)
  ).toEqual([
    "dog",
    "cat",
    "bird",
    "fish",
    "heart",
    "brain",
    "ear",
    "hand",
    "footprints",
    "skull",
    "envelope",
    "door",
    "boat",
    "music",
    "gift",
    "camera",
    "diamond",
    "globe",
    "newspaper",
  ]);
});
