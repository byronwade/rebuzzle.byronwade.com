// components/SettingsForm.jsx

"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/lib/supabaseClient";
import { useUser } from "@/context/UserContext";
import { useTheme } from "next-themes";
import Link from "next/link";

const zodResolver = (schema) => {
	return async (data) => {
		try {
			const result = await schema.parseAsync(data);
			return { values: result, errors: {} };
		} catch (err) {
			const errors = err.formErrors.fieldErrors;
			return {
				values: {},
				errors: Object.keys(errors).reduce((acc, key) => {
					acc[key] = { type: "manual", message: errors[key][0] };
					return acc;
				}, {}),
			};
		}
	};
};

const settingsSchema = z.object({
	username: z.string().min(3, { message: "Username must be at least 3 characters" }),
	email: z.string().email({ message: "Invalid email address" }),
	notifications: z.boolean(),
	darkMode: z.boolean(),
	emailUpdates: z.boolean(),
	soundEffects: z.boolean(),
	music: z.boolean(),
});

export function SettingsForm() {
	const form = useForm({
		resolver: zodResolver(settingsSchema),
		defaultValues: {
			username: "",
			email: "",
			notifications: true,
			darkMode: false,
			emailUpdates: true,
			soundEffects: true,
			music: true,
		},
	});

	const { user, setUser } = useUser();
	const { theme, setTheme, systemTheme } = useTheme();

	useEffect(() => {
		const storedTheme = localStorage.getItem("darkMode");
		if (storedTheme !== null) {
			form.setValue("darkMode", storedTheme === "true");
		} else if (systemTheme) {
			form.setValue("darkMode", systemTheme === "dark");
		}
	}, [systemTheme]);

	const handleSettingsUpdate = async (values) => {
		try {
			// Update username
			const { error: userError } = await supabase.from("profiles").update({ username: values.username }).eq("id", user.id);

			if (userError) {
				form.setError("server", { type: "server", message: userError.message });
			} else {
				form.clearErrors("server");
				setUser((prevUser) => ({ ...prevUser, username: values.username })); // Update the user context

				// Send email update link if the email has changed
				if (values.email !== user.email) {
					const { error: emailError } = await supabase.auth.updateUser({ email: values.email });
					if (emailError) {
						form.setError("server", { type: "server", message: emailError.message });
					} else {
						alert("Email update link sent successfully");
					}
				}

				alert("Settings updated successfully");
			}

			// Update theme
			setTheme(values.darkMode ? "dark" : "light");
			localStorage.setItem("darkMode", values.darkMode); // Store the preference in local storage
		} catch (error) {
			form.setError("server", { type: "server", message: error.message });
		}
	};

	return (
		<>
			<h2 className="text-2xl font-bold">Settings</h2>
			<Form {...form}>
				<form onSubmit={form.handleSubmit(handleSettingsUpdate)} className="space-y-6">
					<FormField
						control={form.control}
						name="username"
						render={({ field }) => (
							<FormItem>
								<FormLabel>Username</FormLabel>
								<FormControl>
									<Input placeholder="Your username" {...field} />
								</FormControl>
								<FormMessage />
							</FormItem>
						)}
					/>
					<FormField
						control={form.control}
						name="email"
						render={({ field }) => (
							<FormItem>
								<FormLabel>Email</FormLabel>
								<FormControl>
									<Input placeholder="m@example.com" {...field} />
								</FormControl>
								<FormMessage />
							</FormItem>
						)}
					/>
					<FormItem>
						<FormLabel>Password</FormLabel>
						<div className="text-left">
							<Link href="/reset-password" className="text-blue-500 underline text-sm">
								Reset Password
							</Link>
						</div>
					</FormItem>
					<hr className="my-4" />
					<FormField
						control={form.control}
						name="notifications"
						render={({ field }) => (
							<FormItem className="flex items-center justify-between">
								<FormLabel>Enable Notifications</FormLabel>
								<FormControl>
									<Switch checked={field.value} onCheckedChange={field.onChange} />
								</FormControl>
								<FormMessage />
							</FormItem>
						)}
					/>
					<FormField
						control={form.control}
						name="darkMode"
						render={({ field }) => (
							<FormItem className="flex items-center justify-between">
								<FormLabel>Dark Mode</FormLabel>
								<FormControl>
									<Switch
										checked={field.value}
										onCheckedChange={(value) => {
											field.onChange(value);
											setTheme(value ? "dark" : "light");
											localStorage.setItem("darkMode", value); // Store the preference in local storage
										}}
									/>
								</FormControl>
								<FormMessage />
							</FormItem>
						)}
					/>
					<FormField
						control={form.control}
						name="emailUpdates"
						render={({ field }) => (
							<FormItem className="flex items-center justify-between">
								<FormLabel>Email Updates</FormLabel>
								<FormControl>
									<Switch checked={field.value} onCheckedChange={field.onChange} />
								</FormControl>
								<FormMessage />
							</FormItem>
						)}
					/>
					{/* <FormField
						control={form.control}
						name="soundEffects"
						render={({ field }) => (
							<FormItem className="flex items-center justify-between">
								<FormLabel>Sound Effects</FormLabel>
								<FormControl>
									<Switch checked={field.value} onCheckedChange={field.onChange} />
								</FormControl>
								<FormMessage />
							</FormItem>
						)}
					/>
					<FormField
						control={form.control}
						name="music"
						render={({ field }) => (
							<FormItem className="flex items-center justify-between">
								<FormLabel>Background Music</FormLabel>
								<FormControl>
									<Switch checked={field.value} onCheckedChange={field.onChange} />
								</FormControl>
								<FormMessage />
							</FormItem>
						)}
					/> */}
					{form.formState.errors.server && <p className="text-red-500">{form.formState.errors.server.message}</p>}
					<Button type="submit" className="w-full">
						Update Settings
					</Button>
				</form>
			</Form>
		</>
	);
}
