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
