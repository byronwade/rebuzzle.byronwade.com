"use client";
import { useContext, useEffect } from "react";
import { useRouter } from "next/navigation";
import GameContext from "@/context/GameContext";
import GameCard from "@/components/GameCard";
import Header from "@/components/header";

const Loser = () => {
	const { gameData, gameOver } = useContext(GameContext);
	const router = useRouter();

	useEffect(() => {
		if (!gameOver) {
			router.push("/rebus");
		}
	}, [gameOver, router]);

	return (
		<div className="mb-8">
			<Header />
			<div className="container mx-auto px-4">
				{gameOver && (
					<div className="mt-4 text-center">
						<GameCard gameData={gameData} />
					</div>
				)}
			</div>
		</div>
	);
};

export default Loser;
