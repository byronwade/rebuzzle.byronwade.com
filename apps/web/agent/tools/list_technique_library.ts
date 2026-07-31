import { defineTool } from "eve/tools";
import { z } from "zod";
import { listTechniqueLibrary } from "../../src/ai/puzzle-agent/tool-impl";

export default defineTool({
  description:
    "Look up rebus/visual techniques (how to assemble components for fun, fair puzzles).",
  inputSchema: z.object({
    techniqueIds: z.array(z.string()).optional(),
  }),
  async execute(input) {
    return listTechniqueLibrary(input);
  },
});
