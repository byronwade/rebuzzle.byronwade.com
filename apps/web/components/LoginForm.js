"use client";

import { useForm } from "react-hook-form";
import { z } from "zod";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { supabase } from "shared-utils"; // Ensure this is the correct path to your Supabase client

// Custom zod resolver implementation
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

const loginSchema = z.object({
	email: z.string().email({ message: "Invalid email address" }),
	password: z.string().min(6, { message: "Password must be at least 6 characters" }),
});

export function LoginForm() {
	const form = useForm({
		resolver: zodResolver(loginSchema),
		defaultValues: {
			email: "",
			password: "",
		},
	});

	const handleLogin = async (values) => {
		try {
			const { data, error } = await supabase.auth.signInWithPassword({
				email: values.email,
				password: values.password,
			});
			if (error) {
				form.setError("server", { type: "server", message: error.message });
			} else {
				form.clearErrors("server");
				alert("Login successful!");
				window.location.href = "/"; // Redirect to the main page after successful login
			}
		} catch (error) {
			form.setError("server", { type: "server", message: error.message });
		}
	};

	return (
		<Card className="mx-auto max-w-sm">
			<CardHeader>
				<CardTitle className="text-2xl">Login</CardTitle>
				<CardDescription>Enter your email below to login to your account</CardDescription>
			</CardHeader>
			<CardContent>
				<Form {...form}>
					<form onSubmit={form.handleSubmit(handleLogin)} className="space-y-8">
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
							Login
						</Button>
						<Button variant="outline" className="w-full">
							Login with Google
						</Button>
					</form>
				</Form>
				<div className="mt-4 text-center text-sm">
					Don&apos;t have an account?{" "}
					<Link href="#" className="underline">
						Sign up
					</Link>
				</div>
			</CardContent>
		</Card>
	);
}
