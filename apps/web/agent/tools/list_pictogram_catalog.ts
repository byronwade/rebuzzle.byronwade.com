import { defineTool } from "eve/tools";
import { z } from "zod";
import {
  CURATED_PICTOGRAM_CATALOG_VERSION,
  listCuratedPictogramIds,
} from "../../src/ai/puzzle-agent/visual/curated-pictograms";

export default defineTool({
  description:
    "List exact, reviewed pictogram concept IDs that are immediately eligible for publication. Use these exact nouns in compose_puzzle_visual.",
  inputSchema: z.object({}),
  async execute() {
    return {
      version: CURATED_PICTOGRAM_CATALOG_VERSION,
      concepts: listCuratedPictogramIds(),
      rule: "Publication compositions must use these exact concept IDs or an existing approved-cache asset.",
    };
  },
});
