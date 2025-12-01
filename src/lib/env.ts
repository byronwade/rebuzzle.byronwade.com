/**
 * Environment Variable Validation
 *
 * Type-safe environment variable access with validation
 */

const isProduction = process.env.NODE_ENV === "production";

interface EnvConfig {
  // Application
  NEXT_PUBLIC_APP_URL: string;
  NODE_ENV: "development" | "production" | "test";

  // Database
  MONGODB_URI?: string;
  DATABASE_URL?: string;

  // AI
  AI_PROVIDER: "google" | "groq" | "xai" | "openai" | "gateway";
  AI_GATEWAY_API_KEY?: string;
  GOOGLE_AI_API_KEY?: string;
  GROQ_API_KEY?: string;
  XAI_API_KEY?: string;
  OPENAI_API_KEY?: string;

  // Email
  RESEND_API_KEY?: string;
  RESEND_FROM_EMAIL?: string;
  FROM_EMAIL?: string;

  // Security
  AUTH_SECRET?: string;
  CRON_SECRET?: string;
  VERCEL_CRON_SECRET?: string;
  VERCEL_OIDC_TOKEN?: string;
}

interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Get database URL (checks both MONGODB_URI and DATABASE_URL)
 */
export function getDatabaseUrl(): string {
  const url = process.env.MONGODB_URI || process.env.DATABASE_URL;
  if (!url) {
    throw new Error(
      "Database URL not found. Please set MONGODB_URI or DATABASE_URL environment variable."
    );
  }
  return url;
}

/**
 * Get application URL (required in production)
 */
export function getAppUrl(): string {
  const url = process.env.NEXT_PUBLIC_APP_URL;
  if (!url) {
    // During build time, allow fallback even in production
    // This prevents build failures when env vars aren't set locally
    const isBuildTime = process.env.NEXT_PHASE === "phase-production-build" || 
                       process.env.NEXT_PHASE === "phase-development-build";
    
    if (isProduction && !isBuildTime) {
      throw new Error(
        "NEXT_PUBLIC_APP_URL is required in production. Please set it in your environment variables."
      );
    }
    return "http://localhost:3000";
  }
  
  // Ensure URL has a protocol (default to https in production)
  if (!url.startsWith("http://") && !url.startsWith("https://")) {
    // In production, default to https; in development, default to http
    return isProduction ? `https://${url}` : `http://${url}`;
  }
  
  return url;
}

/**
 * Validate all environment variables
 */
export function validateEnv(): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Required in all environments
  try {
    getDatabaseUrl();
  } catch (error) {
    errors.push("Database URL (MONGODB_URI or DATABASE_URL) is required");
  }

  // Required in production
  if (isProduction) {
    if (!process.env.NEXT_PUBLIC_APP_URL) {
      errors.push("NEXT_PUBLIC_APP_URL is required in production");
    }

    // Validate URL format
    const appUrl = process.env.NEXT_PUBLIC_APP_URL;
    if (appUrl && !appUrl.startsWith("https://")) {
      warnings.push("NEXT_PUBLIC_APP_URL should use HTTPS in production");
    }
  }

  // AI Configuration
  const aiProvider = process.env.AI_PROVIDER || "google";
  if (aiProvider === "gateway") {
    if (!(process.env.AI_GATEWAY_API_KEY || process.env.VERCEL_OIDC_TOKEN)) {
      errors.push(
        "AI_GATEWAY_API_KEY or VERCEL_OIDC_TOKEN is required when using gateway provider"
      );
    }
  } else if (aiProvider === "google" && !process.env.GOOGLE_AI_API_KEY) {
    if (!process.env.AI_GATEWAY_API_KEY) {
      errors.push("GOOGLE_AI_API_KEY is required when using google provider");
    }
  } else if (aiProvider === "groq" && !process.env.GROQ_API_KEY) {
    errors.push("GROQ_API_KEY is required when using groq provider");
  } else if (aiProvider === "xai" && !process.env.XAI_API_KEY) {
    errors.push("XAI_API_KEY is required when using xai provider");
  } else if (aiProvider === "openai" && !process.env.OPENAI_API_KEY) {
    errors.push("OPENAI_API_KEY is required when using openai provider");
  }

  // Email configuration (optional but recommended)
  if (!process.env.RESEND_API_KEY) {
    warnings.push("RESEND_API_KEY not set - email notifications will not work");
  } else if (!(process.env.RESEND_FROM_EMAIL || process.env.FROM_EMAIL)) {
    warnings.push(
      "RESEND_FROM_EMAIL or FROM_EMAIL not set - email sending may fail"
    );
  }

  // Auth security (required in all environments)
  if (!process.env.AUTH_SECRET) {
    errors.push(
      "AUTH_SECRET is required for JWT token signing. " +
        "Generate one with: node -e \"console.log(require('crypto').randomBytes(32).toString('hex'))\""
    );
  }

  // Cron security (required in production)
  if (
    isProduction &&
    !(process.env.CRON_SECRET || process.env.VERCEL_CRON_SECRET)
  ) {
    errors.push("CRON_SECRET or VERCEL_CRON_SECRET is required in production");
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Validate and throw if invalid (use at startup)
 */
export function validateEnvOrThrow(): void {
  const result = validateEnv();

  if (result.warnings.length > 0) {
    console.warn("[Env Validation] Warnings:");
    result.warnings.forEach((warning) => console.warn(`  - ${warning}`));
  }

  if (!result.valid) {
    console.error("[Env Validation] Errors:");
    result.errors.forEach((error) => console.error(`  - ${error}`));
    throw new Error(
      "Environment validation failed. Please check your environment variables."
    );
  }
}
