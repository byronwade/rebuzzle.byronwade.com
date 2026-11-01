import sharp from "sharp";
import * as compiler from "../canonical-board";
import { canonicalBoardForProfile, validateCanonicalBoard } from "../canonical-contract";
import type { PuzzleVisual } from "../composition";
import { renderPuzzleVisualProfiles } from "../render-board";

const visual: PuzzleVisual = {
  styleId: "ink-pictogram-v1",
  mode: "composed",
  layout: "free",
  unicodeFallback: "UP",
  caption: "Look above",
  layers: [{ kind: "text", content: "UP", emphasis: "normal", x: 45, y: 40 }],
};
test("compiles independently of supplied artifacts and freezes all profile geometry", async () => {
  const board = await compiler.compileCanonicalBoard(visual);
  expect(
    await compiler.compileCanonicalBoard({
      ...visual,
      canonicalBoard: { ...board, sha256: "0".repeat(64) },
    })
  ).toEqual(board);
  const profiles = await renderPuzzleVisualProfiles({ ...visual, canonicalBoard: board });
  for (const profile of profiles) {
    const bytes = await validateCanonicalBoard(canonicalBoardForProfile(board, profile.profileId));
    const expected = await sharp(bytes).png().toBuffer();
    expect(Buffer.from(profile.pixels)).toEqual(expected);
  }
  expect(Object.keys(board.profileVariants ?? {})).toEqual([
    "compact-320",
    "mobile-375",
    "mobile-375-medium",
  ]);
  expect(
    (await compiler.compileCanonicalBoard({ ...visual, caption: "Different" })).sha256
  ).not.toBe(board.sha256);
}, 30_000);
test("fails closed for remote images, missing pictograms and unsupported mode", async () => {
  await expect(
    compiler.compileCanonicalBoard({
      ...visual,
      layers: [
        { kind: "image", prompt: "remote image", alt: "image", src: "https://example.com/a.png" },
      ],
    })
  ).rejects.toThrow();
  await expect(
    compiler.compileCanonicalBoard({
      ...visual,
      layers: [{ kind: "pictogram", concept: "cat", emojiFallback: "cat" }],
    })
  ).rejects.toThrow();
  await expect(compiler.compileCanonicalBoard({ ...visual, mode: "unicode" })).rejects.toThrow();
});
test("rejects modified, oversized and mismatched artifacts", async () => {
  const board = await compiler.compileCanonicalBoard(visual);
  await expect(validateCanonicalBoard({ ...board, sha256: "0".repeat(64) })).rejects.toThrow();
  await expect(validateCanonicalBoard({ ...board, width: board.width + 1 })).rejects.toThrow();
  await expect(validateCanonicalBoard({ ...board, width: 2049 })).rejects.toThrow();
  await expect(
    validateCanonicalBoard({ ...board, pngDataUrl: `data:image/png;base64,${"A".repeat(1400000)}` })
  ).rejects.toThrow();
});
test("rejects clipped layers and active SVG constructs rather than changing the clue", async () => {
  await expect(
    compiler.compileCanonicalBoard({
      ...visual,
      layers: [{ kind: "text", content: "OUTSIDE", emphasis: "large", x: 0, y: 0 }],
    })
  ).rejects.toThrow();
  await expect(
    compiler.compileCanonicalBoard({
      ...visual,
      layers: [
        {
          kind: "pictogram",
          concept: "red",
          emojiFallback: "R",
          svg: '<svg viewBox="0 0 64 64"><image href="https://example.com/x"/></svg>',
        },
      ],
    })
  ).rejects.toThrow();
});
test("preserves semantic SVG color in compiled pixels", async () => {
  const board = await compiler.compileCanonicalBoard({
    ...visual,
    layers: [
      {
        kind: "pictogram",
        concept: "red",
        emojiFallback: "R",
        svg: '<svg viewBox="0 0 64 64"><rect width="64" height="64" fill="#ff0000"/></svg>',
      },
    ],
  });
  const pixels = await sharp(await validateCanonicalBoard(board))
    .removeAlpha()
    .raw()
    .toBuffer();
  let red = 0;
  for (let i = 0; i < pixels.length; i += 3)
    if (pixels[i] === 255 && pixels[i + 1] === 0 && pixels[i + 2] === 0) red++;
  expect(red).toBeGreaterThan(1000);
});

test("legacy canonical boards without profile rasters use the shared responsive renderer", async () => {
  const board = await compiler.compileCanonicalBoard(visual);
  const legacyBoard = { ...board, profileVariants: undefined };
  const expected = await renderPuzzleVisualProfiles(visual);
  const actual = await renderPuzzleVisualProfiles({ ...visual, canonicalBoard: legacyBoard });

  expect(actual.map((profile) => profile.width)).toEqual(expected.map((profile) => profile.width));
  expect(actual.map((profile) => profile.height)).toEqual(
    expected.map((profile) => profile.height)
  );
  expect(actual.map((profile) => Buffer.from(profile.pixels))).toEqual(
    expected.map((profile) => Buffer.from(profile.pixels))
  );
}, 30_000);

test("trusts an intact board compiled from the same source and recompiles stale ones", async () => {
  const board = await compiler.compileCanonicalBoard(visual);
  expect(compiler.canonicalSourceFingerprint(visual)).toBe(board.sourceFingerprint);

  const boarded = { ...visual, canonicalBoard: board };
  await expect(compiler.hasTrustedCanonicalBoard(boarded)).resolves.toBe(true);
  await expect(compiler.ensureTrustedCanonicalBoard(boarded)).resolves.toBe(boarded);

  const stale = { ...visual, caption: "Different", canonicalBoard: board };
  await expect(compiler.hasTrustedCanonicalBoard(stale)).resolves.toBe(false);
  const refreshed = await compiler.ensureTrustedCanonicalBoard(stale);
  expect(refreshed.canonicalBoard.sourceFingerprint).toBe(
    compiler.canonicalSourceFingerprint(stale)
  );
  expect(refreshed.canonicalBoard.sha256).not.toBe(board.sha256);

  const legacy = { ...visual, canonicalBoard: { ...board, profileVariants: undefined } };
  await expect(compiler.hasTrustedCanonicalBoard(legacy)).resolves.toBe(false);
  const tampered = { ...visual, canonicalBoard: { ...board, sha256: "0".repeat(64) } };
  await expect(compiler.hasTrustedCanonicalBoard(tampered)).resolves.toBe(false);
  await expect(compiler.hasTrustedCanonicalBoard(visual)).resolves.toBe(false);
}, 30_000);

test("ensureTrustedCanonicalBoard fails closed when the source cannot compile", async () => {
  expect(compiler.CANONICAL_BOARD_FAILED).toBe("canonical-board-failed");
  await expect(
    compiler.ensureTrustedCanonicalBoard({ ...visual, mode: "unicode" })
  ).rejects.toThrow();
});
