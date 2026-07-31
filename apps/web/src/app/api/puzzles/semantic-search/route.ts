/**
 * Semantic Search API — admin only; answers stripped from results.
 */

import { NextResponse } from "next/server";
import { findSimilarPuzzles, searchPuzzlesByConcept } from "@/ai/services/semantic-search";
import { verifyAdminAccess } from "@/lib/admin-auth";
import { toPublicPuzzle } from "@/lib/game/public-puzzle";

export async function GET(request: Request) {
  try {
    const admin = await verifyAdminAccess(request);
    if (!admin) {
      return NextResponse.json({ success: false, error: "Admin access required" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const puzzleId = searchParams.get("puzzleId");
    const concept = searchParams.get("concept");
    const limitParam = Number.parseInt(searchParams.get("limit") || "10", 10);
    const minSimilarityParam = Number.parseFloat(searchParams.get("minSimilarity") || "0.7");

    const limit = Number.isNaN(limitParam) || limitParam < 1 ? 10 : Math.min(limitParam, 100);
    const minSimilarity = Number.isNaN(minSimilarityParam)
      ? 0.7
      : Math.max(0, Math.min(1, minSimilarityParam));

    if (puzzleId) {
      const results = await findSimilarPuzzles(puzzleId, limit, minSimilarity);
      return NextResponse.json({
        success: true,
        results: results.map((r) => ({
          puzzle: toPublicPuzzle(r.puzzle as unknown as Record<string, unknown>),
          similarity: r.similarity,
        })),
        count: results.length,
      });
    }

    if (concept) {
      const results = await searchPuzzlesByConcept(concept, limit, minSimilarity);
      return NextResponse.json({
        success: true,
        results: results.map((r) => ({
          puzzle: toPublicPuzzle(r.puzzle as unknown as Record<string, unknown>),
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
        error: error instanceof Error ? error.message : "Search failed",
      },
      { status: 500 }
    );
  }
}
