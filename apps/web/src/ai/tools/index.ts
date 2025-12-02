/**
 * AI Tools Export
 *
 * Central export point for all AI tools available to agents
 */

export {
  analyzePuzzlePerformanceTool,
  findSimilarPuzzlesTool,
  getPuzzleStatisticsTool,
  getUserHistoryTool,
  getUserProfileTool,
  searchPuzzlesByConceptTool,
} from "./mongodb-tools";

// Export all tools as an array for easy agent configuration
export const allMongoDBTools = [
  // Import tools dynamically to avoid circular dependencies
  // Tools will be imported in agent configuration
];
