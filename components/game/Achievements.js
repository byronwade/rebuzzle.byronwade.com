"use client";
import { useEffect, useState } from "react";
import { Card, CardHeader, CardContent, CardTitle, CardDescription } from "@/components/ui/card";

const Achievements = ({ userId }) => {
	const [achievements, setAchievements] = useState([]);

	useEffect(() => {
		const fetchAchievements = async () => {
			const response = await fetch(`/api/achievements?userId=${userId}`);
			const data = await response.json();
			setAchievements(data);
		};

		fetchAchievements();
	}, [userId]);

	return (
		<div className="w-96 mx-auto overflow-hidden shadow-lg mb-4">
			<Card>
				<CardHeader>
					<CardTitle>Achievements</CardTitle>
					<CardDescription>Here are your latest achievements</CardDescription>
				</CardHeader>
				<CardContent>
					<div>
						{achievements.map((achievement) => (
							<div key={achievement.id}>
								<div>{achievement.achievement_name}</div>
								<div size="sm" color="gray">
									{new Date(achievement.achievement_date).toLocaleDateString()}
								</div>
							</div>
						))}
					</div>
				</CardContent>
			</Card>
		</div>
	);
};

export default Achievements;
