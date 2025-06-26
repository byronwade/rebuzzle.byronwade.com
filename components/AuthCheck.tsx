export async function AuthCheck() {
	try {
		// Demo mode - always return unauthenticated state
		return {
			userId: null,
			user: null,
			isAuthenticated: false,
			mode: "demo",
		};
	} catch (error) {
		console.error("Demo AuthCheck error:", error);
		return {
			userId: null,
			user: null,
			isAuthenticated: false,
			mode: "demo",
		};
	}
}
