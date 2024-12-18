"use client";

import React from "react";
import { SignUp } from "@clerk/nextjs";
import { dark } from "@clerk/themes";
import { useTheme } from "next-themes";

export default function SignUpPage() {
	const { theme } = useTheme();

	return (
		<div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
			<div className="w-full max-w-md rounded-lg bg-white p-8 shadow-lg dark:bg-gray-800">
				<SignUp
					appearance={{
						baseTheme: theme === "dark" ? dark : undefined,
						elements: {
							formButtonPrimary: "bg-blue-500 hover:bg-blue-600 text-sm normal-case",
							card: "bg-transparent shadow-none",
						},
					}}
					afterSignUpUrl="/"
					signInUrl="/sign-in"
					routing="path"
				/>
			</div>
		</div>
	);
}
