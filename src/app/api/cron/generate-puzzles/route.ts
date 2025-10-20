import { NextResponse } from "next/server"
import { generateNextPuzzle } from "../../../actions/puzzleGenerationActions"
import { checkDatabaseHealth } from "@/db/mongodb"

// Edge runtime removed - incompatible with PPR (cacheComponents)

export async function GET(request: Request) {
	// Verify this is a legitimate cron request
	const authHeader = request.headers.get("authorization")
	if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
		return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
	}

	try {
		// Check database health before generating puzzle
		const dbHealth = await checkDatabaseHealth()
		if (!dbHealth.healthy) {
			console.error("Database health check failed:", dbHealth.error)
			return NextResponse.json({ 
				success: false, 
				error: "Database connection failed",
				details: dbHealth.error 
			}, { status: 500 });
		}

		console.log("🚀 Starting daily puzzle generation...")
		const result = await generateNextPuzzle();
		
		console.log("✅ Daily puzzle generation completed successfully")
		return NextResponse.json({ 
			success: true, 
			message: "Puzzle generated successfully",
			generatedAt: new Date().toISOString(),
			cached: result.cached || false,
			aiGenerated: result.aiGenerated || false
		});
	} catch (error) {
		console.error("❌ Failed to generate puzzle:", error);
		return NextResponse.json({ 
			success: false, 
			error: "Failed to generate puzzle",
			details: error instanceof Error ? error.message : "Unknown error"
		}, { status: 500 });
	}
}
