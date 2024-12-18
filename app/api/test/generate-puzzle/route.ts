import { generateNextPuzzle } from "@/app/actions/puzzleGenerationActions";
import { NextResponse } from "next/server";

export async function GET() {
	try {
		const today = new Date();
		today.setUTCHours(0, 0, 0, 0);

		const result = await generateNextPuzzle(today);
		return NextResponse.json(result);
	} catch (error) {
		console.error("Error in test route:", error);
		return NextResponse.json({ error: "Failed to generate puzzle" }, { status: 500 });
	}
}
