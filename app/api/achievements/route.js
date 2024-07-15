import { supabase } from "@/lib/supabaseClient";

export async function GET(request) {
	const url = new URL(request.url);
	const userId = url.searchParams.get("userId");

	const { data, error } = await supabase.from("achievements").select("*").eq("user_id", userId);

	if (error) {
		return new Response(JSON.stringify({ error: error.message }), { status: 500 });
	}

	return new Response(JSON.stringify(data), { status: 200 });
}
