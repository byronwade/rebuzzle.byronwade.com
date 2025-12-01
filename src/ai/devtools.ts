/**
 * AI DevTools Configuration
 *
 * Development tools for monitoring AI operations, agent activity, and tool usage
 * Only enabled in development mode
 */

/**
 * Check if devtools should be enabled
 */
export function isDevToolsEnabled(): boolean {
  return (
    process.env.NODE_ENV === "development" &&
    process.env.AI_DEVTOOLS_ENABLED !== "false"
  );
}

/**
 * Get devtools configuration
 * Returns null if devtools should not be enabled
 */
export function getDevToolsConfig(): {
  logToolCalls: boolean;
  logAgentActivity: boolean;
  logPerformance: boolean;
  logStreamingEvents: boolean;
} | null {
  if (!isDevToolsEnabled()) {
    return null;
  }

  return {
    // Enable logging of tool calls
    logToolCalls: true,

    // Enable logging of agent activity
    logAgentActivity: true,

    // Enable performance metrics
    logPerformance: true,

    // Enable streaming event logging
    logStreamingEvents: true,
  };
}

/**
 * Log agent activity (wrapper for devtools)
 */
export function logAgentActivity(
  agent: string,
  action: string,
  data?: Record<string, unknown>
): void {
  if (!isDevToolsEnabled()) {
    return;
  }

  console.log(`[AI Agent: ${agent}] ${action}`, data || {});
}

/**
 * Log tool usage
 */
export function logToolUsage(
  tool: string,
  params: Record<string, unknown>,
  result?: unknown
): void {
  if (!isDevToolsEnabled()) {
    return;
  }

  console.log(`[AI Tool: ${tool}]`, {
    params,
    result:
      result !== undefined
        ? typeof result === "object"
          ? JSON.stringify(result).substring(0, 200)
          : result
        : undefined,
  });
}

/**
 * Log performance metric
 */
export function logPerformance(
  operation: string,
  durationMs: number,
  metadata?: Record<string, unknown>
): void {
  if (!isDevToolsEnabled()) {
    return;
  }

  console.log(`[AI Performance] ${operation}: ${durationMs}ms`, metadata || {});
}
