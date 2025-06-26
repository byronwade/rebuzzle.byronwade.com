'use client'

import { Button } from "@/components/ui/button";

export function LoginPrompt() {
	return (
		<div className="p-4 mt-4 bg-blue-50 rounded-lg border border-blue-200">
			<p className="mb-2 text-gray-700">🎮 This is a demo version of Rebuzzle!</p>
			<p className="text-sm text-gray-600">Authentication is disabled for demonstration purposes. Enjoy playing the puzzle game!</p>
		</div>
	);
}

