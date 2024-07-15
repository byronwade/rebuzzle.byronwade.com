import { supabase } from "@/lib/supabaseClient";

export async function GET(request) {
	const { data, error } = await supabase.from("leaderboard").select("*").order("score", { ascending: false }).limit(10);

	if (error) {
		return new Response(JSON.stringify({ error: error.message }), { status: 500 });
	}

	return new Response(JSON.stringify(data), { status: 200 });
}
