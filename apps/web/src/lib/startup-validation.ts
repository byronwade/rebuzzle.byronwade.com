/**
 * Startup Validation
 *
 * Validates environment variables and configuration at application startup
 * Call this in your API routes or middleware to ensure proper configuration
 */

import { validateEnvOrThrow } from "./env";

let validated = false;

/**
 * Validate environment on startup
 * Call this once when the application starts
 */
export function validateStartup(): void {
  if (validated) {
    return;
  }

  try {
    validateEnvOrThrow();
    validated = true;
    console.log("[Startup] Environment validation passed");
  } catch (error) {
    console.error("[Startup] Environment validation failed:", error);
    throw error;
  }
}

/**
 * Lazy validation - validates on first access
 */
export function ensureValidated(): void {
  if (!validated) {
    validateStartup();
  }
}
