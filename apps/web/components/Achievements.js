import { useEffect, useState } from "react";

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
		<div>
			<h2>Achievements</h2>
			<ul>
				{achievements.map((achievement) => (
					<li key={achievement.id}>
						{achievement.achievement_name} - {new Date(achievement.achievement_date).toLocaleDateString()}
					</li>
				))}
			</ul>
		</div>
	);
};

export default Achievements;
