import React from "react";

export default function AuthLoading() {
	return (
		<div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
			<div className="w-full max-w-md rounded-lg bg-white p-8 shadow-lg dark:bg-gray-800">
				<div className="flex flex-col items-center justify-center space-y-4">
					<div className="h-12 w-12 animate-spin rounded-full border-4 border-blue-500 border-t-transparent"></div>
					<p className="text-lg font-medium text-gray-700 dark:text-gray-300">Loading...</p>
				</div>
			</div>
		</div>
	);
}
