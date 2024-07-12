import { supabase } from "shared-utils";

export async function GET(request) {
	// Get the current date and time
	const now = new Date();

	// Adjust the date to the local timezone and format it as YYYY-MM-DD
	const localToday = new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().split("T")[0];

	const { data: todayData, error: todayError } = await supabase.from("puzzles").select("*").eq("puzzle_date", localToday).limit(1);

	const headers = {
		"Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
		Pragma: "no-cache",
		Expires: "0",
		"Surrogate-Control": "no-store",
	};

	if (todayError) {
		return new Response(JSON.stringify({ error: todayError.message }), { status: 500, headers });
	}

	if (todayData.length === 0) {
		const { data: recentData, error: recentError } = await supabase.from("puzzles").select("*").order("puzzle_date", { ascending: false }).limit(1);

		if (recentError) {
			return new Response(JSON.stringify({ error: recentError.message }), { status: 500, headers });
		}

		return new Response(JSON.stringify(recentData[0]), { status: 200, headers });
	}

	return new Response(JSON.stringify(todayData[0]), { status: 200, headers });
}
