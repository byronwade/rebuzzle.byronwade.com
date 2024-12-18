import { currentUser } from "@clerk/nextjs/server";

export async function AuthCheck() {
	try {
		const user = await currentUser();

		const authData = {
			isAuthenticated: !!user,
			userId: user?.id || null,
		};

		// Add auth data to HTML as a script tag
		return (
			<script
				id="auth-data"
				type="application/json"
				dangerouslySetInnerHTML={{
					__html: JSON.stringify(authData),
				}}
			/>
		);
	} catch (error) {
		console.error("Error in AuthCheck:", error);
		// Return empty auth data on error
		return (
			<script
				id="auth-data"
				type="application/json"
				dangerouslySetInnerHTML={{
					__html: JSON.stringify({
						isAuthenticated: false,
						userId: null,
					}),
				}}
			/>
		);
	}
}
