import Image from "next/image";

// components/GameCard.jsx
const GameCard = ({ gameData }) => {
	if (!gameData) {
		return null; // Or return a loading indicator or a message
	}

	const { solution: phrase, image_url: image, explanation } = gameData;

	return (
		<div className="p-4 w-96 h-full m-auto text-center">
			<Image src={image} alt="Puzzle" width={500} height={500} className="w-80 h-auto m-auto"/>
			<h2 className="text-2xl font-bold mt-2">{phrase}</h2>
			<p className="mt-2">{explanation}</p>
		</div>
	);
};

export default GameCard;
