const findEligible = jest.fn();
jest.mock("../../review/original-artwork-promotion-server", () => ({
  originalArtworkPromotionService: { findEligible },
}));

import { preflightComposeAnswerSeedCuePlan } from "../../apex/cue-plan-preflight";
import { evaluateSemanticAlignment } from "../../semantic-alignment";

const recognizePictogramIcon = jest.fn();
const generateAIText = jest.fn();
const findApproved = jest.fn();
jest.mock("@/ai/client", () => ({ generateAIText }));
jest.mock("../critique-pictogram", () => ({ recognizePictogramIcon }));
jest.mock("../generate-image-tile", () => ({ generateImageTile: jest.fn() }));
jest.mock("../../review/generated-pictogram-registry-server", () => ({
  generatedPictogramRegistry: { findApproved, quarantine: jest.fn(), submitCandidate: jest.fn() },
}));

import { evaluateVisualForPublish } from "../../quality";
import { composePuzzleVisual } from "../compose-visual";
import type { PictogramLayer } from "../composition";
import { resolveCuratedPictogram } from "../curated-pictograms";
import { PLAYER_ICON_GATE_SIZES } from "../presentation";
import { verifyPublicationAssets } from "../publication-assets";

const asset = resolveCuratedPictogram("brain")!;
function layer(overrides: Partial<PictogramLayer> = {}): PictogramLayer {
  return {
    kind: "pictogram",
    concept: "brain",
    emojiFallback: "🧠",
    source: "catalog",
    assetId: asset.assetId,
    svg: asset.svg,
    ...overrides,
  };
}
function recognition(ok = true) {
  return {
    ok,
    seenLabel: ok ? "brain" : "cloud",
    confidence: ok ? 0.94 : 0.2,
    profileResults: PLAYER_ICON_GATE_SIZES.map((tileSize) => ({
      tileSize,
      seenLabel: ok ? "brain" : "cloud",
      confidence: ok ? 0.94 : 0.2,
    })),
  };
}
function compose(pictogram: PictogramLayer) {
  return composePuzzleVisual({
    answer: "brain drain",
    targetDifficulty: 4,
    techniqueId: "simple_compound",
    layers: [
      pictogram,
      { kind: "operator", symbol: "+" },
      { kind: "text", content: "DRAIN", emphasis: "normal" },
    ],
  });
}

beforeEach(() => {
  jest.clearAllMocks();
  findApproved.mockResolvedValue(null);
  findEligible.mockResolvedValue(null);
  recognizePictogramIcon.mockResolvedValue(recognition());
});

it("obtains current player-size evidence even for an exact precomposed catalog SVG", async () => {
  const result = await compose(layer());
  expect(result.visual.layers[0]).toMatchObject({
    svg: asset.svg,
    assetId: asset.assetId,
    recognitionProfiles: PLAYER_ICON_GATE_SIZES.map((tileSize) => ({
      tileSize,
      seenAs: "brain",
      confidence: 0.94,
    })),
  });
  expect(evaluateVisualForPublish(result.visual).ok).toBe(true);
  expect(recognizePictogramIcon).toHaveBeenCalledWith({ svg: asset.svg, concept: "brain" });
  expect(generateAIText).not.toHaveBeenCalled();
});

it("publishes a reviewed simple icon after current player-size recognition", async () => {
  const simpleSvg = resolveCuratedPictogram("heart")!.svg;
  findApproved.mockResolvedValue({ id: "generated-pictogram:heart", svg: simpleSvg });
  const result = await compose(
    layer({
      concept: "lighthouse",
      svg: simpleSvg,
      source: "approved-cache",
      assetId: "generated-pictogram:heart",
    })
  );

  expect(result.visual.layers[0]).toMatchObject({
    source: "approved-cache",
    svg: simpleSvg,
    recognitionProfiles: expect.any(Array),
  });
  expect(evaluateVisualForPublish(result.visual)).toMatchObject({ ok: true });
  await expect(verifyPublicationAssets(result.visual)).resolves.toEqual({ ok: true });
});

it("rejects a current recognition failure despite model-supplied passing profiles", async () => {
  recognizePictogramIcon.mockResolvedValue(recognition(false));
  const result = await compose(
    layer({
      recognitionProfiles: PLAYER_ICON_GATE_SIZES.map((tileSize) => ({
        tileSize,
        seenAs: "brain",
        confidence: 1,
      })),
    })
  );
  expect(result.generated.pictograms).toBe(0);
  expect(result.generated.failedPictograms).toBe(1);
  expect(result.issues).toContain(
    'Pictogram "brain" has no approved recognizable asset at player size — choose another reviewed concept or repair the asset'
  );
  expect((result.visual.layers[0] as PictogramLayer).recognitionProfiles).toBeUndefined();
  expect(result.visual.layers[0]).not.toHaveProperty("svg", asset.svg);
  expect(evaluateVisualForPublish(result.visual).ok).toBe(false);
  expect(generateAIText).not.toHaveBeenCalled();
});

