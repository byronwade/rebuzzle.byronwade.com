/**
 * AI Client — Vercel AI Gateway only
 *
 * All model calls route through AI Gateway (`provider/model` ids).
 * Auth: `AI_GATEWAY_API_KEY` (vck_…) locally, or Vercel OIDC on Vercel.
 * Never promote OIDC JWTs into AI_GATEWAY_API_KEY — that forces api-key
 * auth and causes "Unauthenticated" on production.
 */

import { createGateway, type GatewayProviderOptions, gateway } from "@ai-sdk/gateway";
import { generateText, type LanguageModel, Output, streamText } from "ai";
import type { z } from "zod";
import { AI_CONFIG, validateApiKeys } from "./config";
import { AIProviderError, isHardAIBudgetError, parseAIError, QuotaExceededError } from "./errors";
import { assertGatewayAuthConfigured, ensureGatewayKey, getGatewayApiKey } from "./gateway-auth";
import { enforceQuota } from "./quota-manager";

export type ModelTier = "fast" | "smart" | "creative";

export {
  assertGatewayAuthConfigured,
  ensureGatewayKey,
  formatGatewayAuthError,
  getGatewayApiKey,
  getGatewayAuthDiagnostics,
  isGatewayAuthError,
  probeGatewayAuth,
} from "./gateway-auth";

/** Shared gateway provider — API key when present, else OIDC on Vercel. */
export function getAiGateway() {
  const apiKey = getGatewayApiKey();
  return apiKey ? createGateway({ apiKey }) : gateway;
}

/** Resolve a gateway language model for a tier (primary only). */
export function getGatewayModel(tier: ModelTier = "smart"): LanguageModel {
  ensureGatewayKey();
  assertGatewayAuthConfigured();
  const validation = validateApiKeys();
  if (!validation.valid) {
    throw new Error(`Missing API keys: ${validation.missing.join(", ")}`);
  }
  return getAiGateway()(AI_CONFIG.models.gateway[tier]);
}

/** Primary + fallback gateway model ids for a tier. */
export function getGatewayModelChain(tier: ModelTier = "smart"): string[] {
  const primary = AI_CONFIG.models.gateway[tier];
  const fallbacks = AI_CONFIG.models.fallbacks.gateway[tier] ?? [];
  return Array.from(new Set([primary, ...fallbacks]));
}

