// app/api/clear-cache/route.js
import { NextResponse } from "next/server";

export async function GET() {
	try {
		// Clear the cached data here
		global.cache = null;
		global.cacheTimestamp = null;
		console.log("Cache cleared via cron job");

		return NextResponse.json({ message: "Cache cleared successfully" }, { status: 200 });
	} catch (error) {
		console.error("Error clearing cache:", error);
		return NextResponse.json({ error: "Error clearing cache" }, { status: 500 });
	}
}
