/**
 * Environment Variable Validation
 *
 * Type-safe environment variable access with validation
 */

function isProduction(): boolean {
  return process.env.NODE_ENV === "production";
}

interface EnvConfig {
  // Application
  NEXT_PUBLIC_APP_URL: string;
  NODE_ENV: "development" | "production" | "test";

  // Database (Vercel MongoDB marketplace sets REBUZZLE_MONGODB_URI)
  REBUZZLE_MONGODB_URI?: string;
  MONGODB_URI?: string;
  DATABASE_URL?: string;
  MONGODB_DB?: string;

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

  // GitHub blog pull requests
  GITHUB_BLOG_TOKEN?: string;
  GITHUB_BLOG_APP_ID?: string;
  GITHUB_BLOG_APP_INSTALLATION_ID?: string;
  GITHUB_BLOG_APP_PRIVATE_KEY?: string;
  GITHUB_BLOG_REPOSITORY?: string;
  GITHUB_BLOG_BASE_BRANCH?: string;
  GITHUB_BLOG_PR_DRAFT?: string;
}

interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Get database URL.
 * Prefers Vercel marketplace `REBUZZLE_MONGODB_URI`, then `MONGODB_URI`, then `DATABASE_URL`.
 */
export function getDatabaseUrl(): string {
  const configured = [
    process.env.REBUZZLE_MONGODB_URI,
    process.env.MONGODB_URI,
    process.env.DATABASE_URL,
  ].filter((value): value is string => Boolean(value?.trim()));
  if (!configured.length) {
    throw new Error(
      "Database URL not found. Please set REBUZZLE_MONGODB_URI, MONGODB_URI, or DATABASE_URL."
    );
  }
  const mongoUrl = configured.find((value) => /^mongodb(?:\+srv)?:\/\//i.test(value.trim()));
  if (!mongoUrl) {
    throw new Error(
      "Database URL is configured but invalid. Expected a mongodb:// or mongodb+srv:// URI."
    );
  }
  return mongoUrl.trim();
}

/** Default MongoDB database name when the URI has no path segment. */
export function getMongoDatabaseName(): string {
  return process.env.MONGODB_DB || "rebuzzle";
}

/**
 * Get application URL (required in production)
 */
export function getAppUrl(): string {
  const url = process.env.NEXT_PUBLIC_APP_URL;
  if (!url) {
    // During build time, allow fallback even in production
    // This prevents build failures when env vars aren't set locally
    const isBuildTime =
      process.env.NEXT_PHASE === "phase-production-build" ||
      process.env.NEXT_PHASE === "phase-development-build";

    if (isProduction() && !isBuildTime) {
      throw new Error(
        "NEXT_PUBLIC_APP_URL is required in production. Please set it in your environment variables."
      );
    }
    return "http://localhost:3000";
  }

  // Ensure URL has a protocol (default to https in production)
  if (!url.startsWith("http://") && !url.startsWith("https://")) {
    // In production, default to https; in development, default to http
    return isProduction() ? `https://${url}` : `http://${url}`;
  }

  return url;
}

/**
 * Validate all environment variables
 */
export function validateEnv(): ValidationResult {
  const issues: string[] = [];
  const warnings: string[] = [];

  // Required in all environments
  try {
    getDatabaseUrl();
  } catch (_error) {
    issues.push("Database URL (REBUZZLE_MONGODB_URI, MONGODB_URI, or DATABASE_URL) is required");
  }

  // Required in production
  if (isProduction()) {
    if (!process.env.NEXT_PUBLIC_APP_URL) {
      issues.push("NEXT_PUBLIC_APP_URL is required in production");
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
      issues.push(
        "AI_GATEWAY_API_KEY or VERCEL_OIDC_TOKEN is required when using gateway provider"
      );
    }
  } else if (aiProvider === "google" && !process.env.GOOGLE_AI_API_KEY) {
    if (!process.env.AI_GATEWAY_API_KEY) {
      issues.push("GOOGLE_AI_API_KEY is required when using google provider");
    }
  } else if (aiProvider === "groq" && !process.env.GROQ_API_KEY) {
    issues.push("GROQ_API_KEY is required when using groq provider");
  } else if (aiProvider === "xai" && !process.env.XAI_API_KEY) {
    issues.push("XAI_API_KEY is required when using xai provider");
  } else if (aiProvider === "openai" && !process.env.OPENAI_API_KEY) {
    issues.push("OPENAI_API_KEY is required when using openai provider");
  }

  // Email configuration (optional but recommended)
  if (!process.env.RESEND_API_KEY) {
    warnings.push("RESEND_API_KEY not set - email notifications will not work");
  } else if (!(process.env.RESEND_FROM_EMAIL || process.env.FROM_EMAIL)) {
    warnings.push("RESEND_FROM_EMAIL or FROM_EMAIL not set - email sending may fail");
  }

  // Auth security (required in all environments)
  if (!process.env.AUTH_SECRET) {
    issues.push(
      "AUTH_SECRET is required for JWT token signing. " +
        "Generate one with: node -e \"console.log(require('crypto').randomBytes(32).toString('hex'))\""
    );
  }

  // Cron security (required in production)
  if (isProduction() && !(process.env.CRON_SECRET || process.env.VERCEL_CRON_SECRET)) {
    issues.push("CRON_SECRET or VERCEL_CRON_SECRET is required in production");
  }

  const hasGitHubToken = Boolean(process.env.GITHUB_BLOG_TOKEN?.trim());
  const hasGitHubApp = Boolean(
    process.env.GITHUB_BLOG_APP_ID?.trim() &&
      process.env.GITHUB_BLOG_APP_INSTALLATION_ID?.trim() &&
      process.env.GITHUB_BLOG_APP_PRIVATE_KEY?.trim()
  );
  if (!(hasGitHubToken || hasGitHubApp)) {
    warnings.push(
      "GitHub blog PR authentication is not configured - Eve cannot open blog pull requests"
    );
  }

  return {
    valid: issues.length === 0,
    errors: issues,
    warnings,
  };
}

/**
 * Validate and throw if invalid (use at startup)
 */
export function validateEnvOrThrow(): void {
  const result = validateEnv();

  if (result.warnings.length > 0) {
    // Single line keeps Vercel log noise down (cold starts re-run this often).
    console.warn(
      `[Env Validation] Warnings (${result.warnings.length}): ${result.warnings.join("; ")}`
    );
  }

  if (!result.valid) {
    console.error("[Env Validation] Errors:");
    const envIssues = result.errors;
    for (const issue of envIssues) {
      console.error(`  - ${issue}`);
    }
    throw new Error("Environment validation failed. Please check your environment variables.");
  }
}
