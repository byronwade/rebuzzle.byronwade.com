'use client'

import { Button } from '@/components/ui/button'
import { SignInButton, SignUpButton } from "@clerk/nextjs";

export function LoginPrompt() {
	return (
		<div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
			<p className="text-gray-700 mb-2">Want to see your name on the leaderboard?</p>
			<div className="space-x-2">
				<SignInButton mode="modal">
					<Button variant="default">Log in</Button>
				</SignInButton>
				<SignUpButton mode="modal">
					<Button variant="outline">Sign up</Button>
				</SignUpButton>
			</div>
		</div>
	);
}

