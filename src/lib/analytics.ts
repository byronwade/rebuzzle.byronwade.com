import { track } from "@vercel/analytics";

export const analyticsEvents = {
  // User events
  USER_SIGNUP: "user_signup",
  USER_LOGIN: "user_login",
  USER_RETURN: "user_return",
  USER_VISIT: "user_visit",
  // Puzzle events
  PUZZLE_START: "puzzle_start",
  PUZZLE_COMPLETE: "puzzle_complete",
  PUZZLE_ABANDON: "puzzle_abandon",
  GUESS_SUBMITTED: "guess_submitted",
  HINT_USED: "hint_used",
  // Game events (legacy)
  GAME_START: "game_start",
  GAME_COMPLETE: "game_complete",
  HINTS_REVEALED: "hints_revealed",
  // Content events
  BLOG_POST_VIEW: "blog_post_view",
  BLOG_ANSWER_REVEALED: "blog_answer_revealed",
  LEADERBOARD_VIEW: "leaderboard_view",
} as const;

/**
 * Get or create session ID from localStorage
 */
function getSessionId(): string {
  if (typeof window === "undefined") {
    return `session_${Date.now()}_${Math.random().toString(36).substring(7)}`;
  }

  const stored = localStorage.getItem("analytics_session_id");
  if (stored) {
    return stored;
  }

  const sessionId = `session_${Date.now()}_${Math.random().toString(36).substring(7)}`;
  localStorage.setItem("analytics_session_id", sessionId);
  return sessionId;
}

/**
 * Get user ID from localStorage (if authenticated)
 */
function getUserId(): string | undefined {
  if (typeof window === "undefined") {
    return;
  }

  try {
    const userStr = localStorage.getItem("user");
    if (userStr) {
      const user = JSON.parse(userStr);
      return user.id;
    }
  } catch {
    // Ignore parse errors
  }

  return;
}

/**
 * Track event (client-side)
 * Sends to Vercel Analytics and stores in MongoDB via API
 */
export function trackEvent(
  eventName: string,
  eventData?: Record<string, any>
): void {
  const sessionId = getSessionId();
  const userId = getUserId();

  // In development, log to console
  if (process.env.NODE_ENV === "development") {
    console.log("Analytics Event:", eventName, {
      sessionId,
      userId,
      ...eventData,
    });
  }

  // Always send to Vercel Analytics (client-side)
  try {
    // Filter out undefined values for Vercel Analytics
    const cleanEventData: Record<string, string | number | boolean> = eventData
      ? Object.fromEntries(
          Object.entries(eventData).filter(
            ([_, value]) => value !== undefined
          ) as [string, string | number | boolean][]
        )
      : {};
    track(eventName, { sessionId, userId: userId ?? "", ...cleanEventData });

    // Send to Google Analytics if available
    if (typeof window !== "undefined" && "gtag" in window) {
      // @ts-expect-error
      window.gtag("event", eventName, { sessionId, userId, ...cleanEventData });
    }
  } catch (error) {
    console.error("Error tracking event to Vercel:", error);
  }

  // Store in MongoDB via API (non-blocking)
  if (typeof window !== "undefined") {
    fetch("/api/analytics/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        eventType: eventName,
        sessionId,
        userId,
        metadata: eventData || {},
      }),
    }).catch((error) => {
      // Silently fail - analytics shouldn't break the app
      if (process.env.NODE_ENV === "development") {
        console.error("Error storing event in MongoDB:", error);
      }
    });
  }
}

/**
 * Track user session start
 */
export function trackUserSession(): string {
  const sessionId = getSessionId();
  const userId = getUserId();

  // Check if this is a returning user
  const lastVisit = localStorage.getItem("analytics_last_visit");
  const isReturning = !!lastVisit;
  const now = Date.now();

  if (!lastVisit || now - Number.parseInt(lastVisit, 10) > 30 * 60 * 1000) {
    // New session if no last visit or more than 30 minutes ago
    trackEvent(analyticsEvents.USER_VISIT, {
      isReturningUser: isReturning,
    });

    if (isReturning && userId) {
      trackEvent(analyticsEvents.USER_RETURN, { userId });
    }
  }

  localStorage.setItem("analytics_last_visit", now.toString());

  return sessionId;
}

/**
 * Track puzzle completion
 */
export function trackPuzzleCompletion(data: {
  puzzleId: string;
  puzzleType?: string;
  difficulty?: string;
  attempts: number;
  hintsUsed: number;
  completionTime?: number;
  score: number;
}): void {
  trackEvent(analyticsEvents.PUZZLE_COMPLETE, {
    puzzleId: data.puzzleId,
    puzzleType: data.puzzleType,
    difficulty: data.difficulty,
    attempts: data.attempts,
    hintsUsed: data.hintsUsed,
    completionTime: data.completionTime,
    score: data.score,
  });
}

/**
 * Track puzzle start
 */
export function trackPuzzleStart(data: {
  puzzleId: string;
  puzzleType?: string;
  difficulty?: string;
}): void {
  trackEvent(analyticsEvents.PUZZLE_START, {
    puzzleId: data.puzzleId,
    puzzleType: data.puzzleType,
    difficulty: data.difficulty,
  });
}

/**
 * Track puzzle abandonment
 */
export function trackPuzzleAbandon(data: {
  puzzleId: string;
  puzzleType?: string;
  attempts?: number;
  hintsUsed?: number;
}): void {
  trackEvent(analyticsEvents.PUZZLE_ABANDON, {
    puzzleId: data.puzzleId,
    puzzleType: data.puzzleType,
    attempts: data.attempts,
    hintsUsed: data.hintsUsed,
  });
}

/**
 * Track user return (server-side)
 */
export async function trackUserReturnServerSide(userId: string): Promise<void> {
  try {
    await fetch("/api/analytics/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        eventType: analyticsEvents.USER_RETURN,
        userId,
        sessionId: getSessionId(),
        metadata: {},
      }),
    });
  } catch (error) {
    // Silently fail
    if (process.env.NODE_ENV === "development") {
      console.error("Error tracking user return:", error);
    }
  }
}
