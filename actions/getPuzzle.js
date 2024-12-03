"use server";
import { createClient } from "@/utils/supabase/server";

export async function getPuzzle() {
	const supabase = createClient();

	const today = new Date();
	const localToday = new Date(today.getTime() - today.getTimezoneOffset() * 60000).toISOString().split("T")[0];

	const { data: todayData, error: todayError } = await supabase.from("puzzles").select("*").eq("puzzle_date", localToday).limit(1);

	if (todayError) throw todayError;

	if (todayData.length === 0) {
		const { data: recentData, error: recentError } = await supabase.from("puzzles").select("*").order("puzzle_date", { ascending: false }).limit(1);

		if (recentError) throw recentError;

		return recentData[0];
	}

	return todayData[0];
}
