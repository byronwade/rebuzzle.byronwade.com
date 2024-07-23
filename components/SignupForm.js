"use client";

import { useForm } from "react-hook-form";
import { z } from "zod";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronLeft } from "react-feather";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { supabase } from "@/lib/supabaseClient";
import { useUser } from "@/context/UserContext";
import { trackEvent } from "@/lib/gtag";

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

const signupSchema = z.object({
	firstName: z.string().min(1, { message: "First name is required" }),
	lastName: z.string().min(1, { message: "Last name is required" }),
	username: z
		.string()
		.min(3, { message: "Username must be at least 3 characters" })
		.regex(/^[a-zA-Z0-9]+$/, { message: "Username can only contain letters and numbers" }),
	email: z.string().email({ message: "Invalid email address" }),
	password: z.string().min(6, { message: "Password must be at least 6 characters" }),
});

export function SignupForm() {
	const form = useForm({
		resolver: zodResolver(signupSchema),
		defaultValues: {
			firstName: "",
			lastName: "",
			username: "",
			email: "",
			password: "",
		},
	});

	const { setUser } = useUser();
	const router = useRouter();

	const handleSignup = async (values) => {
		try {
			const { data, error } = await supabase.auth.signUp({
				email: values.email,
				password: values.password,
				options: {
					data: {
						first_name: values.firstName,
						last_name: values.lastName,
						username: values.username,
					},
				},
			});
			if (error) {
				let errorMessage = error.message;
				if (error.message.includes("rate limit exceeded")) {
					errorMessage = "Email rate limit exceeded. Please try again later.";
				}
				form.setError("server", { type: "server", message: errorMessage });
			} else {
				form.clearErrors("server");
				setUser(data.user); // Update the user context
				trackEvent({
					action: "signup",
					category: "User",
					label: "Signup",
				});
				window.location.href = "/rebus"; // Redirect to the main page after successful signup
			}
		} catch (error) {
			form.setError("server", { type: "server", message: error.message });
		}
	};

	const handleBackButtonClick = () => {
		trackEvent({
			action: "click",
			category: "Button",
			label: "Back",
		});
		router.back();
	};

	return (
		<div className="mx-auto max-w-sm">
			<Button variant="link" onClick={handleBackButtonClick} className="mr-2 p-0">
				<ChevronLeft size={20} />
				<span className="ml-1">Back</span>
			</Button>
			<Card>
				<CardHeader>
					<CardTitle className="text-xl">Sign Up</CardTitle>
					<CardDescription>Enter your information to create an account</CardDescription>
				</CardHeader>
				<CardContent>
					<Form {...form}>
						<form onSubmit={form.handleSubmit(handleSignup)} className="space-y-6">
							<div className="grid grid-cols-2 gap-4">
								<FormField
									control={form.control}
									name="firstName"
									render={({ field }) => (
										<FormItem>
											<FormLabel>First Name</FormLabel>
											<FormControl>
												<Input placeholder="Max" {...field} />
											</FormControl>
											<FormMessage />
										</FormItem>
									)}
								/>
								<FormField
									control={form.control}
									name="lastName"
									render={({ field }) => (
										<FormItem>
											<FormLabel>Last Name</FormLabel>
											<FormControl>
												<Input placeholder="Robinson" {...field} />
											</FormControl>
											<FormMessage />
										</FormItem>
									)}
								/>
							</div>
							<FormField
								control={form.control}
								name="username"
								render={({ field }) => (
									<FormItem>
										<FormLabel>Username</FormLabel>
										<FormControl>
											<Input placeholder="johndoe" {...field} />
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
							<FormField
								control={form.control}
								name="password"
								render={({ field }) => (
									<FormItem>
										<FormLabel>Password</FormLabel>
										<FormControl>
											<Input type="password" {...field} />
										</FormControl>
										<FormMessage />
									</FormItem>
								)}
							/>
							{form.formState.errors.server && <p className="text-red-500">{form.formState.errors.server.message}</p>}
							<Button type="submit" className="w-full">
								Create an account
							</Button>
							<Button variant="outline" className="w-full">
								Sign up with Google
							</Button>
						</form>
					</Form>
					<div className="mt-4 text-center text-sm">
						Already have an account?{" "}
						<Link href="/login" className="underline">
							Sign in
						</Link>
					</div>
				</CardContent>
			</Card>
		</div>
	);
}