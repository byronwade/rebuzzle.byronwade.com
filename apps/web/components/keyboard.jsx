import React from "react";
import { Button } from "./ui/button";

const keys1 = ["Q", "W", "E", "R", "T", "Y", "U", "I", "O", "P"];
const keys2 = ["A", "S", "D", "F", "G", "H", "J", "K", "L"];
const keys3 = ["Z", "X", "C", "V", "B", "N", "M"];

const Key = ({ keyValue, onClick }) => (
	<Button className="flex justify-center items-center rounded-md m-1" onClick={() => onClick(keyValue)}>
		{keyValue}
	</Button>
);

const Keyboard = ({ onKeyPress }) => {
	return (
		<div className="flex flex-col items-center mt-4">
			<div className="flex">
				{keys1.map((key) => (
					<Key key={key} keyValue={key} onClick={onKeyPress} />
				))}
			</div>
			<div className="flex">
				{keys2.map((key) => (
					<Key key={key} keyValue={key} onClick={onKeyPress} />
				))}
			</div>
			<div className="flex">
				{keys3.map((key) => (
					<Key key={key} keyValue={key} onClick={onKeyPress} />
				))}
			</div>
			<div className="flex mt-2">
				<Key keyValue="Enter" onClick={onKeyPress} />
				<Key keyValue="Backspace" onClick={onKeyPress} />
			</div>
		</div>
	);
};

export default Keyboard;
