"use client";

import { useForm } from "react-hook-form";
import { z } from "zod";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { supabase } from "@/lib/supabaseClient";
import { useUser } from "@/context/UserContext";
import { useRouter } from "next/navigation";
import { ChevronLeft } from "react-feather";

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
	emailOrUsername: z.string().nonempty({ message: "Email or Username is required" }),
	password: z.string().min(6, { message: "Password must be at least 6 characters" }),
});

export function LoginForm() {
	const form = useForm({
		resolver: zodResolver(loginSchema),
		defaultValues: {
			emailOrUsername: "",
			password: "",
		},
	});

	const { setUser } = useUser();
	const router = useRouter();

	const handleLogin = async (values) => {
		try {
			const isEmail = values.emailOrUsername.includes("@");
			const loginMethod = isEmail ? { email: values.emailOrUsername, password: values.password } : { username: values.emailOrUsername, password: values.password };

			const { data, error } = await (isEmail
				? supabase.auth.signInWithPassword(loginMethod)
				: supabase
						.from("profiles")
						.select("id, password")
						.eq("username", values.emailOrUsername)
						.single()
						.then(async ({ data: user, error }) => {
							if (error) throw error;
							const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
								email: user.id,
								password: values.password,
							});
							if (signInError) throw signInError;
							return { data: signInData };
						}));

			if (error) {
				form.setError("server", { type: "server", message: error.message });
			} else {
				form.clearErrors("server");
				setUser(data.user); // Update the user context
				router.push("/rebus"); // Use router.push for client-side navigation
			}
		} catch (error) {
			form.setError("server", { type: "server", message: error.message });
		}
	};

	return (
		<div className="mx-auto max-w-sm">
			<Button variant="link" onClick={() => router.back()} className="mr-2 p-0">
				<ChevronLeft size={20} />
				<span className="ml-1">Back</span>
			</Button>
			<Card className="mx-auto max-w-sm">
				<CardHeader>
					<CardTitle className="text-2xl">Login</CardTitle>
					<CardDescription>Enter your email or username below to login to your account</CardDescription>
				</CardHeader>
				<CardContent>
					<Form {...form}>
						<form onSubmit={form.handleSubmit(handleLogin)} className="space-y-8">
							<FormField
								control={form.control}
								name="emailOrUsername"
								render={({ field }) => (
									<FormItem>
										<FormLabel>Email or Username</FormLabel>
										<FormControl>
											<Input placeholder="m@example.com or username" {...field} inputMode="none" />
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
											<Input type="password" {...field} inputMode="none" />
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
						<Link href="/signup" className="underline">
							Sign up
						</Link>
					</div>
				</CardContent>
			</Card>
		</div>
	);
}