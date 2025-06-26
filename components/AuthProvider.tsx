"use client";

import { createContext, useContext } from "react";

interface AuthState {
	isAuthenticated: boolean;
	userId: string | null;
	isLoading: boolean;
	error?: string;
}

const AuthContext = createContext<AuthState>({
	isAuthenticated: false,
	userId: null,
	isLoading: false,
});

export function useAuth() {
	return useContext(AuthContext);
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
	// For offline mode, we always return unauthenticated state
	const authState: AuthState = {
		isAuthenticated: false,
		userId: null,
		isLoading: false,
	};

	return <AuthContext.Provider value={authState}>{children}</AuthContext.Provider>;
}
