"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createClient } from "@/utils/supabase/server";

export async function login(formData) {
	const supabase = createClient(); // Ensure you provide Supabase URL and Anon Key

	console.log(formData);
	// Extracting and validating form data
	const email = formData.emailOrUsername?.toString().trim();
	const password = formData.password?.toString().trim();

	if (!email || !password) {
		// Handle missing fields
		return redirect("/error?message=Missing+credentials");
	}

	const { error } = await supabase.auth.signInWithPassword({ email, password });

	if (error) {
		console.error("Login failed:", error.message);
		return redirect("/error?message=" + encodeURIComponent(error.message));
	}

	console.log("Logged in");
	// Revalidate path if necessary
	revalidatePath("/rebus");

	// Redirect to home page or another page on success
	return redirect("/rebus");
}

export async function signup(formData) {
	const supabase = createClient();

	// type-casting here for convenience
	// in practice, you should validate your inputs
	const data = {
		email: formData.get("email"),
		password: formData.get("password"),
	};

	const { error } = await supabase.auth.signUp(data);

	if (error) {
		redirect("/error");
	}

	revalidatePath("/", "layout");
	redirect("/");
}

export async function logout() {
	const supabase = createClient();

	await supabase.auth.signOut();

	console.log("Logged out");
	revalidatePath("/", "layout");
	redirect("/");
}

export async function forgotPassword(formData) {
	const supabase = createClient();

	// type-casting here for convenience
	// in practice, you should validate your inputs
	const data = {
		email: formData.get("email"),
	};

	const { error } = await supabase.auth.api.resetPasswordForEmail(data.email);

	if (error) {
		redirect("/error");
	}

	redirect("/login");
}

export async function resetPassword(formData) {
	const supabase = createClient();

	// type-casting here for convenience
	// in practice, you should validate your inputs
	const data = {
		email: formData.get("email"),
		password: formData.get("password"),
		token: formData.get("token"),
	};

	const { error } = await supabase.auth.api.updateUser(data);

	if (error) {
		redirect("/error");
	}

	redirect("/login");
}

export async function getUser() {
	const supabase = createClient();

	const { data: user } = await supabase.auth.getUser();

	return user.user;
}

export async function getUserSettings() {
	const supabase = createClient();

	const { data: user, error } = await supabase.auth.getUser();

	if (error) {
		throw new Error("Failed to fetch user settings");
	}

	// Fetch user settings from the database
	const { data: settings, error: settingsError } = await supabase.from("profiles").select("username, email, notifications, darkMode, emailUpdates").eq("id", user.id).single();

	if (settingsError) {
		throw new Error("Failed to fetch user settings");
	}

	return settings;
}

export async function updateSettings(formData) {
	const supabase = createClient();

	try {
		const { data: user } = await supabase.auth.getUser();

		// Update user settings in the database
		const { error: userError } = await supabase
			.from("profiles")
			.update({
				username: formData.username,
				notifications: formData.notifications,
				darkMode: formData.darkMode,
				emailUpdates: formData.emailUpdates,
			})
			.eq("id", user.id);

		if (userError) {
			throw new Error(userError.message);
		}

		// Update email if it has changed
		if (formData.email !== user.email) {
			const { error: emailError } = await supabase.auth.updateUser({ email: formData.email });
			if (emailError) {
				throw new Error(emailError.message);
			}
		}

		revalidatePath("/settings");

		redirect("/settings");
	} catch (error) {
		throw new Error(error.message);
	}
}