function gatewayProviderOptions(operation: string) {
  const safeOperation = operation
    .toLowerCase()
    .replace(/[^a-z0-9:_-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64);
  return {
    gateway: {
      tags: ["rebuzzle", `operation:${safeOperation || "unknown"}`],
    } satisfies GatewayProviderOptions,
  };
}

function usageFromResult(usage: {
  inputTokens?: number;
  outputTokens?: number;
  promptTokens?: number;
  completionTokens?: number;
  totalTokens?: number;
}): { promptTokens: number; completionTokens: number; totalTokens: number } {
  const promptTokens = usage.inputTokens ?? usage.promptTokens ?? 0;
  const completionTokens = usage.outputTokens ?? usage.completionTokens ?? 0;
  return {
    promptTokens,
    completionTokens,
    totalTokens: usage.totalTokens ?? promptTokens + completionTokens,
  };
}

function isRetryableModelError(error: unknown): boolean {
  if (isHardAIBudgetError(error)) return false;
  const parsed = parseAIError(error);
  if (parsed instanceof QuotaExceededError || parsed.code === "QUOTA_EXCEEDED") return true;
  if (parsed.code === "RATE_LIMIT" || parsed.code === "MODEL_NOT_FOUND") return true;
  if (parsed instanceof AIProviderError && parsed.statusCode === 503) return true;
  const msg = parsed.message.toLowerCase();
  return (
    msg.includes("not found") ||
    msg.includes("not supported") ||
    (msg.includes("gateway") && msg.includes("failed"))
  );
}

/**
 * Generate text via AI Gateway with tier fallbacks.
 */
export async function generateAIText(params: {
  prompt: string;
  system?: string;
  temperature?: number;
  maxTokens?: number;
  modelType?: ModelTier;
  operation?: string;
}): Promise<{
  text: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  finishReason: string;
  modelUsed?: string;
}> {
  await enforceQuota();
  ensureGatewayKey();
  assertGatewayAuthConfigured();

  const tier = params.modelType ?? "smart";
  const modelsToTry = getGatewayModelChain(tier);
  let lastError: Error | null = null;

  for (let i = 0; i < modelsToTry.length; i++) {
    const modelId = modelsToTry[i];
    if (!modelId) continue;

    try {
      const result = await generateText({
        model: getAiGateway()(modelId),
        prompt: params.prompt,
        system: params.system,
        temperature: params.temperature ?? AI_CONFIG.generation.temperature.balanced,
        maxOutputTokens: params.maxTokens,
        maxRetries: 0,
        providerOptions: gatewayProviderOptions(params.operation ?? "text"),
        abortSignal: AbortSignal.timeout(AI_CONFIG.timeouts.default),
      });

      return {
        text: result.text,
        usage: usageFromResult(result.usage ?? {}),
        finishReason: result.finishReason,
        modelUsed: modelId,
      };
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      const isLast = i === modelsToTry.length - 1;
      if (!isRetryableModelError(error) || isLast) {
        throw parseAIError(error);
      }
    }
  }

  throw lastError ?? new Error("All gateway models failed");
}

/**
 * Generate a structured object via AI Gateway (`Output.object`).
 */
export async function generateAIObject<T>(params: {
  prompt: string;
  system?: string;
  schema: z.ZodType<T>;
  temperature?: number;
  modelType?: ModelTier;
  operation?: string;
}): Promise<T> {
  await enforceQuota();
  ensureGatewayKey();
  assertGatewayAuthConfigured();

  const tier = params.modelType ?? "smart";
  const modelsToTry = getGatewayModelChain(tier);
  let lastError: Error | null = null;

  for (let i = 0; i < modelsToTry.length; i++) {
    const modelId = modelsToTry[i];
    if (!modelId) continue;

    try {
      const result = await generateText({
        model: getAiGateway()(modelId),
        prompt: params.prompt,
        system: params.system,
        temperature: params.temperature ?? AI_CONFIG.generation.temperature.balanced,
        output: Output.object({ schema: params.schema }),
        maxRetries: 0,
        providerOptions: gatewayProviderOptions(params.operation ?? "structured"),
        abortSignal: AbortSignal.timeout(AI_CONFIG.timeouts.default),
      });

      if (result.output == null) {
        throw new Error("Model returned no structured output");
      }
      return result.output;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      const isLast = i === modelsToTry.length - 1;
      if (!isRetryableModelError(error) || isLast) {
        throw parseAIError(error);
      }
    }
  }

  throw lastError ?? new Error("All gateway models failed");
}

/**
 * Generate a structured result from rendered pixels.
 *
 * Callers provide an explicit vision model so independent judges can be used
 * without accidentally collapsing an ensemble onto one fallback model.
 */
export async function generateAIObjectFromImage<T>(params: {
  prompt: string;
  system?: string;
  schema: z.ZodType<T>;
  image: Uint8Array;
  mediaType: string;
  modelId: string;
  temperature?: number;
  operation?: string;
}): Promise<T> {
  await enforceQuota();
  ensureGatewayKey();
  assertGatewayAuthConfigured();

  const result = await generateText({
    model: getAiGateway()(params.modelId),
    system: params.system,
    messages: [
      {
        role: "user",
        content: [
          { type: "text", text: params.prompt },
          { type: "file", data: params.image, mediaType: params.mediaType },
        ],
      },
    ],
    temperature: params.temperature ?? AI_CONFIG.generation.temperature.factual,
    output: Output.object({ schema: params.schema }),
    maxRetries: 0,
    providerOptions: gatewayProviderOptions(params.operation ?? "vision"),
    abortSignal: AbortSignal.timeout(AI_CONFIG.timeouts.default),
  });

  if (result.output == null) {
    throw new Error(`Vision model ${params.modelId} returned no structured output`);
  }

  return result.output;
}

/**
 * Stream text via AI Gateway.
 */
export async function streamAIText(params: {
  prompt: string;
  system?: string;
  temperature?: number;
  maxTokens?: number;
  modelType?: ModelTier;
  operation?: string;
}): Promise<ReturnType<typeof streamText>> {
  await enforceQuota();
  ensureGatewayKey();

  try {
    return streamText({
      model: getGatewayModel(params.modelType ?? "smart"),
      prompt: params.prompt,
      system: params.system,
      temperature: params.temperature ?? AI_CONFIG.generation.temperature.balanced,
      maxOutputTokens: params.maxTokens,
      maxRetries: 0,
      providerOptions: gatewayProviderOptions(params.operation ?? "stream"),
      abortSignal: AbortSignal.timeout(AI_CONFIG.timeouts.streaming),
    });
  } catch (error) {
    throw parseAIError(error);
  }
}

/** @deprecated Prefer getGatewayModel / gateway model ids. Kept for call-site compatibility. */
export function getAIProvider(): {
  getName: () => "gateway";
  getProvider: () => ReturnType<typeof createGateway>;
  getModel: (tier?: ModelTier) => string;
  getFallbackModels: (tier?: ModelTier) => readonly string[];
  getAllModels: (tier?: ModelTier) => string[];
  getModelInstance: (tier?: ModelTier) => LanguageModel;
} {
  const apiKey = getGatewayApiKey();
  const gw = apiKey ? createGateway({ apiKey }) : createGateway();
  return {
    getName: () => "gateway" as const,
    getProvider: () => gw,
    getModel: (tier: ModelTier = "smart") => AI_CONFIG.models.gateway[tier],
    getFallbackModels: (tier: ModelTier = "smart") =>
      AI_CONFIG.models.fallbacks.gateway[tier] ?? [],
    getAllModels: (tier: ModelTier = "smart") => getGatewayModelChain(tier),
    getModelInstance: (tier: ModelTier = "smart") => gw(AI_CONFIG.models.gateway[tier]),
  };
}

export { AIError } from "./errors";

export async function withRetry<T>(
  operation: () => Promise<T>,
  maxAttempts = AI_CONFIG.retry.maxAttempts
): Promise<T> {
  let lastError: Error | undefined;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await operation();
    } catch (error) {
      const parsed = parseAIError(error);
      lastError = parsed;
      if (parsed.code === "QUOTA_EXCEEDED" || parsed.code === "AI_BUDGET_EXCEEDED") {
        throw parsed;
      }
      if (attempt < maxAttempts) {
        const delay = Math.min(
          AI_CONFIG.retry.initialDelay * AI_CONFIG.retry.backoffMultiplier ** (attempt - 1),
          AI_CONFIG.retry.maxDelay
        );
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError ?? new Error("Operation failed after retries");
}
