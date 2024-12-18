import React from "react";
import { Metadata } from "next";

export const metadata: Metadata = {
	title: "Authentication - Rebuzzle",
	description: "Sign in or sign up to play Rebuzzle",
};

export default function AuthLayout({ children }: { children: React.ReactNode }) {
	return <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">{children}</div>;
}
