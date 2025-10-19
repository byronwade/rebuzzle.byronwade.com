import { NextResponse } from "next/server";
import { getPuzzleStats } from "../../../actions/puzzleGenerationActions";

export async function GET() {
	try {
		const result = await getPuzzleStats();

		if (result.success) {
			return NextResponse.json({
				success: true,
				stats: result.stats,
				generatedAt: result.generatedAt,
			});
		} else {
			return NextResponse.json(
				{
					success: false,
					error: result.error || "Failed to get puzzle stats",
				},
				{ status: 500 }
			);
		}
	} catch (error) {
		console.error("Error in puzzle stats API:", error);
		return NextResponse.json(
			{
				success: false,
				error: "Internal server error",
			},
			{ status: 500 }
		);
	}
}
