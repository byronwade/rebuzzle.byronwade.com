/**
 * Structured Logging
 *
 * Centralized logging with levels and structured output
 * In production, integrates with Vercel Logs or other logging services
 */

type LogLevel = "debug" | "info" | "warn" | "error";

interface LogContext {
  [key: string]: unknown;
}

const isProduction = process.env.NODE_ENV === "production";
const isDevelopment = process.env.NODE_ENV === "development";

/**
 * Sanitize sensitive data from logs
 */
function sanitizeData(data: unknown): unknown {
  if (typeof data !== "object" || data === null) {
    return data;
  }

  const sensitiveKeys = [
    "password",
    "token",
    "secret",
    "apiKey",
    "apikey",
    "authorization",
    "cookie",
    "session",
  ];

  if (Array.isArray(data)) {
    return data.map(sanitizeData);
  }

  const sanitized: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(data)) {
    const lowerKey = key.toLowerCase();
    if (sensitiveKeys.some((sensitive) => lowerKey.includes(sensitive))) {
      sanitized[key] = "[REDACTED]";
    } else {
      sanitized[key] = sanitizeData(value);
    }
  }

  return sanitized;
}

/**
 * Format log entry
 */
function formatLog(
  level: LogLevel,
  message: string,
  context?: LogContext,
  error?: Error
): string {
  const timestamp = new Date().toISOString();
  const logEntry: Record<string, unknown> = {
    timestamp,
    level,
    message,
    ...(context && { context: sanitizeData(context) }),
    ...(error && {
      error: {
        name: error.name,
        message: error.message,
        ...(isDevelopment && { stack: error.stack }),
      },
    }),
  };

  return JSON.stringify(logEntry);
}

/**
 * Logger class
 */
class Logger {
  private log(
    level: LogLevel,
    message: string,
    context?: LogContext,
    error?: Error
  ): void {
    const formatted = formatLog(level, message, context, error);

    // In production, use structured logging
    // In development, use console with colors
    if (isProduction) {
      // In production, all logs go to stdout/stderr
      // Vercel and other platforms will capture these
      if (level === "error") {
        console.error(formatted);
      } else if (level === "warn") {
        console.warn(formatted);
      } else {
        console.log(formatted);
      }
    } else {
      // Development: use console methods with formatting
      const prefix = `[${level.toUpperCase()}]`;
      if (error) {
        console.error(prefix, message, context, error);
      } else if (context) {
        console.log(prefix, message, context);
      } else {
        console.log(prefix, message);
      }
    }
  }

  debug(message: string, context?: LogContext): void {
    if (isDevelopment) {
      this.log("debug", message, context);
    }
  }

  info(message: string, context?: LogContext): void {
    this.log("info", message, context);
  }

  warn(message: string, context?: LogContext): void {
    this.log("warn", message, context);
  }

  error(message: string, error?: Error, context?: LogContext): void {
    this.log("error", message, context, error);
  }
}

// Export singleton instance
export const logger = new Logger();

// Export for convenience
export default logger;

