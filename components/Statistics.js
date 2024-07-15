"use client";

import { useEffect, useState } from "react";

const Statistics = ({ userId }) => {
	const [stats, setStats] = useState(null);

	useEffect(() => {
		const fetchStatistics = async () => {
			const response = await fetch(`/api/statistics?userId=${userId}`);
			const data = await response.json();
			setStats(data);
		};

		fetchStatistics();
	}, [userId]);

	const chartData = Object.entries(stats.guess_distribution).map(([guess, count]) => ({
		guess,
		count,
	}));

	return (
		<div>
			<div className="flex justify-around mb-4">
				<div className="text-center">
					<p className="text-4xl">{stats.games_played}</p>
					<p>Played</p>
				</div>
				<div className="text-center">
					<p className="text-4xl">{stats.win_percentage}</p>
					<p>Win %</p>
				</div>
				<div className="text-center">
					<p className="text-4xl">{stats.current_streak}</p>
					<p>Current Streak</p>
				</div>
				<div className="text-center">
					<p className="text-4xl">{stats.max_streak}</p>
					<p>Max Streak</p>
				</div>
			</div>
			<h3 className="text-lg mb-2">Guess Distribution</h3>
			<div className="mt-4">
				{chartData.map((data, index) => (
					<div key={index} className="flex items-center mb-2">
						<span className="w-8 text-center text-white">{data.guess}</span>
						<div className="flex items-center w-full ml-2">
							<div className="bg-green-500 h-6 rounded" style={{ width: `${data.count * 10}%` }}></div>
							<span className="ml-2 text-white">{data.count}</span>
						</div>
					</div>
				))}
			</div>
		</div>
	);
};

export default Statistics;
