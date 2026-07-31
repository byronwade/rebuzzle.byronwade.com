/**
 * AI Gateway auth helpers.
 *
 * Important: never promote VERCEL_OIDC_TOKEN into AI_GATEWAY_API_KEY.
 * The SDK authenticates API keys with authMethod "api-key" and OIDC with
 * authMethod "oidc". Stuffing a JWT into AI_GATEWAY_API_KEY breaks production.
 */

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
