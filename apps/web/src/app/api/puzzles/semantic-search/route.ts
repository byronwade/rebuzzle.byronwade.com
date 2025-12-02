/**
 * Semantic Search API
 *
 * Provides semantic search capabilities for finding similar puzzles
 */

import { NextResponse } from "next/server";
import { findSimilarPuzzles, searchPuzzlesByConcept } from "@/ai/services/semantic-search";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const puzzleId = searchParams.get("puzzleId");
    const concept = searchParams.get("concept");
    const limitParam = Number.parseInt(searchParams.get("limit") || "10", 10);
    const minSimilarityParam = Number.parseFloat(searchParams.get("minSimilarity") || "0.7");

    // Validate and clamp parameters
    const limit = Number.isNaN(limitParam) || limitParam < 1 ? 10 : Math.min(limitParam, 100);
    const minSimilarity = Number.isNaN(minSimilarityParam)
      ? 0.7
      : Math.max(0, Math.min(1, minSimilarityParam));

    // Search by puzzle ID (find similar puzzles)
    if (puzzleId) {
      const results = await findSimilarPuzzles(puzzleId, limit, minSimilarity);

      return NextResponse.json({
        success: true,
        results: results.map((r) => ({
          puzzle: r.puzzle,
          similarity: r.similarity,
        })),
        count: results.length,
      });
    }

    // Search by concept
    if (concept) {
      const results = await searchPuzzlesByConcept(concept, limit, minSimilarity);

      return NextResponse.json({
        success: true,
        results: results.map((r) => ({
          puzzle: r.puzzle,
          similarity: r.similarity,
        })),
        count: results.length,
      });
    }

    return NextResponse.json(
      { error: "Either puzzleId or concept must be provided" },
      { status: 400 }
    );
  } catch (error) {
    console.error("[Semantic Search API] Error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to perform semantic search",
      },
      { status: 500 }
    );
  }
}
