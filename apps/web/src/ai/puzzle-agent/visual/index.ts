export {
  type ComposePuzzleVisualInput,
  type ComposePuzzleVisualResult,
  composePuzzleVisual,
} from "./compose-visual";
export {
  buildUnicodeFallback,
  countVisualParts,
  type ImageLayer,
  type OperatorLayer,
  type PictogramLayer,
  type PuzzleVisual,
  PuzzleVisualSchema,
  type TextLayer,
  type VisualLayer,
  VisualLayerSchema,
} from "./composition";
export {
  type IconRecognitionResult,
  recognizePictogramIcon,
} from "./critique-pictogram";
export {
  type GenerateImageTileInput,
  type GenerateImageTileResult,
  generateImageTile,
} from "./generate-image-tile";
export {
  type GeneratePictogramInput,
  type GeneratePictogramResult,
  generatePictogram,
} from "./generate-pictogram";
export {
  conceptMatchesSeen,
  getIconFeatureHints,
  ICON_FEATURES,
  lookupIconFeatures,
  OVERUSED_REBUS_TROPES,
} from "./icon-features";
export { inventLabBrief, type LabBrief } from "./invent-lab-brief";
export {
  buildLabLayers,
  guessEmoji,
  isVisualLabMode,
  VISUAL_LAB_MODE_META,
  VISUAL_LAB_MODES,
  type VisualLabMode,
  type VisualLabModeMeta,
} from "./lab-recipes";
export {
  buildConcreteDrawingBrief,
  isAbstractPictogramConcept,
  type PictogramClarityResult,
  passesPictogramClarity,
  scorePictogramClarity,
} from "./pictogram-clarity";
export {
  evaluatePictogramPixelIntegrity,
  PICTOGRAM_PIXEL_INTEGRITY_SIZES,
  PICTOGRAM_PIXEL_INTEGRITY_VERSION,
  type PictogramPixelIntegrityProfile,
  type PictogramPixelIntegrityResult,
} from "./pictogram-pixel-integrity";
export { type RunVisualLabInput, type RunVisualLabResult, runVisualLab } from "./run-visual-lab";
export {
  IMAGE_TILE_STYLE_GUIDE,
  INK_PICTOGRAM_EXAMPLE_BEE,
  INK_PICTOGRAM_EXAMPLE_CLOCK,
  INK_PICTOGRAM_EXAMPLE_EYE,
  INK_PICTOGRAM_EXAMPLE_KEY,
  INK_PICTOGRAM_EXAMPLE_UMBRELLA,
  INK_PICTOGRAM_PALETTE,
  INK_PICTOGRAM_STYLE_GUIDE,
  INK_PICTOGRAM_STYLE_ID,
} from "./style";
