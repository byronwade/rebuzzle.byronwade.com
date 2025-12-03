/**
 * API Client for Mobile App
 * Handles authentication, requests, and error handling
 */

import { getAuthToken, saveAuthToken, removeAuthToken, saveUserData, removeUserData } from './storage';
import type {
  User,
  UserStats,
  Puzzle,
  LeaderboardEntry,
  LoginResponse,
  SignupResponse,
  SessionResponse,
  PuzzleResponse,
  StatsResponse,
  LeaderboardResponse,
  PuzzleAttempt,
  AchievementsResponse,
  UserAchievementsResponse,
  CheckAchievementsResponse,
  GameContext,
  AIValidationResponse,
  AIValidationRequest,
  ProfileResponse,
  ProfileUpdateRequest,
  PuzzleStats,
} from '../types';

const API_BASE = 'https://rebuzzle.byronwade.com';

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: unknown;
  headers?: Record<string, string>;
  skipAuth?: boolean;
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

class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
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
      const token = await getAuthToken();
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

      // Network error
      if (error instanceof TypeError && error.message.includes('Network')) {
        throw new ApiError('Network error - please check your connection', 0);
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

  // ============================================
  // AUTH METHODS
  // ============================================

  /**
   * Login user
   */
  async login(email: string, password: string): Promise<{ success: boolean; user?: User; error?: string }> {
    try {
      const response = await this.post<LoginResponse>(
        '/api/auth/login',
        { email, password },
        { skipAuth: true }
      );

      if (response.success && response.token) {
        await saveAuthToken(response.token);
        await saveUserData(response.user);
        return { success: true, user: response.user };
      }

      return { success: false, error: 'Login failed' };
    } catch (error) {
      const message = error instanceof ApiError ? error.message : 'Login failed';
      return { success: false, error: message };
    }
  }

  /**
   * Sign up new user
   */
  async signUp(
    username: string,
    email: string,
    password: string
  ): Promise<{ success: boolean; user?: User; error?: string }> {
    try {
      const response = await this.post<SignupResponse>(
        '/api/auth/signup',
        { username, email, password },
        { skipAuth: true }
      );

      if (response.success && response.token) {
        await saveAuthToken(response.token);
        await saveUserData(response.user);
        return { success: true, user: response.user };
      }

      return { success: false, error: 'Signup failed' };
    } catch (error) {
      const message = error instanceof ApiError ? error.message : 'Signup failed';
      return { success: false, error: message };
    }
  }

  /**
   * Create or get guest session
   */
  async createGuestSession(): Promise<{ success: boolean; user?: User; error?: string }> {
    try {
      const response = await this.get<{
        success: boolean;
        user: User;
        token?: string;
      }>('/api/auth/guest', { skipAuth: true });

      if (response.success && response.user) {
        if (response.token) {
          await saveAuthToken(response.token);
        }
        await saveUserData(response.user);
        return { success: true, user: response.user };
      }

      return { success: false, error: 'Failed to create guest session' };
    } catch (error) {
      const message = error instanceof ApiError ? error.message : 'Guest session failed';
      return { success: false, error: message };
    }
  }

  /**
   * Logout user
   */
  async logout(): Promise<void> {
    try {
      await this.post('/api/auth/logout');
    } catch {
      // Ignore logout API errors
    } finally {
      await removeAuthToken();
      await removeUserData();
    }
  }

  /**
   * Check session / restore auth state
   */
  async checkSession(): Promise<{ authenticated: boolean; user: User | null }> {
    const token = await getAuthToken();
    if (!token) {
      return { authenticated: false, user: null };
    }

    try {
      const response = await this.get<SessionResponse>('/api/auth/session');

      if (response.authenticated && response.user) {
        await saveUserData(response.user);
        return { authenticated: true, user: response.user };
      }

      // Invalid token - clear it
      await removeAuthToken();
      await removeUserData();
      return { authenticated: false, user: null };
    } catch {
      return { authenticated: false, user: null };
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
      const response = await this.get<PuzzleResponse>('/api/puzzle/today', { skipAuth: true });

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
   * Record puzzle attempt
   */
  async recordAttempt(attempt: PuzzleAttempt): Promise<{ success: boolean; error?: string }> {
    try {
      const response = await this.post<{ success: boolean; attemptId?: string; message?: string }>(
        '/api/puzzles/attempt',
        attempt
      );
      return { success: response.success };
    } catch (error) {
      const message = error instanceof ApiError ? error.message : 'Failed to record attempt';
      return { success: false, error: message };
    }
  }

  // ============================================
  // USER STATS METHODS
  // ============================================

  /**
   * Get user stats
   */
  async getUserStats(userId: string, timeframe: string = 'today'): Promise<{ stats: UserStats; rank: number } | null> {
    try {
      const response = await this.get<StatsResponse>(
        `/api/user/stats?userId=${userId}&timeframe=${timeframe}`
      );

      if (response.success && response.stats) {
        return { stats: response.stats, rank: response.rank };
      }
      return null;
    } catch (error) {
      console.error('Failed to fetch stats:', error);
      return null;
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
  ): Promise<LeaderboardEntry[]> {
    const { limit = 10, timeframe = 'allTime', sortBy = 'points' } = options;

    try {
      const response = await this.get<LeaderboardResponse>(
        `/api/leaderboard?limit=${limit}&timeframe=${timeframe}&sortBy=${sortBy}`,
        { skipAuth: true }
      );

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
  // ACHIEVEMENT METHODS
  // ============================================

  /**
   * Get all achievements with user's unlock status
   */
  async getAchievements(options?: {
    category?: string;
    rarity?: string;
  }): Promise<AchievementsResponse | null> {
    try {
      const params = new URLSearchParams();
      if (options?.category) params.set('category', options.category);
      if (options?.rarity) params.set('rarity', options.rarity);
      const query = params.toString() ? `?${params.toString()}` : '';

      return await this.get<AchievementsResponse>(`/api/achievements${query}`);
    } catch (error) {
      console.error('Failed to fetch achievements:', error);
      return null;
    }
  }

  /**
   * Get current user's achievement progress and recent unlocks
   */
  async getUserAchievements(): Promise<UserAchievementsResponse | null> {
    try {
      return await this.get<UserAchievementsResponse>('/api/user/achievements');
    } catch (error) {
      console.error('Failed to fetch user achievements:', error);
      return null;
    }
  }

  /**
   * Check and award achievements after game completion
   */
  async checkAchievements(gameContext: GameContext): Promise<CheckAchievementsResponse | null> {
    try {
      return await this.post<CheckAchievementsResponse>('/api/user/achievements', { gameContext });
    } catch (error) {
      console.error('Failed to check achievements:', error);
      return null;
    }
  }

  /**
   * Manually award an achievement (e.g., share_result)
   */
  async awardAchievement(achievementId: string): Promise<{ success: boolean; awarded: boolean }> {
    try {
      const response = await this.post<CheckAchievementsResponse>('/api/user/achievements', {
        manualAward: { achievementId },
      });
      return {
        success: response?.success || false,
        awarded: (response?.newlyUnlocked?.length || 0) > 0,
      };
    } catch (error) {
      console.error('Failed to award achievement:', error);
      return { success: false, awarded: false };
    }
  }

  // ============================================
  // AI VALIDATION METHODS
  // ============================================

  /**
   * Validate answer using AI for smarter matching and feedback
   */
  async validateAnswerWithAI(params: AIValidationRequest): Promise<AIValidationResponse | null> {
    try {
      return await this.post<AIValidationResponse>('/api/ai/validate-answer', params);
    } catch (error) {
      console.error('Failed to validate with AI:', error);
      return null;
    }
  }

  // ============================================
  // PROFILE METHODS
  // ============================================

  /**
   * Get user profile
   */
  async getUserProfile(): Promise<ProfileResponse | null> {
    try {
      return await this.get<ProfileResponse>('/api/user/profile');
    } catch (error) {
      console.error('Failed to fetch profile:', error);
      return null;
    }
  }

  /**
   * Update user profile (username, avatar)
   */
  async updateUserProfile(updates: ProfileUpdateRequest): Promise<ProfileResponse | null> {
    try {
      return await this.request<ProfileResponse>('/api/user/profile', {
        method: 'PATCH',
        body: updates,
      });
    } catch (error) {
      console.error('Failed to update profile:', error);
      return null;
    }
  }

  // ============================================
  // EXTENDED STATS METHODS
  // ============================================

  /**
   * Update user stats after game completion
   */
  async updateUserStats(
    userId: string,
    gameResult: {
      won: boolean;
      attempts: number;
      timeSpent?: number;
      difficulty?: number;
    }
  ): Promise<{ success: boolean }> {
    try {
      const response = await this.post<{ success: boolean }>('/api/user/update-stats', {
        userId,
        gameResult,
      });
      return { success: response?.success || false };
    } catch (error) {
      console.error('Failed to update stats:', error);
      return { success: false };
    }
  }

  /**
   * Get puzzle statistics (solve rates, times, etc.)
   */
  async getPuzzleStats(puzzleId?: string): Promise<PuzzleStats | null> {
    try {
      const query = puzzleId ? `?puzzleId=${puzzleId}` : '';
      const response = await this.get<{ success: boolean } & PuzzleStats>(
        `/api/puzzles/stats${query}`,
        { skipAuth: true }
      );
      if (response) {
        return {
          todaySolves: response.todaySolves,
          averageSolveTime: response.averageSolveTime,
          averageAttempts: response.averageAttempts,
          solveTimeDistribution: response.solveTimeDistribution,
        };
      }
      return null;
    } catch (error) {
      console.error('Failed to fetch puzzle stats:', error);
      return null;
    }
  }
}

// Export singleton API client
export const api = new ApiClient(API_BASE);
