import { supabase } from "@/lib/supabaseClient";

const CACHE_DURATION = 10 * 60 * 1000; // 10 minutes
let cache = null;
let cacheTimestamp = null;

export async function GET(request) {
    const now = new Date();
	const utcToday = now.toISOString().split("T")[0];

    const headers = {
		"Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
		Pragma: "no-cache",
		Expires: "0",
		"Surrogate-Control": "no-store",
	};

    try {
		const { data: todayData, error: todayError } = await supabase.from("puzzles").select("*").eq("puzzle_date", utcToday).limit(1);

		if (todayError) throw todayError;

		if (todayData.length === 0) {
			const { data: recentData, error: recentError } = await supabase.from("puzzles").select("*").order("puzzle_date", { ascending: false }).limit(1);

			if (recentError) throw recentError;

			return new Response(JSON.stringify(recentData[0]), { status: 200, headers });
		}

		return new Response(JSON.stringify(todayData[0]), { status: 200, headers });
	} catch (error) {
		console.error("Error fetching puzzle data:", error);
		return new Response(JSON.stringify({ error: error.message }), { status: 500, headers });
	}
}

// Clear cache periodically
if (typeof global.clearCacheInterval === "undefined") {
    global.clearCacheInterval = setInterval(() => {
		cache = null;
		cacheTimestamp = null;
		console.log("Cache cleared periodically");
	}, CACHE_DURATION);
}