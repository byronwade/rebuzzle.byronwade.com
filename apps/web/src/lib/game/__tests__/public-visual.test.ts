import { toPublicVisual } from "../public-visual";

const canonicalBoard = {
  version: 1,
  pngDataUrl: "data:image/png;base64,AAAA",
  sha256: "a".repeat(64),
  sourceFingerprint: "b".repeat(64),
  width: 12,
  height: 10,
};
test("public board keeps canonical pixels while removing private metadata", () => {
  const result = toPublicVisual({
    mode: "composed",
    layers: [],
    caption: "above",
    canonicalBoard: { ...canonicalBoard, privatePrompt: "secret" },
  });
  expect(result).toMatchObject({ canonicalBoard });
  expect(result).not.toHaveProperty("caption");
  expect(JSON.stringify(result)).not.toContain("secret");
});
test("malformed canonical presence cannot become a legacy board", () => {
  expect(
    toPublicVisual({ layers: [], canonicalBoard: { version: 9, privatePrompt: "secret" } })
      ?.canonicalBoard
  ).toEqual({ version: 0 });
  expect(toPublicVisual({ layers: [] })?.canonicalBoard).toBeUndefined();
});
test("public board keeps reviewed phone rasters so phones do not shrink the desktop one", () => {
  const mobile = {
    pngDataUrl: "data:image/png;base64,BBBB",
    sha256: "c".repeat(64),
    width: 8,
    height: 6,
  };
  const result = toPublicVisual({
    layers: [],
    canonicalBoard: {
      ...canonicalBoard,
      profileVariants: { "mobile-375": { ...mobile, reviewerNotes: "secret" } },
    },
  });
  expect(result?.canonicalBoard).toEqual({
    ...canonicalBoard,
    profileVariants: { "mobile-375": mobile },
  });
  expect(JSON.stringify(result)).not.toContain("secret");
});
test("a malformed phone raster drops the variants but never the reviewed board", () => {
  const result = toPublicVisual({
    layers: [],
    canonicalBoard: {
      ...canonicalBoard,
      profileVariants: {
        "mobile-375": { pngDataUrl: "not a png", sha256: "x", width: 0, height: 0 },
      },
    },
  });
  expect(result?.canonicalBoard).toEqual(canonicalBoard);
});
