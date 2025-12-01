import { NextResponse } from "next/server";
import type { NewPuzzle, Puzzle } from "@/db/models";
import { getCollection } from "@/db/mongodb";
import { verifyAdminAccess } from "@/lib/admin-auth";

/**
 * GET /api/admin/puzzles
 * List all puzzles with pagination
 */
export async function GET(request: Request) {
  try {
    const admin = await verifyAdminAccess(request);
    if (!admin) {
      return NextResponse.json(
        { error: "Unauthorized - Admin access required" },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const page = Number.parseInt(searchParams.get("page") || "1", 10);
    const limit = Number.parseInt(searchParams.get("limit") || "50", 10);
    const skip = (page - 1) * limit;
    const search = searchParams.get("search") || "";
    const puzzleType = searchParams.get("puzzleType") || "";
    const active = searchParams.get("active");

    const puzzlesCollection = getCollection<Puzzle>("puzzles");

    // Build query
    const query: any = {};

    if (search) {
      query.$or = [
        { puzzle: { $regex: search, $options: "i" } },
        { answer: { $regex: search, $options: "i" } },
        { explanation: { $regex: search, $options: "i" } },
      ];
    }

    if (puzzleType) {
      query.puzzleType = puzzleType;
    }

    if (active !== null && active !== undefined) {
      query.active = active === "true";
    }

    const [puzzles, total] = await Promise.all([
      puzzlesCollection
        .find(query)
        .sort({ publishedAt: -1, createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .toArray(),
      puzzlesCollection.countDocuments(query),
    ]);

    return NextResponse.json({
      success: true,
      puzzles,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Admin puzzles list error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch puzzles",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/puzzles
 * Create a new puzzle
 */
export async function POST(request: Request) {
  try {
    const admin = await verifyAdminAccess(request);
    if (!admin) {
      return NextResponse.json(
        { error: "Unauthorized - Admin access required" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const {
      puzzle,
      puzzleType,
      answer,
      difficulty,
      category,
      explanation,
      hints,
      publishedAt,
      active = true,
      metadata,
    } = body;

    // Validation
    if (!(puzzle && answer)) {
      return NextResponse.json(
        { error: "Puzzle and answer are required" },
        { status: 400 }
      );
    }

    const puzzlesCollection = getCollection<Puzzle>("puzzles");

    const newPuzzle: NewPuzzle = {
      id: `puzzle_${Date.now()}_${Math.random().toString(36).substring(7)}`,
      puzzle,
      puzzleType: puzzleType || "rebus",
      answer,
      difficulty: difficulty || "medium",
      category,
      explanation,
      hints: hints || [],
      publishedAt: publishedAt ? new Date(publishedAt) : new Date(),
      createdAt: new Date(),
      active,
      metadata: metadata || {},
    };

    await puzzlesCollection.insertOne(newPuzzle);

    return NextResponse.json({
      success: true,
      puzzle: newPuzzle,
      message: "Puzzle created successfully",
    });
  } catch (error) {
    console.error("Admin puzzle create error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to create puzzle",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

