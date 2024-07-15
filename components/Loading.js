const LoadingScreen = () => {
	return (
		<div className="flex flex-col items-center justify-center h-screen">
			<div className="flex justify-center items-center space-x-4">
				<div className="rebus bg-brand w-10 h-10 rounded animate-bounce"></div>
				<div className="rebus bg-brand w-10 h-10 rounded animate-bounce delay-200"></div>
				<div className="rebus bg-brand w-10 h-10 rounded animate-bounce delay-400"></div>
			</div>
			<p className="mt-4 text-lg font-bold text-black dark:text-white">Loading...</p>
		</div>
	);
};

export default LoadingScreen;