it("replaces modified SVG and stale evidence only with the exact resolved asset and fresh judgments", async () => {
  const modified = asset.svg.replace("<svg", '<svg data-modified="true"');
  const result = await compose(
    layer({
      svg: modified,
      assetId: "lucide:brain:v1",
      recognitionProfiles: [{ tileSize: 64, seenAs: "brain", confidence: 1 }],
    })
  );
  expect(recognizePictogramIcon).toHaveBeenCalledWith({ svg: asset.svg, concept: "brain" });
  expect(result.visual.layers[0]).toMatchObject({
    svg: asset.svg,
    assetId: asset.assetId,
    recognitionProfiles: PLAYER_ICON_GATE_SIZES.map((tileSize) => ({
      tileSize,
      seenAs: "brain",
      confidence: 0.94,
    })),
  });
  expect(result.visual.layers[0]).not.toHaveProperty("svg", modified);
});

it("composes native typography mechanisms without requiring decorative pictograms", async () => {
  const result = await composePuzzleVisual({
    answer: "big fish small pond",
    targetDifficulty: 7,
    techniqueId: "size_or_case_semantics",
    layout: "grid",
    layers: [
      { kind: "text", content: "FISH", emphasis: "large" },
      { kind: "text", content: "POND", emphasis: "small" },
      { kind: "text", content: "FISH", emphasis: "small" },
      { kind: "text", content: "POND", emphasis: "large" },
    ],
  });
  expect(result.visual.mode).toBe("composed");
  expect(result.issues).toEqual([]);
  expect(result.generated.pictograms).toBe(0);
});

it("composes ordinary text when spatial placement carries the mechanism", async () => {
  const result = await composePuzzleVisual({
    answer: "just between us",
    targetDifficulty: 7,
    techniqueId: "spatial_preposition_play",
    layout: "stack",
    layers: [
      { kind: "text", content: "US", emphasis: "normal" },
      { kind: "text", content: "JUST", emphasis: "normal" },
      { kind: "text", content: "US", emphasis: "normal" },
      { kind: "text", content: "SECRET", emphasis: "normal" },
    ],
  });
  expect(result.visual.mode).toBe("composed");
  expect(result.issues).toEqual([]);
});

it("preserves a legacy mechanism reading when original artwork would break the answer", async () => {
  findEligible.mockImplementation(async (assetId: string) => ({ assetId }));
  const result = await composePuzzleVisual({
    answer: "lighthouse",
    targetDifficulty: 4,
    techniqueId: "simple_compound",
    layers: [
      layer({ concept: "lightbulb" }),
      { kind: "operator", symbol: "+" },
      layer({ concept: "house" }),
    ],
  });
  expect(
    evaluateSemanticAlignment({
      answer: "lighthouse",
      techniqueId: "simple_compound",
      visual: result.visual,
    }).ok
  ).toBe(true);
  expect(result.visual.layers.filter((l) => l.kind === "pictogram").map((l) => l.assetId)).toEqual([
    resolveCuratedPictogram("lightbulb")!.assetId,
    resolveCuratedPictogram("house")!.assetId,
  ]);
});

it("materializes approved originals through the actual rule-graph preflight", async () => {
  findEligible.mockImplementation(async (assetId: string) => ({ assetId }));
  const result = await preflightComposeAnswerSeedCuePlan({
    answer: "flower pot",
    targetDifficulty: 5,
    techniqueId: "simple_compound",
    cues: [
      { kind: "catalog", concept: "flower", role: "word-part" },
      { kind: "text", content: "POT", role: "word-part" },
    ],
  });
  expect(result.ok).toBe(true);
  expect(result.composition?.visual.layers).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        kind: "pictogram",
        assetId: "rebuzzle-ink:flower:v1",
        source: "approved-cache",
      }),
    ])
  );
});

it("preserves first-pass validation failures during a legacy artwork retry", async () => {
  findEligible.mockImplementation(async (assetId: string) => ({ assetId }));
  const result = await composePuzzleVisual({
    answer: "lighthouse",
    targetDifficulty: 4,
    techniqueId: "simple_compound",
    layers: [
      layer({ concept: "lightbulb" }),
      { kind: "operator", symbol: "+" },
      layer({ concept: "house" }),
      { kind: "image", concept: "", prompt: "a shape", alt: "shape" },
    ],
  });
  expect(result.issues).toContain(
    "Image layers require one concrete concept for blind recognition"
  );
});
