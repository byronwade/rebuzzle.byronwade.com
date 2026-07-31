/**
 * Session Tracker
 *
 * Client-side session management and returning user detection
 */

const SESSION_ID_KEY = "analytics_session_id";
const LAST_VISIT_KEY = "analytics_last_visit";
const SESSION_START_KEY = "analytics_session_start";
const SESSION_TIMEOUT = 30 * 60 * 1000; // 30 minutes

export interface SessionData {
  sessionId: string;
  startTime: number;
  isReturningUser: boolean;
  userId?: string;
}

/**
 * Get or create session ID
 */
export function getSessionId(): string {
  if (typeof window === "undefined") {
    return `session_${Date.now()}_${Math.random().toString(36).substring(7)}`;
  }

  const stored = localStorage.getItem(SESSION_ID_KEY);
  if (stored) {
    return stored;
  }

  const sessionId = `session_${Date.now()}_${Math.random().toString(36).substring(7)}`;
  localStorage.setItem(SESSION_ID_KEY, sessionId);
  return sessionId;
}

/**
 * Initialize or get current session
 */
export function initializeSession(userId?: string): SessionData {
  if (typeof window === "undefined") {
    return {
      sessionId: getSessionId(),
      startTime: Date.now(),
      isReturningUser: false,
      userId,
    };
  }

  const now = Date.now();
  const lastVisit = localStorage.getItem(LAST_VISIT_KEY);
  const sessionStart = localStorage.getItem(SESSION_START_KEY);

  // Check if we need a new session (timeout or first visit)
  let isNewSession = true;
  let isReturningUser = false;

  if (lastVisit) {
    const _timeSinceLastVisit = now - Number.parseInt(lastVisit, 10);
    isReturningUser = true;

    if (sessionStart) {
      const sessionAge = now - Number.parseInt(sessionStart, 10);
      // Session is still active if less than timeout
      if (sessionAge < SESSION_TIMEOUT) {
        isNewSession = false;
      }
    }
  }

  const sessionId = getSessionId();

  if (isNewSession) {
    localStorage.setItem(SESSION_START_KEY, now.toString());
    localStorage.setItem(LAST_VISIT_KEY, now.toString());
  }

  return {
    sessionId,
    startTime: isNewSession ? now : Number.parseInt(sessionStart || now.toString(), 10),
    isReturningUser,
    userId,
  };
}

/**
 * End current session
 */
export function endSession(): void {
  if (typeof window === "undefined") {
    return;
  }

  const sessionStart = localStorage.getItem(SESSION_START_KEY);
  if (sessionStart) {
    const startTime = Number.parseInt(sessionStart, 10);
    const duration = Date.now() - startTime;

    // Send session end event (non-blocking)
    fetch("/api/analytics/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        eventType: "SESSION_END",
        sessionId: getSessionId(),
        metadata: { duration },
      }),
    }).catch(() => {
      // Silently fail
    });
  }

  // Clear session start (but keep session ID and last visit for continuity)
  localStorage.removeItem(SESSION_START_KEY);
}

/**
 * Update session with user ID (when user logs in)
 */
export function updateSessionUserId(userId: string): void {
  if (typeof window === "undefined") {
    return;
  }

  const _sessionData = initializeSession(userId);
  // Session is already initialized, just update the stored user context
  // The session ID remains the same
}

/**
 * Get current session data
 */
export function getCurrentSession(): SessionData | null {
  if (typeof window === "undefined") {
    return null;
  }

  const sessionId = getSessionId();
  const sessionStart = localStorage.getItem(SESSION_START_KEY);
  const lastVisit = localStorage.getItem(LAST_VISIT_KEY);

  if (!sessionStart) {
    return null;
  }

  let userId: string | undefined;
  try {
    const userStr = localStorage.getItem("user");
    if (userStr) {
      const user = JSON.parse(userStr);
      userId = user.id;
    }
  } catch {
    // Ignore parse errors
  }

  return {
    sessionId,
    startTime: Number.parseInt(sessionStart, 10),
    isReturningUser: !!lastVisit,
    userId,
  };
}

/**
 * Check if user is returning (has visited before)
 */
export function isReturningUser(): boolean {
  if (typeof window === "undefined") {
    return false;
  }

  const lastVisit = localStorage.getItem(LAST_VISIT_KEY);
  return !!lastVisit;
}

/**
 * Setup session tracking on page load
 * Call this when the app initializes
 */
export function setupSessionTracking(userId?: string): SessionData {
  const session = initializeSession(userId);

  // Track page visibility changes to detect session end
  if (typeof window !== "undefined") {
    document.addEventListener("visibilitychange", () => {
      if (document.hidden) {
        // Page is hidden, but don't end session yet (user might come back)
      } else {
        // Page is visible again - check if session expired
        const sessionStart = localStorage.getItem(SESSION_START_KEY);
        if (sessionStart) {
          const sessionAge = Date.now() - Number.parseInt(sessionStart, 10);
          if (sessionAge >= SESSION_TIMEOUT) {
            // Session expired, start new one
            initializeSession(userId);
          }
        }
      }
    });

    // Track beforeunload to end session
    window.addEventListener("beforeunload", () => {
      endSession();
    });
  }

  return session;
}
