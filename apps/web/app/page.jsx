// pages/index.js
"use client";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function Home() {
	const gameVersion = "v1.0.0"; // Update this with the actual version

	return (
		<div className="flex items-center justify-center min-h-screen bg-gray-100">
			<div className="text-center">
				<h1 className="text-6xl font-bold">Rebuzzle</h1>
				<p className="text-gray-500 mb-4">Rebus Puzzles</p>
				<p className="text-lg mb-8">Unravel the Picture, Reveal the Phrase!</p>
				<div className="space-x-4">
					<Link href="/rebus?guest=true">
						<Button className="bg-gray-700 text-white px-4 py-2 rounded-md">Play as Guest</Button>
					</Link>
					<Link href="/rebus">
						<Button className="bg-green-700 text-white px-4 py-2 rounded-md">Play Logged In</Button>
					</Link>
				</div>
				<div className="space-x-4 mt-4">
					<Link href="/signup">
						<Button className="bg-black text-white px-4 py-2 rounded-md">Signup</Button>
					</Link>
				</div>
				<p className="text-gray-500 mt-4">{gameVersion}</p>
			</div>
		</div>
	);
}
