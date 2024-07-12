import Image from "next/image";

const GameCard = ({ gameData }) => {
	const { phrase, image, explanation } = gameData;

	return (
		<div className="p-4 border rounded-md shadow-md bg-white center">
			<Image src={image} alt="Rebus" width={100} height={100} className="rounded-md mt-2 m-auto" />
			<p>{phrase}</p>
			<p>{explanation}</p>
		</div>
	);
};

export default GameCard;
