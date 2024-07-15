// components/LoadingScreen.jsx
import React from "react";

const LoadingScreen = () => {
	return (
		<div className="flex flex-col items-center justify-center h-screen bg-gray-100">
			<div className="flex justify-center items-center space-x-4">
				<div className="rebus bg-blue-500 w-10 h-10 rounded animate-bounce"></div>
				<div className="rebus bg-blue-500 w-10 h-10 rounded animate-bounce delay-200"></div>
				<div className="rebus bg-blue-500 w-10 h-10 rounded animate-bounce delay-400"></div>
			</div>
			<p className="mt-4 text-xl font-bold text-gray-700">Loading...</p>
		</div>
	);
};

export default LoadingScreen;
