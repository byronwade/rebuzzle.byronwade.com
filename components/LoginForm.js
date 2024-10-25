import Link from "next/link";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";

// UI Components
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";

//icons
import { ChevronLeft } from "react-feather";

//server actions
import { login } from "@/actions/auth";

// Define Zod schema
const loginSchema = z.object({
	emailOrUsername: z.string().min(1, "Email or username is required"),
	password: z.string().min(1, "Password is required"),
});

export function LoginForm() {
	// Initialize useForm with zodResolver and the schema
	const form = useForm({
		resolver: zodResolver(loginSchema),
		defaultValues: {
			emailOrUsername: "",
			password: "",
		},
	});

	return (
		// skipcq: JS-0415
		<div className="mx-auto max-w-sm">
			<Button variant="link" className="mr-2 p-0">
				<ChevronLeft size={20} />
				<span className="ml-1">Back</span>
			</Button>
			<Card className="mx-auto max-w-sm">
				<CardHeader>
					<CardDescription>Enter your email or username below to login to your account</CardDescription>
				</CardHeader>
				<CardContent>
					{/* Connect Form with useForm instance */}
					<Form {...form}>
						<form onSubmit={form.handleSubmit((data) => login(data))} className="space-y-8">
							<FormField
								control={form.control}
								name="emailOrUsername"
								// skipcq: JS-0417
								render={({ field }) => (
									<FormItem>
										<FormLabel>Email or Username</FormLabel>
										<FormControl>
											<Input placeholder="m@example.com or username" {...field} />
										</FormControl>
										<FormMessage />
									</FormItem>
								)}
							/>
							<FormField
								control={form.control}
								name="password"
								// skipcq: JS-0417
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
