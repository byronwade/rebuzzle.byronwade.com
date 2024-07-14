import { useEffect, useState } from "react";
import { Card, CardHeader, CardContent, CardTitle, CardDescription } from "@/components/ui/card";

const Leaderboard = () => {
	const [leaderboard, setLeaderboard] = useState([]);

	useEffect(() => {
		const fetchLeaderboard = async () => {
			const response = await fetch("/api/leaderboard");
			const data = await response.json();
			setLeaderboard(data);
		};

		fetchLeaderboard();
	}, []);

	return (
		<div className="w-96 mx-auto overflow-hidden shadow-lg">
			<Card>
				<CardHeader>
					<CardTitle>Leaderboard</CardTitle>
					<CardDescription>Top players with highest scores</CardDescription>
				</CardHeader>
				<CardContent>
					<div>
						{leaderboard.map((entry) => (
							<div key={entry.id} className="mb-2">
								<div className="font-bold text-sm">{entry.username ? entry.username : entry.user_id}</div>
								<div className="text-gray-500 text-xs">{entry.score} points</div>
							</div>
						))}
					</div>
				</CardContent>
			</Card>
		</div>
	);
};

export default Leaderboard;