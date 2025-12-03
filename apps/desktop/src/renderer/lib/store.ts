/**
 * Simple Observable Store
 * Type-safe state management without external dependencies
 */

export type Listener<T> = (state: T) => void;
export type Selector<T, R> = (state: T) => R;

export class Store<T extends object> {
  private state: T;
  private listeners: Set<Listener<T>> = new Set();

  constructor(initialState: T) {
    this.state = { ...initialState };
  }

  getState(): T {
    return this.state;
  }

  get<K extends keyof T>(key: K): T[K] {
    return this.state[key];
  }

  setState(partial: Partial<T>): void {
    const prevState = this.state;
    this.state = { ...this.state, ...partial };

    // Only notify if state actually changed
    if (prevState !== this.state) {
      this.notify();
    }
  }

  subscribe(listener: Listener<T>): () => void {
    this.listeners.add(listener);
    // Return unsubscribe function
    return () => {
      this.listeners.delete(listener);
    };
  }

  // Subscribe to specific state changes
  select<R>(selector: Selector<T, R>, listener: (value: R) => void): () => void {
    let previousValue = selector(this.state);

    return this.subscribe((state) => {
      const currentValue = selector(state);
      if (currentValue !== previousValue) {
        previousValue = currentValue;
        listener(currentValue);
      }
    });
  }

  private notify(): void {
    this.listeners.forEach((listener) => {
      try {
        listener(this.state);
      } catch (error) {
        console.error('Store listener error:', error);
      }
    });
  }

  // Reset to initial state
  reset(initialState: T): void {
    this.state = { ...initialState };
    this.notify();
  }
}

// ============================================
// APPLICATION STATE
// ============================================

export interface User {
  id: string;
  username: string;
  email: string;
}

export interface UserStats {
  points: number;
  streak: number;
  maxStreak: number;
  totalGames: number;
  wins: number;
  level: number;
  perfectSolves: number;
  fastestSolveSeconds?: number;
}

export interface Puzzle {
  id: string;
  puzzle: string;
  puzzleType: string;
  answer: string;
  difficulty: string | number;
  explanation?: string;
  hints?: string[];
  publishedAt: string;
}

export interface PuzzleAttempt {
  puzzleId: string;
  attemptedAnswer: string;
  isCorrect: boolean;
  abandoned?: boolean;
  attemptNumber: number;
  maxAttempts: number;
  timeSpentSeconds: number;
  difficulty?: string;
  hintsUsed?: number;
}

export interface GameState {
  puzzle: Puzzle | null;
  attempts: number;
  maxAttempts: number;
  guesses: string[];
  isComplete: boolean;
  isCorrect: boolean;
  startTime: number;
  elapsedTime: number;
  hintsUsed: number;
  score: number | null;
}

export interface AppState {
  // Auth
  isAuthenticated: boolean;
  user: User | null;
  authToken: string | null;

  // Game
  game: GameState;

  // User data
  stats: UserStats | null;

  // UI
  currentPage: string;
  theme: 'light' | 'dark' | 'system';
  isOnline: boolean;
  isLoading: boolean;

  // Server time sync
  serverTimeOffset: number; // Difference between server and client time (ms)
  nextPuzzleTime: string | null; // ISO string of next puzzle availability

  // Offline
  offlineAttempts: Array<{
    puzzleId: string;
    timestamp: number;
    score: number;
    synced: boolean;
  }>;
}

const initialGameState: GameState = {
  puzzle: null,
  attempts: 0,
  maxAttempts: 3,
  guesses: [],
  isComplete: false,
  isCorrect: false,
  startTime: 0,
  elapsedTime: 0,
  hintsUsed: 0,
  score: null,
};

const initialState: AppState = {
  isAuthenticated: false,
  user: null,
  authToken: null,
  game: initialGameState,
  stats: null,
  currentPage: '/',
  theme: 'dark',
  isOnline: navigator.onLine,
  isLoading: true,
  serverTimeOffset: 0,
  nextPuzzleTime: null,
  offlineAttempts: [],
};

// Export singleton store
export const appStore = new Store<AppState>(initialState);

// Helper to reset game state
export function resetGameState(): void {
  appStore.setState({
    game: { ...initialGameState, startTime: Date.now() },
  });
}

// Helper to get today's date string
export function getTodayDateString(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}
