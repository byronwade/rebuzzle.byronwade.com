"use client";

import React from "react";
import { SignIn } from "@clerk/nextjs";
import { useTheme } from "next-themes";

export default function SignInPage() {
	const { theme } = useTheme();

	return (
		<div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
			<SignIn
				appearance={{
					elements: {
						formButtonPrimary: "bg-blue-500 hover:bg-blue-600 text-sm normal-case",
						card: "bg-transparent shadow-none",
					},
				}}
				afterSignInUrl="/"
				signUpUrl="/sign-up"
				routing="path"
			/>
		</div>
	);
}
