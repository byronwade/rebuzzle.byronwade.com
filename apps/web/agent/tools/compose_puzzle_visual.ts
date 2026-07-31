import { defineTool } from "eve/tools";
import { z } from "zod";
import { composePuzzleVisual } from "../../src/ai/puzzle-agent/tool-impl";
import { VisualLayerSchema } from "../../src/ai/puzzle-agent/visual/composition";

export default defineTool({
  description:
    "Build a generative puzzle board from layers (pictogram / text / operator / optional image). Generates custom Ink Pictogram SVGs and scores budget + fun. Use unicodeFallback as rebusPuzzle in the final result.",
  inputSchema: z.object({
    answer: z.string(),
    targetDifficulty: z.number(),
    techniqueId: z.string().optional(),
    layout: z.enum(["row", "stack", "grid", "overlay"]).optional(),
    layers: z.array(VisualLayerSchema).min(1).max(12),
    unicodeFallback: z.string().optional(),
    caption: z.string().optional(),
    renderImages: z.boolean().optional(),
  }),
  async execute(input) {
    return composePuzzleVisual(input);
  },
});
