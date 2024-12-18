"use client";

import React from "react";
import { SignUp } from "@clerk/nextjs";

export default function SignUpPage() {
	return (
		<div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
			<SignUp
				appearance={{
					elements: {
						formButtonPrimary: "bg-blue-500 hover:bg-blue-600 text-sm normal-case",
						card: "bg-transparent shadow-none",
					},
				}}
				signInUrl="/sign-in"
				routing="path"
				path="/sign-up"
			/>
		</div>
	);
}
