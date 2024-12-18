"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Trophy } from "lucide-react";

interface LeaderboardEntry {
	name: string;
	score: number;
	avatar: string;
}

export function NewLeaderboard() {
	const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);

	useEffect(() => {
		// In a real application, fetch this data from your API
		setLeaderboard([
			{ name: "Alice", score: 1000, avatar: "/avatars/alice.svg" },
			{ name: "Bob", score: 950, avatar: "/avatars/bob.svg" },
			{ name: "Charlie", score: 900, avatar: "/avatars/charlie.svg" },
			{ name: "David", score: 850, avatar: "/avatars/david.svg" },
			{ name: "Eve", score: 800, avatar: "/avatars/eve.svg" },
		]);
	}, []);

	return (
		<Card>
			<CardHeader>
				<CardTitle className="flex items-center">
					<Trophy className="mr-2 h-5 w-5 text-yellow-500" />
					Leaderboard
				</CardTitle>
			</CardHeader>
			<CardContent>
				<ul className="space-y-4">
					{leaderboard.map((entry, index) => (
						<li key={entry.name} className="flex items-center space-x-4">
							<span className="font-bold text-lg w-6">{index + 1}.</span>
							<Avatar>
								<AvatarImage src={entry.avatar} alt={entry.name} />
								<AvatarFallback>{entry.name[0]}</AvatarFallback>
							</Avatar>
							<span className="flex-grow">{entry.name}</span>
							<span className="font-semibold">{entry.score}</span>
						</li>
					))}
				</ul>
			</CardContent>
		</Card>
	);
}
