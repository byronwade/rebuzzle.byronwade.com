import React, { createContext, useContext, useState, useEffect } from "react";

const UserContext = createContext();

export const UserProvider = ({ children }) => {
	const [user, setUser] = useState(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState(null);

	useEffect(() => {
		fetchUserData();
	}, []);

	const fetchUserData = async () => {
		try {
			const response = await fetch("/api/users");
			if (!response.ok) {
				throw new Error("Failed to fetch user data");
			}
			const data = await response.json();
			setUser(data);
		} catch (error) {
			console.error("Error fetching user data:", error);
			setError(error.message);
		} finally {
			setLoading(false);
		}
	};

	return <UserContext.Provider value={{ user, loading, error }}>{children}</UserContext.Provider>;
};

export const useUser = () => {
	const context = useContext(UserContext);
	if (context === undefined) {
		throw new Error("useUser must be used within a UserProvider");
	}
	return context;
};
