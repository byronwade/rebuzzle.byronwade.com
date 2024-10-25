"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Switch } from "@/components/ui/switch";
import { useTheme } from "next-themes";
import Link from "next/link";
import { trackEvent } from "@/lib/gtag";
import { updateSettings, getUserSettings } from "@/actions/auth"; // Server actions

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
		},
	});

	const { theme, setTheme, systemTheme } = useTheme();

	// Fetch user settings from server action
	useEffect(() => {
		async function fetchSettings() {
			const settings = await getUserSettings();
			if (settings) {
				form.setValue("username", settings.username || "");
				form.setValue("email", settings.email || "");
				form.setValue("notifications", settings.notifications || true);
				form.setValue("darkMode", settings.darkMode || false);
				form.setValue("emailUpdates", settings.emailUpdates || true);
			}
		}

		fetchSettings();
	}, []);

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
			await updateSettings(values); // Call the server action to update settings

			// Update theme and local storage for dark mode
			setTheme(values.darkMode ? "dark" : "light");
			localStorage.setItem("darkMode", values.darkMode.toString());

			alert("Settings updated successfully");

			// Track form submission
			trackEvent({
				action: "update_settings",
				category: "Settings",
				label: "Settings Updated",
			});
		} catch (error) {
			form.setError("server", { type: "server", message: error.message });
		}
	};

	const handleFieldChange = (field, value) => {
		trackEvent({
			action: "edit_field",
			category: "Settings",
			label: field,
			value: value,
		});
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
									<Input
										placeholder="Your username"
										{...field}
										onChange={(e) => {
											field.onChange(e);
											handleFieldChange("username", e.target.value);
										}}
									/>
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
									<Input
										placeholder="m@example.com"
										{...field}
										onChange={(e) => {
											field.onChange(e);
											handleFieldChange("email", e.target.value);
										}}
									/>
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
									<Switch
										checked={field.value}
										onCheckedChange={(value) => {
											field.onChange(value);
											handleFieldChange("notifications", value);
										}}
									/>
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
											localStorage.setItem("darkMode", value.toString());
											handleFieldChange("darkMode", value);
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
									<Switch
										checked={field.value}
										onCheckedChange={(value) => {
											field.onChange(value);
											handleFieldChange("emailUpdates", value);
										}}
									/>
								</FormControl>
								<FormMessage />
							</FormItem>
						)}
					/>
					{form.formState.errors.server && <p className="text-red-500">{form.formState.errors.server.message}</p>}
					<Button type="submit" className="w-full">
						Update Settings
					</Button>
				</form>
			</Form>
		</>
	);
}