/**
 * Platform Abstraction Types
 *
 * These interfaces define the contract between UI components and platform-specific
 * implementations (web/desktop/mobile). Components use these abstractions instead
 * of direct imports, allowing the same code to run on any platform.
 */

export interface PlatformNavigation {
  push: (path: string) => void;
  replace: (path: string) => void;
  back: () => void;
  getCurrentPath: () => string;
}

export interface PlatformAnalytics {
  trackEvent: (name: string, properties?: Record<string, unknown>) => void;
  trackPuzzleStart: (data: {
    puzzleId: string;
    puzzleType: string;
    difficulty: string;
  }) => void;
  trackPuzzleComplete: (data: {
    puzzleId: string;
    attempts: number;
    score: number;
    timeTaken?: number;
  }) => void;
  trackPuzzleAbandon: (data: { puzzleId: string; attempts: number }) => void;
}

export interface PlatformHaptics {
  tap: () => void;
  success: () => void;
  error: () => void;
  warning: () => void;
  celebration: () => void;
  submit: () => void;
}

export interface PlatformUser {
  id: string;
  username: string;
  email: string;
  avatarColorIndex?: number;
  avatarCustomInitials?: string;
}

export interface PlatformAuth {
  isAuthenticated: boolean;
  isLoading: boolean;
  userId: string | null;
  user: PlatformUser | null;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
  refreshAuth: () => Promise<void>;
}

export interface PlatformStorage {
  get: <T>(key: string) => Promise<T | null>;
  set: (key: string, value: unknown) => Promise<void>;
  remove: (key: string) => Promise<void>;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface PlatformApi {
  baseUrl: string;
  fetch: <T>(endpoint: string, options?: RequestInit) => Promise<T>;
}

export interface Platform {
  type: "web" | "desktop" | "mobile";
  navigation: PlatformNavigation;
  analytics: PlatformAnalytics;
  haptics: PlatformHaptics;
  auth: PlatformAuth;
  storage: PlatformStorage;
  api: PlatformApi;
}

/**
 * API Types for AI suggestions
 */
export interface CharacterSuggestion {
  position: number;
  suggestedChar: string;
  confidence: number;
  reason?: string;
}

export interface WordSuggestion {
  word: string;
  confidence: number;
  reason?: string;
}

export interface ContextualHint {
  hint: string;
  type: "encouragement" | "direction" | "correction" | "strategy";
  urgency: "low" | "medium" | "high";
}

export interface SuggestionsResponse {
  success: boolean;
  characterSuggestions?: CharacterSuggestion[];
  wordSuggestions?: WordSuggestion[];
  contextualHint?: ContextualHint | null;
  metadata?: {
    mode: string;
    generationTimeMs: number;
  };
}
