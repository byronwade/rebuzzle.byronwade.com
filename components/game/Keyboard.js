import { Button } from "@/components/ui/button";
import { useKeyboard } from "@/context/KeyboardContext";
import { ArrowLeft } from "react-feather";

const keys1 = ["Q", "W", "E", "R", "T", "Y", "U", "I", "O", "P"];
const keys2 = ["A", "S", "D", "F", "G", "H", "J", "K", "L"];
const keys3 = ["Z", "X", "C", "V", "B", "N", "M"];

const Key = ({ keyValue, onClick }) => (
	<Button className="key flex justify-center items-center m-[0.10em] p-1 sm:p-2 md:p-3 rounded-md h-12 w-12 sm:h-14 sm:w-14 md:h-16 md:w-16 text-md sm:text-lg md:text-xl uppercase font-bold" onClick={() => onClick(keyValue)}>
		{keyValue}
	</Button>
);

const SpecialKey = ({ keyValue, onClick, variant, extraClass, children }) => (
	<Button variant={variant} className={`key ${extraClass} flex justify-center items-center m-[0.10em] p-1 sm:p-2 md:p-3 rounded-md h-12 w-20 sm:h-14 sm:w-24 md:h-16 md:w-28 uppercase font-bold`} onClick={() => onClick(keyValue)}>
		{children || keyValue}
	</Button>
);

const Keyboard = () => {
	const { handleKeyPress } = useKeyboard();

	return (
		<div className="keyboard flex flex-col items-center mt-4 w-full max-w-xl mx-auto sm:px-4 md:px-6">
			<div className="keyboard-row flex justify-center w-full">
				{keys1.map((key) => (
					<Key key={key} keyValue={key} onClick={handleKeyPress} />
				))}
			</div>
			<div className="keyboard-row flex justify-center w-full mt-[0.10em]">
				<div className="flex-0.5" />
				{keys2.map((key) => (
					<Key key={key} keyValue={key} onClick={handleKeyPress} />
				))}
				<div className="flex-0.5" />
			</div>
			<div className="keyboard-row flex justify-center w-full mt-[0.10em]">
				<SpecialKey keyValue="Enter" onClick={handleKeyPress} variant="brand" extraClass="text-xs flex-1.5">
					Enter
				</SpecialKey>
				{keys3.map((key) => (
					<Key key={key} keyValue={key} onClick={handleKeyPress} />
				))}
				<SpecialKey keyValue="Backspace" onClick={handleKeyPress} variant="brand" extraClass="flex-1.5">
					<ArrowLeft size={20} />
				</SpecialKey>
			</div>
		</div>
	);
};

export default Keyboard;
