import React, { createContext, useContext, useState, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";
import { useRouter } from "next/navigation"; // Import useRouter from Next.js

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

const UserContext = createContext();

export const UserProvider = ({ children }) => {
	const [user, setUser] = useState(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState(null);
	const router = useRouter();

	useEffect(() => {
		const getSession = async () => {
			try {
				setLoading(true);
				const {
					data: { session },
					error,
				} = await supabase.auth.getSession();
				if (error) throw error;
				setUser(session?.user ?? null);
			} catch (error) {
				setError(error.message);
			} finally {
				setLoading(false);
			}
		};

		getSession();

		const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
			setUser(session?.user ?? null);
			setLoading(false);
		});

		return () => {
			authListener?.subscription.unsubscribe();
		};
	}, []);

	const signOut = async () => {
		const { error } = await supabase.auth.signOut();
		if (error) {
			console.error("Logout error:", error);
		} else {
			setUser(null);
			router.push("/rebus?guest=true"); // Redirect to /rebus as a guest
		}
	};

	return <UserContext.Provider value={{ user, loading, error, signOut, setUser }}>{children}</UserContext.Provider>;
};

export const useUser = () => {
	const context = useContext(UserContext);
	if (context === undefined) {
		throw new Error("useUser must be used within a UserProvider");
	}
	return context;
};
