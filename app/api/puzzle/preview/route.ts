import { NextResponse } from "next/server";
import { previewPuzzleGeneration } from "../../../actions/puzzleGenerationActions";

export async function GET() {
	try {
		const result = await previewPuzzleGeneration();

		if (result.success) {
			return NextResponse.json({
				success: true,
				puzzles: result.puzzles,
				message: result.message,
				generatedAt: result.generatedAt,
			});
		} else {
			return NextResponse.json(
				{
					success: false,
					error: result.error || "Failed to preview puzzles",
				},
				{ status: 500 }
			);
		}
	} catch (error) {
		console.error("Error in puzzle preview API:", error);
		return NextResponse.json(
			{
				success: false,
				error: "Internal server error",
			},
			{ status: 500 }
		);
	}
}
