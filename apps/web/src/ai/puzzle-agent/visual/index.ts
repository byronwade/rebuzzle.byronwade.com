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
  buildLabLayers,
  guessEmoji,
  isVisualLabMode,
  VISUAL_LAB_MODE_META,
  VISUAL_LAB_MODES,
  type VisualLabMode,
  type VisualLabModeMeta,
} from "./lab-recipes";
export { inventLabBrief, type LabBrief } from "./invent-lab-brief";
export { type RunVisualLabInput, type RunVisualLabResult, runVisualLab } from "./run-visual-lab";
export {
  IMAGE_TILE_STYLE_GUIDE,
  INK_PICTOGRAM_PALETTE,
  INK_PICTOGRAM_STYLE_GUIDE,
  INK_PICTOGRAM_STYLE_ID,
} from "./style";
