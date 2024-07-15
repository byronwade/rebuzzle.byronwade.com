"use client";

import { createContext, useContext, useState, useCallback } from "react";

const KeyboardContext = createContext();

export const KeyboardProvider = ({ children }) => {
	const [pressedKey, setPressedKey] = useState(null);

	const handleKeyPress = useCallback((key) => {
		setPressedKey(key);
		setTimeout(() => setPressedKey(null), 100); // Clear the key after a short delay
	}, []);

	return <KeyboardContext.Provider value={{ pressedKey, handleKeyPress }}>{children}</KeyboardContext.Provider>;
};

export const useKeyboard = () => {
	return useContext(KeyboardContext);
};
