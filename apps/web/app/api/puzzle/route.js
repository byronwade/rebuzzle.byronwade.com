import { supabase } from "shared-utils";

const CACHE_DURATION = 10 * 60 * 1000; // 10 minutes
let cache = null;
let cacheTimestamp = null;

export async function GET(request) {
	const now = new Date();
	const localToday = new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().split("T")[0];

	const { data: todayData, error: todayError } = await supabase.from("puzzles").select("*").eq("puzzle_date", localToday).limit(1);

	const headers = {
		"Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
		Pragma: "no-cache",
		Expires: "0",
		"Surrogate-Control": "no-store",
	};

	if (todayError) {
		console.error("Error fetching today's puzzle:", todayError);
		return new Response(JSON.stringify({ error: todayError.message }), { status: 500, headers });
	}

	if (todayData.length === 0) {
		const { data: recentData, error: recentError } = await supabase.from("puzzles").select("*").order("puzzle_date", { ascending: false }).limit(1);

		if (recentError) {
			console.error("Error fetching recent puzzle:", recentError);
			return new Response(JSON.stringify({ error: recentError.message }), { status: 500, headers });
		}

		return new Response(JSON.stringify(recentData[0]), { status: 200, headers });
	}

	return new Response(JSON.stringify(todayData[0]), { status: 200, headers });
}

// Clear cache periodically
if (typeof global.clearCacheInterval === "undefined") {
	global.clearCacheInterval = setInterval(() => {
		cache = null;
		cacheTimestamp = null;
		console.log("Cache cleared periodically");
	}, CACHE_DURATION);
}