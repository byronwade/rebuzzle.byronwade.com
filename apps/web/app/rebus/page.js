"use client";
import Game from "@/components/game";
import Header from "@/components/header";
import { GameProvider } from "@/context/GameContext";

const App = () => {
	return (
		<GameProvider>
			<div className="mb-8">
				<Header />
				<Game />
			</div>
		</GameProvider>
	);
};

export default App;
