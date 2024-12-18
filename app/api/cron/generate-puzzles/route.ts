import { NextResponse } from "next/server";
import { generateNextPuzzle } from "../../../actions/puzzleGenerationActions";

export const config = {
	runtime: "edge",
};

export async function GET(request: Request) {
	try {
		await generateNextPuzzle();
		return NextResponse.json({ success: true });
	} catch (error) {
		console.error("Failed to generate puzzle:", error);
		return NextResponse.json({ success: false, error: "Failed to generate puzzle" }, { status: 500 });
	}
}
