import { defineTool } from "eve/tools";
import { z } from "zod";
import { generatePictogram } from "../../src/ai/puzzle-agent/tool-impl";

export default defineTool({
  description:
    "Generate one Rebuzzle Ink Pictogram v1 SVG (custom brand emoji) for a concept.",
  inputSchema: z.object({
    concept: z.string(),
    role: z.string().optional(),
    emojiFallback: z.string().optional(),
  }),
  async execute(input) {
    return generatePictogram(input);
  },
});
