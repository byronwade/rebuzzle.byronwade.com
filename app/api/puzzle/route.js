// app/api/puzzle/route.js
import { supabase } from "@/lib/supabaseClient";
import { NextResponse } from "next/server";

const CACHE_DURATION = 10 * 60 * 1000; // 10 minutes
global.cache = global.cache || null;
global.cacheTimestamp = global.cacheTimestamp || null;

export async function GET() {
	const now = new Date();
	const localToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString().split("T")[0];

	const headers = {
		"Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
		Pragma: "no-cache",
		Expires: "0",
		"Surrogate-Control": "no-store",
	};

	if (global.cache && now - global.cacheTimestamp < CACHE_DURATION) {
		return NextResponse.json(global.cache, { status: 200, headers });
	}

	try {
		console.log("Current local date:", localToday);

		const { data: todayData, error: todayError } = await supabase.from("puzzles").select("*").eq("puzzle_date", localToday).limit(1);

		if (todayError) throw todayError;

		if (todayData.length === 0) {
			const { data: recentData, error: recentError } = await supabase.from("puzzles").select("*").order("puzzle_date", { ascending: false }).limit(1);

			if (recentError) throw recentError;

			global.cache = recentData[0];
			global.cacheTimestamp = now;

			return NextResponse.json(recentData[0], { status: 200, headers });
		}

		global.cache = todayData[0];
		global.cacheTimestamp = now;

		return NextResponse.json(todayData[0], { status: 200, headers });
	} catch (error) {
		console.error("Error fetching puzzle data:", error);
		return NextResponse.json({ error: error.message }, { status: 500, headers });
	}
}
