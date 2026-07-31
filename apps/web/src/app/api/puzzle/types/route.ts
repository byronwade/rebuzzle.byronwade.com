import { NextResponse } from "next/server";
import { getAllPuzzleTypeConfigs, listPuzzleTypes } from "@/ai/config/puzzle-types";

/**
 * API endpoint to list all available puzzle types
 *
 * Usage: GET /api/puzzle/types
 */
export async function GET() {
  try {
    const types = listPuzzleTypes();
    const configs = getAllPuzzleTypeConfigs();

    // Return types with their metadata
    const typesWithInfo = types.map((typeId) => {
      const config = configs[typeId];
      if (!config) {
        return {
          id: typeId,
          name: typeId,
          description: "Unknown puzzle type",
        };
      }
      return {
        id: typeId,
        name: config.name,
        description: config.description,
      };
    });

    return NextResponse.json({
      success: true,
      types: typesWithInfo,
      defaultType: process.env.DEFAULT_PUZZLE_TYPE || "rebus",
    });
  } catch (error) {
    console.error("Error listing puzzle types:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
