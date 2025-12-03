/**
 * API Client for Desktop App
 * Handles authentication, requests, and offline fallback
 */

import { appStore, type Puzzle, type User, type UserStats } from './store';

const API_BASE = 'https://rebuzzle.byronwade.com';

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: unknown;
  headers?: Record<string, string>;
  skipAuth?: boolean;
}

class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  /**
   * Get auth token from electron-store
   */
  private async getAuthToken(): Promise<string | null> {
    try {
      if (window.electronAPI) {
        return await window.electronAPI.settings.get<string>('authToken');
      }
      return appStore.get('authToken');
    } catch {
      return appStore.get('authToken');
    }
  }

  /**
   * Set auth token in electron-store
   */
  private async setAuthToken(token: string | null): Promise<void> {
    try {
      if (window.electronAPI) {
        await window.electronAPI.settings.set('authToken', token);
      }
      appStore.setState({ authToken: token });
    } catch {
      appStore.setState({ authToken: token });
    }
  }

  /**
   * Make an API request
   */
  async request<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
    const { method = 'GET', body, headers = {}, skipAuth = false } = options;

    // Build headers
    const requestHeaders: Record<string, string> = {
      'Content-Type': 'application/json',
      ...headers,
    };

    // Add auth token if available and not skipped
    if (!skipAuth) {
      const token = await this.getAuthToken();
      if (token) {
        requestHeaders['Authorization'] = `Bearer ${token}`;
      }
    }

    const url = `${this.baseUrl}${endpoint}`;

    try {
      const response = await fetch(url, {
        method,
        headers: requestHeaders,
        body: body ? JSON.stringify(body) : undefined,
      });

      // Handle non-OK responses
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new ApiError(
          errorData.error || `Request failed: ${response.statusText}`,
          response.status
        );
      }

      return await response.json();
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }

      // Network error - mark as offline
      if (error instanceof TypeError && error.message.includes('fetch')) {
        appStore.setState({ isOnline: false });
        throw new ApiError('Network error - you may be offline', 0);
      }

      throw new ApiError(
        error instanceof Error ? error.message : 'Unknown error',
        0
      );
    }
  }

  /**
   * GET request helper
   */
  async get<T>(endpoint: string, options?: Omit<RequestOptions, 'method' | 'body'>): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: 'GET' });
  }

  /**
   * POST request helper
   */
  async post<T>(endpoint: string, body?: unknown, options?: Omit<RequestOptions, 'method'>): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: 'POST', body });
  }

  /**
   * PATCH request helper
   */
  async patch<T>(endpoint: string, body?: unknown, options?: Omit<RequestOptions, 'method'>): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: 'PATCH', body });
  }

  // ============================================
  // AUTH METHODS
  // ============================================

  /**
   * Login user
   */
  async login(email: string, password: string): Promise<{ success: boolean; user?: User }> {
    try {
      const response = await this.post<{
        success: boolean;
        user: User;
        token: string;
      }>('/api/auth/login', { email, password }, { skipAuth: true });

      if (response.success && response.token) {
        await this.setAuthToken(response.token);
        appStore.setState({
          isAuthenticated: true,
          user: response.user,
        });
        return { success: true, user: response.user };
      }

      return { success: false };
    } catch (error) {
      console.error('Login error:', error);
      return { success: false };
    }
  }

  /**
   * Logout user
   */
  async logout(): Promise<void> {
    try {
      await this.post('/api/auth/logout');
    } catch {
      // Ignore logout errors
    } finally {
      await this.setAuthToken(null);
      appStore.setState({
        isAuthenticated: false,
        user: null,
        stats: null,
      });
    }
  }

  /**
   * Check session / restore auth state
   */
  async checkSession(): Promise<boolean> {
    const token = await this.getAuthToken();
    if (!token) {
      appStore.setState({ isAuthenticated: false, isLoading: false });
      return false;
    }

    try {
      const response = await this.get<{
        authenticated: boolean;
        user: User | null;
      }>('/api/auth/session');

      if (response.authenticated && response.user) {
        appStore.setState({
          isAuthenticated: true,
          user: response.user,
          isLoading: false,
        });
        return true;
      }

      // Invalid token
      await this.setAuthToken(null);
      appStore.setState({
        isAuthenticated: false,
        user: null,
        isLoading: false,
      });
      return false;
    } catch {
      appStore.setState({ isLoading: false });
      return false;
    }
  }

  // ============================================
  // PUZZLE METHODS
  // ============================================

  /**
   * Get today's puzzle
   */
  async getTodayPuzzle(): Promise<Puzzle | null> {
    try {
      const response = await this.get<{
        success: boolean;
        puzzle: Puzzle;
      }>('/api/puzzle/today');

      if (response.success && response.puzzle) {
        return response.puzzle;
      }
      return null;
    } catch (error) {
      console.error('Failed to fetch puzzle:', error);
      return null;
    }
  }

  // ============================================
  // USER STATS METHODS
  // ============================================

  /**
   * Get user stats
   */
  async getUserStats(userId: string): Promise<UserStats | null> {
    try {
      const response = await this.get<{
        success: boolean;
        stats: UserStats;
      }>(`/api/user/stats?userId=${userId}`);

      if (response.success && response.stats) {
        appStore.setState({ stats: response.stats });
        return response.stats;
      }
      return null;
    } catch (error) {
      console.error('Failed to fetch stats:', error);
      return null;
    }
  }

  /**
   * Update user stats after puzzle completion
   */
  async updateStats(gameResult: {
    won: boolean;
    attempts: number;
    timeSpent: number;
    difficulty?: number;
  }): Promise<boolean> {
    try {
      const response = await this.post<{ success: boolean }>('/api/user/update-stats', {
        gameResult,
      });
      return response.success;
    } catch (error) {
      console.error('Failed to update stats:', error);
      return false;
    }
  }

  // ============================================
  // LEADERBOARD METHODS
  // ============================================

  /**
   * Get leaderboard
   */
  async getLeaderboard(
    options: {
      limit?: number;
      timeframe?: 'today' | 'week' | 'month' | 'allTime';
      sortBy?: 'points' | 'streak';
    } = {}
  ): Promise<Array<{
    rank: number;
    user: { id: string; username: string };
    stats: { points: number; streak: number; wins: number; level: number };
  }>> {
    const { limit = 10, timeframe = 'allTime', sortBy = 'points' } = options;

    try {
      const response = await this.get<{
        success: boolean;
        leaderboard: Array<{
          rank: number;
          user: { id: string; username: string };
          stats: { points: number; streak: number; wins: number; level: number };
        }>;
      }>(`/api/leaderboard?limit=${limit}&timeframe=${timeframe}&sortBy=${sortBy}`);

      if (response.success) {
        return response.leaderboard;
      }
      return [];
    } catch (error) {
      console.error('Failed to fetch leaderboard:', error);
      return [];
    }
  }
}

/**
 * Custom API Error class
 */
export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

// Export singleton API client
export const api = new ApiClient(API_BASE);

// Check online status
function updateOnlineStatus(): void {
  appStore.setState({ isOnline: navigator.onLine });
}

window.addEventListener('online', updateOnlineStatus);
window.addEventListener('offline', updateOnlineStatus);
