import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function Home() {
	return (
		<div className="flex items-center justify-center min-h-screen bg-gray-100">
			<div className="text-center">
				<h1 className="text-6xl font-bold mb-4">Rebus Puzzles</h1>
				<p className="text-lg mb-8">Unravel the Picture, Reveal the Phrase!</p>
				<div className="space-x-4">
					{/* <Link href="/">
						<Button className="px-4 py-2 rounded-md">Login</Button>
					</Link> */}
					<Link href="/rebus">
						<Button className="bg-green-700 text-white px-4 py-2 rounded-md">Play</Button>
					</Link>
				</div>
			</div>
		</div>
	);
}
