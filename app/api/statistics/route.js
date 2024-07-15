// pages/api/statistics.js
import { supabase } from "@/lib/supabaseClient";

export async function GET(request) {
	const { searchParams } = new URL(request.url);
	const userId = searchParams.get("userId");

	if (!userId) {
		return new Response(JSON.stringify({ error: "User ID is required" }), { status: 400 });
	}

	const { data, error } = await supabase.from("statistics").select("*").eq("user_id", userId).single();

	if (error) {
		return new Response(JSON.stringify({ error: error.message }), { status: 500 });
	}

	return new Response(JSON.stringify(data), { status: 200 });
}
