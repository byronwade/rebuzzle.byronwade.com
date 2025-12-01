import { NextResponse } from "next/server";
import type { Puzzle } from "@/db/models";
import { getCollection } from "@/db/mongodb";
import { verifyAdminAccess } from "@/lib/admin-auth";

/**
 * GET /api/admin/puzzles/[id]
 * Get a single puzzle by ID
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await verifyAdminAccess(request);
    if (!admin) {
      return NextResponse.json(
        { error: "Unauthorized - Admin access required" },
        { status: 401 }
      );
    }

    const { id } = await params;
    const puzzlesCollection = getCollection<Puzzle>("puzzles");
    const puzzle = await puzzlesCollection.findOne({ id });

    if (!puzzle) {
      return NextResponse.json({ error: "Puzzle not found" }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      puzzle,
    });
  } catch (error) {
    console.error("Admin puzzle get error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch puzzle",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/admin/puzzles/[id]
 * Update a puzzle
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await verifyAdminAccess(request);
    if (!admin) {
      return NextResponse.json(
        { error: "Unauthorized - Admin access required" },
        { status: 401 }
      );
    }

    const { id } = await params;
    const body = await request.json();
    const puzzlesCollection = getCollection<Puzzle>("puzzles");

    // Check if puzzle exists
    const existingPuzzle = await puzzlesCollection.findOne({ id });
    if (!existingPuzzle) {
      return NextResponse.json({ error: "Puzzle not found" }, { status: 404 });
    }

    // Prepare update object
    const updates: Partial<Puzzle> = {};

    if (body.puzzle !== undefined) updates.puzzle = body.puzzle;
    if (body.puzzleType !== undefined) updates.puzzleType = body.puzzleType;
    if (body.answer !== undefined) updates.answer = body.answer;
    if (body.difficulty !== undefined) updates.difficulty = body.difficulty;
    if (body.category !== undefined) updates.category = body.category;
    if (body.explanation !== undefined) updates.explanation = body.explanation;
    if (body.hints !== undefined) updates.hints = body.hints;
    if (body.publishedAt !== undefined)
      updates.publishedAt = new Date(body.publishedAt);
    if (body.active !== undefined) updates.active = body.active;
    if (body.metadata !== undefined) updates.metadata = body.metadata;

    await puzzlesCollection.updateOne({ id }, { $set: updates });

    const updatedPuzzle = await puzzlesCollection.findOne({ id });

    return NextResponse.json({
      success: true,
      puzzle: updatedPuzzle,
      message: "Puzzle updated successfully",
    });
  } catch (error) {
    console.error("Admin puzzle update error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to update puzzle",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/admin/puzzles/[id]
 * Delete a puzzle
 */
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await verifyAdminAccess(request);
    if (!admin) {
      return NextResponse.json(
        { error: "Unauthorized - Admin access required" },
        { status: 401 }
      );
    }

    const { id } = await params;
    const puzzlesCollection = getCollection<Puzzle>("puzzles");

    const result = await puzzlesCollection.deleteOne({ id });

    if (result.deletedCount === 0) {
      return NextResponse.json({ error: "Puzzle not found" }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: "Puzzle deleted successfully",
    });
  } catch (error) {
    console.error("Admin puzzle delete error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to delete puzzle",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
