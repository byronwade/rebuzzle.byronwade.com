/**
 * AI Client — Vercel AI Gateway only
 *
 * All model calls route through AI Gateway (`provider/model` ids).
 * Auth: `AI_GATEWAY_API_KEY` locally, or Vercel OIDC on Vercel.
 */

import { createGateway, gateway } from "@ai-sdk/gateway";
import { generateText, type LanguageModel, Output, streamText } from "ai";
import type { z } from "zod";
import { AI_CONFIG, validateApiKeys } from "./config";
import { AIError, AIProviderError, parseAIError, QuotaExceededError } from "./errors";
import { enforceQuota } from "./quota-manager";

export type ModelTier = "fast" | "smart" | "creative";

/** Ensure gateway auth env is set (OIDC token → AI_GATEWAY_API_KEY). */
export function ensureGatewayKey(): void {
  const key = AI_CONFIG.gateway.apiKey;
  if (key && !process.env.AI_GATEWAY_API_KEY) {
    process.env.AI_GATEWAY_API_KEY = key;
  }
}

/** Resolve a gateway language model for a tier (primary only). */
export function getGatewayModel(tier: ModelTier = "smart"): LanguageModel {
  ensureGatewayKey();
  const validation = validateApiKeys();
  if (!validation.valid) {
    throw new Error(`Missing API keys: ${validation.missing.join(", ")}`);
  }
  return gateway(AI_CONFIG.models.gateway[tier]);
}

/** Primary + fallback gateway model ids for a tier. */
export function getGatewayModelChain(tier: ModelTier = "smart"): string[] {
  const primary = AI_CONFIG.models.gateway[tier];
  const fallbacks = AI_CONFIG.models.fallbacks.gateway[tier] ?? [];
  return Array.from(new Set([primary, ...fallbacks]));
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

  const tier = params.modelType ?? "smart";
  const modelsToTry = getGatewayModelChain(tier);
  let lastError: Error | null = null;

  for (let i = 0; i < modelsToTry.length; i++) {
    const modelId = modelsToTry[i];
    if (!modelId) continue;

    try {
      const result = await generateText({
        model: gateway(modelId),
        prompt: params.prompt,
        system: params.system,
        temperature: params.temperature ?? AI_CONFIG.generation.temperature.balanced,
        maxOutputTokens: params.maxTokens,
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
}): Promise<T> {
  await enforceQuota();
  ensureGatewayKey();

  const tier = params.modelType ?? "smart";
  const modelsToTry = getGatewayModelChain(tier);
  let lastError: Error | null = null;

  for (let i = 0; i < modelsToTry.length; i++) {
    const modelId = modelsToTry[i];
    if (!modelId) continue;

    try {
      const result = await generateText({
        model: gateway(modelId),
        prompt: params.prompt,
        system: params.system,
        temperature: params.temperature ?? AI_CONFIG.generation.temperature.balanced,
        output: Output.object({ schema: params.schema }),
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
 * Stream text via AI Gateway.
 */
export async function streamAIText(params: {
  prompt: string;
  system?: string;
  temperature?: number;
  maxTokens?: number;
  modelType?: ModelTier;
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
  ensureGatewayKey();
  const gw = createGateway({
    apiKey: AI_CONFIG.gateway.apiKey || undefined,
  });
  return {
    getName: () => "gateway" as const,
    getProvider: () => gw,
    getModel: (tier: ModelTier = "smart") => AI_CONFIG.models.gateway[tier],
    getFallbackModels: (tier: ModelTier = "smart") =>
      AI_CONFIG.models.fallbacks.gateway[tier] ?? [],
    getAllModels: (tier: ModelTier = "smart") => getGatewayModelChain(tier),
    getModelInstance: (tier: ModelTier = "smart") => gateway(AI_CONFIG.models.gateway[tier]),
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
      lastError = error instanceof Error ? error : new Error(String(error));
      if (error instanceof AIError && error.code === "QUOTA_EXCEEDED") {
        throw error;
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
