import { NextResponse } from "next/server";
import { getTodaysPuzzle } from "../../../actions/puzzleGenerationActions";

export async function GET() {
	try {
		const result = await getTodaysPuzzle();

		if (result.success) {
			return NextResponse.json({
				success: true,
				puzzle: result.puzzle,
				cached: result.cached,
				generatedAt: result.generatedAt,
			});
		} else {
			return NextResponse.json(
				{
					success: false,
					error: "Failed to generate puzzle",
				},
				{ status: 500 }
			);
		}
	} catch (error) {
		console.error("Error in puzzle API:", error);
		return NextResponse.json(
			{
				success: false,
				error: "Internal server error",
			},
			{ status: 500 }
		);
	}
}
