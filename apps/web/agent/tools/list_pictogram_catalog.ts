import { defineTool } from "eve/tools";
import { z } from "zod";
import {
  CURATED_PICTOGRAM_CATALOG_VERSION,
  getCuratedPictogramReadingPolicy,
  CURATED_PICTOGRAM_READING_POLICY_VERSION,
  listCuratedPictogramIds,
} from "../../src/ai/puzzle-agent/visual/curated-pictograms";

export default defineTool({
  description:
    "List exact, reviewed pictogram concept IDs that are immediately eligible for publication. Use approved readings in compose_puzzle_visual; search aliases and common confusions are not approved readings.",
  inputSchema: z.object({}),
  async execute() {
    return {
      version: CURATED_PICTOGRAM_CATALOG_VERSION,
      concepts: listCuratedPictogramIds(),
      readingPolicyVersion: CURATED_PICTOGRAM_READING_POLICY_VERSION,
      readings: listCuratedPictogramIds().map(getCuratedPictogramReadingPolicy),
      rule: "Publication compositions must use these exact concept IDs or an existing approved-cache asset.",
    };
  },
});
