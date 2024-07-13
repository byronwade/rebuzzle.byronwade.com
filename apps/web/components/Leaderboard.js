import { useEffect, useState } from "react";

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
		<div>
			<h2>Leaderboard</h2>
			<ul>
				{leaderboard.map((entry) => (
					<li key={entry.id}>
						{entry.user_id}: {entry.score} points
					</li>
				))}
			</ul>
		</div>
	);
};

export default Leaderboard;
