/**
 * API Client for Desktop App
 * Handles authentication, requests, and offline fallback
 */

import { appStore, type Puzzle, type PuzzleAttempt, type User, type UserStats } from './store';

// Always use production API to ensure consistent puzzles across all platforms
const API_BASE = import.meta.env.VITE_API_URL || 'https://rebuzzle.byronwade.com';

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
  private deviceId: string | null = null;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  /**
   * Get or create device ID for IP-bound guest identification
   */
  private async getDeviceId(): Promise<string> {
    if (this.deviceId) return this.deviceId;

    try {
      if (window.electronAPI) {
        let id = await window.electronAPI.settings.get<string>('deviceId');
        if (!id) {
          id = `desktop_${Date.now()}_${Math.random().toString(36).substring(7)}`;
          await window.electronAPI.settings.set('deviceId', id);
        }
        this.deviceId = id;
        return id;
      }
    } catch {
      // Fallback if electron API not available
    }

    // Fallback for non-electron environments
    const id = `desktop_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    this.deviceId = id;
    return id;
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

    // Add device ID for IP-bound guest identification
    const deviceId = await this.getDeviceId();
    requestHeaders['X-Device-Id'] = deviceId;

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
        serverTime?: string;
        nextPuzzleTime?: string;
      }>('/api/puzzle/today');

      // Capture server time for accurate countdown
      if (response.serverTime && response.nextPuzzleTime) {
        const serverTime = new Date(response.serverTime).getTime();
        const clientTime = Date.now();
        const offset = serverTime - clientTime;

        appStore.setState({
          serverTimeOffset: offset,
          nextPuzzleTime: response.nextPuzzleTime,
        });
      }

      if (response.success && response.puzzle) {
        return response.puzzle;
      }
      return null;
    } catch (error) {
      console.error('Failed to fetch puzzle:', error);
      return null;
    }
  }

  /**
   * Record a puzzle attempt
   * This is the main endpoint for tracking puzzle completion across all platforms
   */
  async recordAttempt(attempt: PuzzleAttempt): Promise<{ success: boolean; attemptId?: string }> {
    try {
      const response = await this.post<{
        success: boolean;
        attemptId: string;
        message: string;
      }>('/api/puzzles/attempt', attempt);

      return {
        success: response.success,
        attemptId: response.attemptId,
      };
    } catch (error) {
      console.error('Failed to record attempt:', error);
      return { success: false };
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

  // ============================================
  // PROFILE METHODS
  // ============================================

  /**
   * Update user profile
   */
  async updateProfile(data: { username?: string }): Promise<boolean> {
    try {
      const response = await this.patch<{ success: boolean }>('/api/user/profile', data);
      return response.success;
    } catch (error) {
      console.error('Failed to update profile:', error);
      throw error;
    }
  }

  // ============================================
  // ACHIEVEMENTS METHODS
  // ============================================

  /**
   * Get all achievements (works for both authenticated and unauthenticated users)
   */
  async getAchievements(): Promise<{
    achievements: Array<{
      id: string;
      name: string;
      description: string;
      hint: string;
      icon: string;
      category: string;
      rarity: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';
      points: number;
      order: number;
      secret?: boolean;
      unlocked: boolean;
      unlockedAt?: string;
    }>;
    progress: { unlocked: number; total: number; percentage: number };
  }> {
    try {
      const response = await this.get<{
        success: boolean;
        achievements: Array<{
          id: string;
          name: string;
          description: string;
          hint: string;
          icon: string;
          category: string;
          rarity: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';
          points: number;
          order: number;
          secret?: boolean;
          unlocked: boolean;
          unlockedAt?: string;
        }>;
        progress: { unlocked: number; total: number; percentage: number };
      }>('/api/achievements');

      if (response.success) {
        return {
          achievements: response.achievements || [],
          progress: response.progress || { unlocked: 0, total: 0, percentage: 0 },
        };
      }
      return { achievements: [], progress: { unlocked: 0, total: 0, percentage: 0 } };
    } catch (error) {
      console.error('Failed to fetch achievements:', error);
      return { achievements: [], progress: { unlocked: 0, total: 0, percentage: 0 } };
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
