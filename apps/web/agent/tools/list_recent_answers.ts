import { defineTool } from "eve/tools";
import { z } from "zod";
import { listRecentAnswers } from "../../src/ai/puzzle-agent/tool-impl";

export default defineTool({
  description:
    "List recent puzzle answers so the new puzzle stays unique and avoids repeats.",
  inputSchema: z.object({
    lookbackDays: z.number().optional(),
    limit: z.number().optional(),
  }),
  async execute(input) {
    return listRecentAnswers(input);
  },
});
