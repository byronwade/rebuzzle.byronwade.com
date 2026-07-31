/**
 * Auth Context
 * Provides authentication state and methods throughout the app
 */

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { api } from '../lib/api';
import { getAuthToken, getUserData } from '../lib/storage';
import type { User, UserStats } from '../types';

interface AuthContextType {
  isAuthenticated: boolean;
  isLoading: boolean;
  user: User | null;
  stats: UserStats | null;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  signUp: (username: string, email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  continueAsGuest: () => Promise<{ success: boolean; error?: string }>;
  refreshAuth: () => Promise<void>;
  refreshStats: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [stats, setStats] = useState<UserStats | null>(null);

  /**
   * Check and restore auth state on mount
   */
  const refreshAuth = useCallback(async () => {
    setIsLoading(true);
    try {
      // First check if we have a stored token
      const token = await getAuthToken();
      if (!token) {
        // Check for cached user data (offline support)
        const cachedUser = await getUserData();
        if (cachedUser) {
          setUser(cachedUser);
        }
        setIsAuthenticated(false);
        setIsLoading(false);
        return;
      }

      // Verify session with server
      const { authenticated, user: sessionUser } = await api.checkSession();
      setIsAuthenticated(authenticated);
      setUser(sessionUser);

      // Fetch stats if authenticated
      if (authenticated && sessionUser) {
        const result = await api.getUserStats(sessionUser.id);
        if (result) {
          setStats(result.stats);
        }
      }
    } catch (error) {
      console.error('Auth refresh error:', error);
      setIsAuthenticated(false);
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Refresh user stats
   */
  const refreshStats = useCallback(async () => {
    if (!user) return;
    try {
      const result = await api.getUserStats(user.id);
      if (result) {
        setStats(result.stats);
      }
    } catch (error) {
      console.error('Stats refresh error:', error);
    }
  }, [user]);

  /**
   * Login
   */
  const login = useCallback(async (email: string, password: string) => {
    const result = await api.login(email, password);
    if (result.success && result.user) {
      setIsAuthenticated(true);
      setUser(result.user);
      // Fetch stats
      const statsResult = await api.getUserStats(result.user.id);
      if (statsResult) {
        setStats(statsResult.stats);
      }
    }
    return result;
  }, []);

  /**
   * Sign up
   */
  const signUp = useCallback(async (username: string, email: string, password: string) => {
    const result = await api.signUp(username, email, password);
    if (result.success && result.user) {
      setIsAuthenticated(true);
      setUser(result.user);
      // New user starts with empty stats
      setStats(null);
    }
    return result;
  }, []);

  /**
   * Continue as guest
   */
  const continueAsGuest = useCallback(async () => {
    const result = await api.createGuestSession();
    if (result.success && result.user) {
      setIsAuthenticated(true);
      setUser(result.user);
      setStats(null);
    }
    return result;
  }, []);

  /**
   * Logout
   */
  const logout = useCallback(async () => {
    await api.logout();
    setIsAuthenticated(false);
    setUser(null);
    setStats(null);
  }, []);

  // Initialize auth state on mount
  useEffect(() => {
    refreshAuth();
  }, [refreshAuth]);

  const value: AuthContextType = {
    isAuthenticated,
    isLoading,
    user,
    stats,
    login,
    signUp,
    logout,
    continueAsGuest,
    refreshAuth,
    refreshStats,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

/**
 * Hook to use auth context
 */
export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
