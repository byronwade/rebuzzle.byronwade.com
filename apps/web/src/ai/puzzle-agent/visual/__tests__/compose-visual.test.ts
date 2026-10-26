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
