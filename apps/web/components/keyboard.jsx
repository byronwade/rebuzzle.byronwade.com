// File: src/components/Keyboard.js or src/components/Keyboard/index.js
import React from "react";
import { Button } from "@/components/ui/button";
import { useKeyboard } from "@/context/KeyboardContext";

const keys1 = ["Q", "W", "E", "R", "T", "Y", "U", "I", "O", "P"];
const keys2 = ["A", "S", "D", "F", "G", "H", "J", "K", "L"];
const keys3 = ["Z", "X", "C", "V", "B", "N", "M"];

const Key = ({ keyValue, onClick, variant }) => (
	<Button className="flex justify-center items-center rounded-md m-1 p-2 sm:p-3 md:p-4" variant={variant} onClick={() => onClick(keyValue)}>
		{keyValue}
	</Button>
);

const Keyboard = () => {
	const { handleKeyPress } = useKeyboard();

	return (
		<div className="flex flex-col items-center mt-4 w-full max-w-lg mx-auto px-2">
			<div className="flex justify-center w-full">
				{keys1.map((key) => (
					<Key key={key} keyValue={key} onClick={handleKeyPress} />
				))}
			</div>
			<div className="flex justify-center w-full mt-1">
				{keys2.map((key) => (
					<Key key={key} keyValue={key} onClick={handleKeyPress} />
				))}
			</div>
			<div className="flex justify-center w-full mt-1">
				{keys3.map((key) => (
					<Key key={key} keyValue={key} onClick={handleKeyPress} />
				))}
			</div>
			<div className="flex justify-center w-full mt-2 space-x-1 sm:space-x-2 md:space-x-3">
				<Key keyValue="Enter" onClick={handleKeyPress} variant="brand" />
				<Key keyValue="Backspace" onClick={handleKeyPress} />
			</div>
		</div>
	);
};

export default Keyboard;
