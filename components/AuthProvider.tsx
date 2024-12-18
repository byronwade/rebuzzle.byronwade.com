"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { useClerk } from "@clerk/nextjs";

interface AuthState {
	isAuthenticated: boolean;
	userId: string | null;
	isLoading: boolean;
	error?: string;
}

const AuthContext = createContext<AuthState>({
	isAuthenticated: false,
	userId: null,
	isLoading: true,
});

export function useAuth() {
	return useContext(AuthContext);
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
	const { user, loaded } = useClerk();
	const [authState, setAuthState] = useState<AuthState>(() => {
		// Get initial state from server-rendered script
		if (typeof window !== "undefined") {
			try {
				const script = document.getElementById("auth-data");
				if (script) {
					const data = JSON.parse(script.textContent || "{}");
					return {
						isAuthenticated: data.isAuthenticated,
						userId: data.userId,
						isLoading: !loaded, // Use Clerk's loaded state
					};
				}
			} catch (error) {
				console.error("Error parsing auth data:", error);
				return {
					isAuthenticated: false,
					userId: null,
					isLoading: true,
					error: error instanceof Error ? error.message : "Failed to parse auth data",
				};
			}
		}
		return {
			isAuthenticated: false,
			userId: null,
			isLoading: true,
		};
	});

	useEffect(() => {
		// Only update state when Clerk is loaded
		if (loaded) {
			setAuthState((prev) => ({
				...prev,
				isAuthenticated: !!user,
				userId: user?.id || null,
				isLoading: false,
				error: undefined, // Clear any previous errors
			}));
		}
	}, [user, loaded]);

	// Don't render children until we have initial auth state
	if (!loaded && authState.isLoading) {
		return null;
	}

	return <AuthContext.Provider value={authState}>{children}</AuthContext.Provider>;
}
