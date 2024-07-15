import { supabase } from "@/lib/supabaseClient"; // Ensure the correct path

export async function GET(request) {
	try {
		const {
			data: { user },
			error,
		} = await supabase.auth.getUser();

		if (error) {
			console.error("Error fetching user data:", error);
			return new Response(JSON.stringify({ error: "Failed to fetch user data" }), { status: 500 });
		}

		if (!user) {
			return new Response(JSON.stringify({ error: "Not authenticated" }), {
				status: 401,
			});
		}

		console.log("User data fetched successfully:", user);
		return new Response(JSON.stringify(user), { status: 200 });
	} catch (error) {
		console.error("Error:", error);
		return new Response(JSON.stringify({ error: error.message }), {
			status: 500,
		});
	}
}

export async function POST(request) {
	try {
		const { email, password, action, otp, phone, provider, token } = await request.json();

		let data, error;

		switch (action) {
			case "signUp":
				({ data, error } = await supabase.auth.signUp({
					email,
					password,
				}));
				break;
			case "signIn":
				({ data, error } = await supabase.auth.signInWithPassword({
					email,
					password,
				}));
				break;
			case "signInWithOtp":
				({ data, error } = await supabase.auth.signInWithOtp({
					email,
				}));
				break;
			case "signInWithPhone":
				({ data, error } = await supabase.auth.signUp({
					phone,
					password,
				}));
				break;
			case "verifyOtp":
				({ data, error } = await supabase.auth.verifyOtp({
					phone,
					token: otp,
					type: "sms",
				}));
				break;
			case "signInWithOAuth":
				({ data, error } = await supabase.auth.signInWithOAuth({
					provider,
				}));
				break;
			case "resetPassword":
				({ data, error } = await supabase.auth.resetPasswordForEmail(email));
				break;
			case "updateUser":
				({ data, error } = await supabase.auth.updateUser({
					email,
					password,
					data: { hello: "world" },
				}));
				break;
			case "signOut":
				error = await supabase.auth.signOut();
				break;
			default:
				throw new Error("Invalid action");
		}

		if (error) {
			console.error("Error performing action:", error);
			return new Response(JSON.stringify({ error: error.message }), {
				status: 500,
			});
		}

		console.log("Action performed successfully:", data);
		return new Response(JSON.stringify(data), { status: 200 });
	} catch (error) {
		console.error("Error:", error);
		return new Response(JSON.stringify({ error: error.message }), {
			status: 500,
		});
	}
}
