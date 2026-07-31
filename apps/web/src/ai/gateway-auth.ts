/**
 * AI Gateway auth helpers.
 *
 * Important: never promote VERCEL_OIDC_TOKEN into AI_GATEWAY_API_KEY.
 * The SDK authenticates API keys with authMethod "api-key" and OIDC with
 * authMethod "oidc". Stuffing a JWT into AI_GATEWAY_API_KEY breaks production.
 *
 * Production auth options:
 * 1. Set AI_GATEWAY_API_KEY (vck_…) in Vercel Project Settings → Environment
 *    Variables for Production AND Preview
 * 2. Or enable Settings → Security → OIDC Federation (x-vercel-oidc-token)
 *
 * Local .env.local is NOT available on the live deployment.
 */

export type GatewayAuthPath = "api-key" | "oidc" | "missing";

export interface GatewayAuthDiagnostics {
  apiKeyPresent: boolean;
  oidcEnvPresent: boolean;
  onVercel: boolean;
  vercelEnv: string | null;
  authPath: GatewayAuthPath;
  /** True when we expect a gateway call to be able to authenticate. */
  likelyConfigured: boolean;
}

/** True when a value looks like a JWT (OIDC), not a gateway API key. */
export function looksLikeJwt(value: string): boolean {
  if (value.startsWith("vck_")) return false;
  const parts = value.split(".");
  return parts.length === 3 && parts.every((p) => p.length > 4);
}

/**
 * Sanitize gateway auth env before SDK calls.
 * - Keep real API keys in AI_GATEWAY_API_KEY
 * - Move misplaced OIDC JWTs out of AI_GATEWAY_API_KEY so the SDK uses OIDC
 */
export function ensureGatewayKey(): void {
  const key = process.env.AI_GATEWAY_API_KEY?.trim();
  if (key && looksLikeJwt(key)) {
    const oidc = process.env.VERCEL_OIDC_TOKEN?.trim();
    if (!oidc || oidc === "undefined") {
      process.env.VERCEL_OIDC_TOKEN = key;
    }
    // delete — assigning undefined becomes the string "undefined" in Node
    // biome-ignore lint/performance/noDelete: must remove env key entirely
    delete process.env.AI_GATEWAY_API_KEY;
  }
}

/** Runtime gateway API key (never an OIDC JWT). */
export function getGatewayApiKey(): string | undefined {
  ensureGatewayKey();
  const key = process.env.AI_GATEWAY_API_KEY?.trim();
  if (!key || key === "undefined" || looksLikeJwt(key)) return undefined;
  return key;
}

export function getGatewayAuthDiagnostics(): GatewayAuthDiagnostics {
  ensureGatewayKey();
  const apiKey = getGatewayApiKey();
  const onVercel = Boolean(process.env.VERCEL);
  const oidcEnvPresent = Boolean(
    process.env.VERCEL_OIDC_TOKEN && process.env.VERCEL_OIDC_TOKEN !== "undefined"
  );
  const authPath: GatewayAuthPath = apiKey ? "api-key" : onVercel ? "oidc" : "missing";

  return {
    apiKeyPresent: Boolean(apiKey),
    oidcEnvPresent,
    onVercel,
    vercelEnv: process.env.VERCEL_ENV ?? null,
    authPath,
    // On Vercel, OIDC may arrive via x-vercel-oidc-token even when the env var
    // is absent — treat onVercel without an api key as "maybe ok, probe later".
    likelyConfigured: Boolean(apiKey) || onVercel,
  };
}

/** User-facing remediation when gateway auth is missing or rejected. */
export function formatGatewayAuthError(diagnostics?: GatewayAuthDiagnostics): string {
  const d = diagnostics ?? getGatewayAuthDiagnostics();

  if (!d.apiKeyPresent && !d.onVercel) {
    return (
      "AI Gateway is not authenticated. Set AI_GATEWAY_API_KEY (vck_…) in apps/web/.env.local " +
      "and restart the dev server. Learn more: https://ai-sdk.dev/unauthenticated-ai-gateway"
    );
  }

  if (!d.apiKeyPresent && d.onVercel) {
    return (
      "AI Gateway Unauthenticated on this Vercel deployment. " +
      "Add AI_GATEWAY_API_KEY (vck_…) in Vercel → Project Settings → Environment Variables " +
      "for Production and Preview (local .env.local is not used here), " +
      "or enable Settings → Security → OIDC Federation. " +
      "Learn more: https://ai-sdk.dev/unauthenticated-ai-gateway"
    );
  }

  return (
    "AI Gateway authentication failed. The configured AI_GATEWAY_API_KEY may be invalid or revoked, " +
    "or OIDC Federation may be disabled. Check Vercel → AI Gateway → API Keys and " +
    "Project Settings → Environment Variables. " +
    "Learn more: https://ai-sdk.dev/unauthenticated-ai-gateway"
  );
}

export function isGatewayAuthError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  const name = error instanceof Error ? error.name : "";
  return (
    name === "GatewayAuthenticationError" ||
    name === "GatewayError" ||
    /unauthenticated/i.test(message) ||
    /ai_gateway_api_key/i.test(message) ||
    /oidc token/i.test(message) ||
    /x-vercel-oidc-token/i.test(message)
  );
}

/**
 * Throw a clear, actionable error when auth is obviously missing
 * (no API key and not running on Vercel).
 */
export function assertGatewayAuthConfigured(): void {
  const d = getGatewayAuthDiagnostics();
  if (!d.likelyConfigured) {
    throw new Error(formatGatewayAuthError(d));
  }
}

export type GatewayAuthProbeResult =
  | { ok: true; diagnostics: GatewayAuthDiagnostics; balance?: string }
  | { ok: false; diagnostics: GatewayAuthDiagnostics; error: string };

/**
 * Live probe via gateway.getCredits(). Call before expensive generation in Dev Mode.
 */
export async function probeGatewayAuth(): Promise<GatewayAuthProbeResult> {
  const diagnostics = getGatewayAuthDiagnostics();

  if (!diagnostics.likelyConfigured) {
    return {
      ok: false,
      diagnostics,
      error: formatGatewayAuthError(diagnostics),
    };
  }

  try {
    // Lazy import avoids circular dependency with client.ts
    const { getAiGateway } = await import("./client");
    const credits = await getAiGateway().getCredits();
    return {
      ok: true,
      diagnostics,
      balance: credits.balance,
    };
  } catch (error) {
    const base = isGatewayAuthError(error)
      ? formatGatewayAuthError(diagnostics)
      : error instanceof Error
        ? error.message
        : "AI Gateway probe failed";
    return {
      ok: false,
      diagnostics,
      error: base,
    };
  }
}
