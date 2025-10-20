"use client";

import { createContext, useContext, useEffect, useState } from "react";

interface AuthState {
	isAuthenticated: boolean;
	userId: string | null;
	user: {
		id: string;
		username: string;
		email: string;
	} | null;
	isLoading: boolean;
	error?: string;
}

const AuthContext = createContext<AuthState>({
	isAuthenticated: false,
	userId: null,
	user: null,
	isLoading: false,
});

export function useAuth() {
	return useContext(AuthContext);
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
	const [authState, setAuthState] = useState<AuthState>({
		isAuthenticated: false,
		userId: null,
		user: null,
		isLoading: true,
	});

	useEffect(() => {
		// Check for authentication state
		const checkAuth = async () => {
			try {
				// Check for database session
				const response = await fetch('/api/auth/session');
				if (response.ok) {
					const session = await response.json();
					if (session.user) {
						const userData = {
							id: session.user.id,
							username: session.user.username || session.user.email,
							email: session.user.email,
						};

						setAuthState({
							isAuthenticated: true,
							userId: userData.id,
							user: userData,
							isLoading: false,
						});
						return;
					}
				}

				// No authentication found
				setAuthState({
					isAuthenticated: false,
					userId: null,
					user: null,
					isLoading: false,
				});
			} catch (error) {
				console.error('Auth check failed:', error);
				setAuthState({
					isAuthenticated: false,
					userId: null,
					user: null,
					isLoading: false,
					error: 'Authentication check failed',
				});
			}
		};

		checkAuth();
	}, []);

	return <AuthContext.Provider value={authState}>{children}</AuthContext.Provider>;
}
