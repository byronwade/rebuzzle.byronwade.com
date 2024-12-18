import { NextResponse } from "next/server";
import { generateNextPuzzle } from "../../../actions/puzzleGenerationActions";

export const config = {
	runtime: "edge",
};

export async function GET(request: Request) {
	if (request.headers.get("Authorization") !== `Bearer ${process.env.CRON_SECRET}`) {
		return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
	}

	try {
		await generateNextPuzzle();
		return NextResponse.json({ success: true });
	} catch (error) {
		console.error("Failed to generate puzzle:", error);
		return NextResponse.json({ success: false, error: "Failed to generate puzzle" }, { status: 500 });
	}
}
