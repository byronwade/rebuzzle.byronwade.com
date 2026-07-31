import { defineAgent } from "eve";

/**
 * Rebuzzle daily puzzle agent.
 * Models resolve through Vercel AI Gateway (`provider/model` ids).
 */
export default defineAgent({
  model: process.env.EVE_PUZZLE_MODEL || "openai/gpt-5.4-mini",
});
