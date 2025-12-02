/**
 * AI Client
 *
 * Provider-agnostic AI client with quota management,
 * error handling, and automatic fallback
 */

import { createGateway } from "@ai-sdk/gateway";
import { google } from "@ai-sdk/google";
import { createGroq } from "@ai-sdk/groq";
import { createXai } from "@ai-sdk/xai";
import { generateObject, generateText, streamText } from "ai";
import type { z } from "zod";
import { AI_CONFIG, validateApiKeys } from "./config";
import { AIError, AIProviderError, parseAIError, QuotaExceededError } from "./errors";
import { enforceQuota } from "./quota-manager";

type ProviderInstance =
  | ReturnType<typeof createGroq>
  | ReturnType<typeof createXai>
  | typeof google
  | ReturnType<typeof createGateway>;

// Type for AI SDK usage object (varies by provider)
interface AIUsage {
  promptTokens?: number;
  completionTokens?: number;
  totalTokens?: number;
  promptTokenCount?: number;
  candidatesTokenCount?: number;
  [key: string]: unknown;
}

/**
 * AI Provider abstraction
 */
class AIProvider {
  private provider: ProviderInstance;
  private providerName: string;

  constructor() {
    const validation = validateApiKeys();

    if (!validation.valid) {
      throw new Error(
        `Missing API keys: ${validation.missing.join(", ")}. Please set them in your .env file.`
      );
    }

    this.providerName = AI_CONFIG.defaultProvider;

    // Initialize provider based on config
    switch (AI_CONFIG.defaultProvider) {
      case "google": {
        // Direct Google provider - requires GOOGLE_AI_API_KEY
        // NOTE: Use "gateway" provider instead to use only AI_GATEWAY_API_KEY
        const apiKey = process.env.GOOGLE_AI_API_KEY;
        if (!apiKey) {
          throw new Error(
            "GOOGLE_AI_API_KEY is required for direct Google provider. " +
              "Use AI_PROVIDER=gateway with only AI_GATEWAY_API_KEY instead."
          );
        }
        if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
          process.env.GOOGLE_GENERATIVE_AI_API_KEY = apiKey;
        }
        this.provider = google;
        console.log("[AI] Using Google AI (Gemini) directly - requires GOOGLE_AI_API_KEY");
        console.log("[AI] ⚠️ Consider using gateway provider with only AI_GATEWAY_API_KEY instead");
        break;
      }
      case "groq":
        // Direct Groq provider - requires GROQ_API_KEY
        // NOTE: Use "gateway" provider instead to use only AI_GATEWAY_API_KEY
        if (!process.env.GROQ_API_KEY) {
          throw new Error(
            "GROQ_API_KEY is required for direct Groq provider. " +
              "Use AI_PROVIDER=gateway with only AI_GATEWAY_API_KEY instead."
          );
        }
        this.provider = createGroq({
          apiKey: process.env.GROQ_API_KEY,
        });
        console.log(
          "[AI] ⚠️ Using Groq directly - consider using gateway provider with only AI_GATEWAY_API_KEY instead"
        );
        break;
      case "xai":
        // Direct XAI provider - requires XAI_API_KEY
        // NOTE: Use "gateway" provider instead to use only AI_GATEWAY_API_KEY
        if (!process.env.XAI_API_KEY) {
          throw new Error(
            "XAI_API_KEY is required for direct XAI provider. " +
              "Use AI_PROVIDER=gateway with only AI_GATEWAY_API_KEY instead."
          );
        }
        this.provider = createXai({
          apiKey: process.env.XAI_API_KEY,
        });
        console.log(
          "[AI] ⚠️ Using XAI directly - consider using gateway provider with only AI_GATEWAY_API_KEY instead"
        );
        break;
      case "gateway": {
        // Vercel AI Gateway - Uses dashboard API keys configured in Vercel
        // Only requires AI_GATEWAY_API_KEY - all provider keys managed in Vercel dashboard
        const gatewayApiKey = AI_CONFIG.gateway.apiKey;
        if (gatewayApiKey) {
          const keyPreview = `${gatewayApiKey.substring(0, 10)}...`;
          console.log(`[AI] Gateway API key: ${keyPreview} (${gatewayApiKey.length} chars)`);
          // Validate key format (should start with vck_)
          if (!gatewayApiKey.startsWith("vck_")) {
            console.warn(`[AI] ⚠️ Gateway API key doesn't start with 'vck_' - might be invalid`);
          }
        } else {
          console.warn(
            "[AI] ⚠️ AI_GATEWAY_API_KEY not set - Gateway will use VERCEL_OIDC_TOKEN if on Vercel"
          );
          console.warn("[AI] ⚠️ If this fails, set AI_GATEWAY_API_KEY in .env.local");
        }
        try {
          // Ensure the API key is available to the SDK
          // The SDK reads from AI_GATEWAY_API_KEY env var if not provided
          if (gatewayApiKey && !process.env.AI_GATEWAY_API_KEY) {
            process.env.AI_GATEWAY_API_KEY = gatewayApiKey;
          }
          this.provider = createGateway({
            apiKey: gatewayApiKey || undefined, // Pass undefined if empty to let SDK use env var
          });
        } catch (gatewayInitError) {
          console.error("[AI] ❌ Failed to initialize Gateway:", gatewayInitError);
          throw new Error(
            `Gateway initialization failed: ${gatewayInitError instanceof Error ? gatewayInitError.message : String(gatewayInitError)}`
          );
        }
        // Dashboard API keys are configured in Vercel dashboard and used automatically
        // This ensures usage is tracked and Vercel credits are consumed
        console.log("[AI] Using Vercel AI Gateway with dashboard API keys");
        console.log(
          "[AI] 💡 Provider API keys are configured in Vercel dashboard - no env vars needed!"
        );
        console.log(
          "[AI] Gateway benefits: caching, rate limiting, analytics, automatic fallbacks, usage tracking"
        );
        break;
      }
      default:
        throw new Error(`Unsupported AI provider: ${AI_CONFIG.defaultProvider}`);
    }
  }

  getModel(type: "fast" | "smart" | "creative" = "smart"): string {
    if (this.providerName === "gateway") {
      const gatewayModels = AI_CONFIG.models.gateway;
      return gatewayModels[type];
    }

    const models = AI_CONFIG.models[this.providerName as keyof typeof AI_CONFIG.models];
    if (models && typeof models === "object" && type in models) {
      const modelValue = (models as Record<string, string>)[type];
      if (typeof modelValue === "string") {
        return modelValue;
      }
    }

    // Fallback
    throw new Error(`Model type "${type}" not found for provider "${this.providerName}"`);
  }

  /**
   * Get fallback models for a given type
   */
  getFallbackModels(type: "fast" | "smart" | "creative" = "smart"): string[] {
    if (this.providerName === "gateway") {
      const fallbacks = AI_CONFIG.models.fallbacks?.gateway?.[type];
      if (fallbacks && Array.isArray(fallbacks)) {
        return fallbacks;
      }
    } else if (this.providerName === "google") {
      const fallbacks = AI_CONFIG.models.fallbacks?.google?.[type];
      if (fallbacks && Array.isArray(fallbacks)) {
        return fallbacks;
      }
    }
    // If no fallbacks configured, return empty array
    return [];
  }

  /**
   * Get all models to try (primary + fallbacks)
   */
  getAllModels(type: "fast" | "smart" | "creative" = "smart"): string[] {
    const primary = this.getModel(type);
    const fallbacks = this.getFallbackModels(type);
    // Remove duplicates and return primary first
    const all = [primary, ...fallbacks];
    return Array.from(new Set(all));
  }

  getProvider() {
    return this.provider;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  getModelInstance(modelType: "fast" | "smart" | "creative" = "smart"): any {
    const modelName = this.getModel(modelType);
    // Handle different provider types
    if (this.providerName === "gateway") {
      // Gateway uses provider/model format (e.g., "google/gemini-2.0-flash")
      return (this.provider as ReturnType<typeof createGateway>)(modelName);
    }
    if (this.providerName === "google") {
      // Google provider is a function that takes model name
      return (this.provider as typeof google)(modelName);
    }
    if (this.providerName === "groq") {
      // Groq provider instance - call with model name
      return (this.provider as ReturnType<typeof createGroq>)(modelName);
    }
    // Xai provider instance - call with model name
    return (this.provider as ReturnType<typeof createXai>)(modelName);
  }

  getName(): string {
    return this.providerName;
  }
}

// Singleton instance
let aiProvider: AIProvider | null = null;

export function getAIProvider(): AIProvider {
  if (!aiProvider) {
    aiProvider = new AIProvider();
  }
  return aiProvider;
}

/**
 * Generate text with quota enforcement, error handling, and automatic fallback models
 */
export async function generateAIText(params: {
  prompt: string;
  system?: string;
  temperature?: number;
  maxTokens?: number;
  modelType?: "fast" | "smart" | "creative";
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
  // Enforce quota limits
  await enforceQuota();

  const provider = getAIProvider();
  const startTime = Date.now();
  const modelType = params.modelType || "smart";

  // Get all models to try (primary + fallbacks)
  const modelsToTry = provider.getAllModels(modelType);
  let lastError: Error | null = null;
  let modelUsed: string | undefined;

  // Try each model in the fallback chain
  if (process.env.NODE_ENV === "development") {
    console.log(`[AI] Fallback chain for ${modelType}:`, modelsToTry);
  }

  for (let i = 0; i < modelsToTry.length; i++) {
    const modelName = modelsToTry[i];
    if (!modelName) {
      continue; // Skip if model name is undefined
    }

    try {
      if (process.env.NODE_ENV === "development") {
        console.log(
          `[AI] Attempting model ${i + 1}/${modelsToTry.length}: ${modelName} (${modelType})`
        );
      }

      // Get model instance for this specific model
      let modelInstance;
      if (provider.getName() === "gateway") {
        // Gateway uses provider/model format (e.g., "groq/meta/llama-3.3-70b")
        const gatewayProvider = provider.getProvider() as ReturnType<typeof createGateway>;
        try {
          modelInstance = gatewayProvider(modelName as any); // Type assertion needed for GatewayModelId
        } catch (gatewayError) {
          const errorMsg =
            gatewayError instanceof Error ? gatewayError.message : String(gatewayError);
          if (process.env.NODE_ENV === "development") {
            console.error(`[AI] Gateway model creation failed for ${modelName}:`, errorMsg);
            console.error(`[AI] Gateway API key present: ${!!AI_CONFIG.gateway.apiKey}`);
            console.error(
              "[AI] Model format should be: provider/model-name (e.g., groq/meta/llama-3.3-70b)"
            );
          }
          throw gatewayError;
        }
      } else if (provider.getName() === "google") {
        const googleProvider = provider.getProvider() as typeof google;
        modelInstance = googleProvider(modelName);
      } else if (provider.getName() === "groq") {
        const groqProvider = provider.getProvider() as ReturnType<typeof createGroq>;
        modelInstance = groqProvider(modelName);
      } else {
        const xaiProvider = provider.getProvider() as ReturnType<typeof createXai>;
        modelInstance = xaiProvider(modelName);
      }

      const result = await generateText({
        model: modelInstance as Parameters<typeof generateText>[0]["model"],
        prompt: params.prompt,
        system: params.system,
        temperature: params.temperature ?? AI_CONFIG.generation.temperature.balanced,
        abortSignal: AbortSignal.timeout(AI_CONFIG.timeouts.default),
      });

      const duration = Date.now() - startTime;
      modelUsed = modelName;

      if (process.env.NODE_ENV === "development") {
        console.log(`[AI] ✓ Success with ${modelName} in ${duration}ms`, {
          provider: provider.getName(),
          modelType,
          tokens: result.usage,
        });
      }

      // AI SDK 5 returns different structure depending on provider
      const usage = result.usage as AIUsage;
      const promptTokens = usage.promptTokenCount ?? usage.promptTokens ?? 0;
      const completionTokens = usage.candidatesTokenCount ?? usage.completionTokens ?? 0;

      return {
        text: result.text,
        usage: {
          promptTokens,
          completionTokens,
          totalTokens: promptTokens + completionTokens,
        },
        finishReason: result.finishReason,
        modelUsed,
      };
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      const parsedError = parseAIError(error);

      // Check if this is a retryable error (model not found, quota, rate limit)
      // Quota errors should trigger fallback to different model
      const isQuotaError =
        parsedError.code === "QUOTA_EXCEEDED" || parsedError instanceof QuotaExceededError;
      // Gateway access failures should trigger fallback to other models
      // This includes both gateway initialization errors and gateway access errors
      const isGatewayError =
        parsedError.message.includes("Vercel AI Gateway access failed") ||
        parsedError.message.includes("Gateway access failed") ||
        (parsedError.message.toLowerCase().includes("gateway") &&
          parsedError.message.toLowerCase().includes("failed"));
      const isRetryable =
        parsedError.code === "MODEL_NOT_FOUND" || // Explicit model not found
        parsedError.message.includes("not found") ||
        parsedError.message.includes("not supported") ||
        isQuotaError ||
        isGatewayError || // Make gateway errors retryable to try other models
        parsedError.code === "RATE_LIMIT" ||
        (parsedError instanceof AIProviderError && parsedError.statusCode === 503);

      const isLastModel = i === modelsToTry.length - 1;

      if (isRetryable && !isLastModel) {
        // This is retryable and we have more models to try
        if (process.env.NODE_ENV === "development") {
          console.warn(
            `[AI] Model ${modelName} failed (${parsedError.code}): ${parsedError.message.substring(0, 100)}...`
          );
          console.warn(`[AI] Trying next fallback model (${i + 2}/${modelsToTry.length})...`);
        }
      } else {
        // Not retryable or last model, throw error
        if (process.env.NODE_ENV === "development" && isLastModel) {
          console.error(
            `[AI] All ${modelsToTry.length} models failed. Last error:`,
            parsedError.message.substring(0, 200)
          );
        }
        throw parsedError;
      }
    }
  }

  // If we exhausted all models, throw the last error
  throw lastError || new Error("All models failed");
}

/**
 * Generate structured object with quota enforcement and automatic fallback models
 */
export async function generateAIObject<T>(params: {
  prompt: string;
  system?: string;
  schema: z.Schema<T>;
  temperature?: number;
  modelType?: "fast" | "smart" | "creative";
}): Promise<T> {
  // Enforce quota limits
  await enforceQuota();

  const provider = getAIProvider();
  const startTime = Date.now();
  const modelType = params.modelType || "smart";

  // Get all models to try (primary + fallbacks)
  const modelsToTry = provider.getAllModels(modelType);
  let lastError: Error | null = null;
  let _modelUsed: string | undefined;

  // Try each model in the fallback chain
  if (process.env.NODE_ENV === "development") {
    console.log(`[AI] Fallback chain for ${modelType}:`, modelsToTry);
  }

  for (let i = 0; i < modelsToTry.length; i++) {
    const modelName = modelsToTry[i];
    if (!modelName) {
      continue; // Skip if model name is undefined
    }

    try {
      if (process.env.NODE_ENV === "development") {
        console.log(`[AI] Attempting model ${i + 1}/${modelsToTry.length}: ${modelName}`);
      }

      // Get model instance for this specific model
      let modelInstance;
      if (provider.getName() === "gateway") {
        // Gateway uses provider/model format (e.g., "groq/meta/llama-3.3-70b")
        const gatewayProvider = provider.getProvider() as ReturnType<typeof createGateway>;
        try {
          modelInstance = gatewayProvider(modelName as any); // Type assertion needed for GatewayModelId
        } catch (gatewayError) {
          const errorMsg =
            gatewayError instanceof Error ? gatewayError.message : String(gatewayError);
          if (process.env.NODE_ENV === "development") {
            console.error(`[AI] Gateway model creation failed for ${modelName}:`, errorMsg);
            console.error(`[AI] Gateway API key present: ${!!AI_CONFIG.gateway.apiKey}`);
            console.error(
              "[AI] Model format should be: provider/model-name (e.g., groq/meta/llama-3.3-70b)"
            );
          }
          throw gatewayError;
        }
      } else if (provider.getName() === "google") {
        const googleProvider = provider.getProvider() as typeof google;
        modelInstance = googleProvider(modelName as any); // Type assertion needed
      } else if (provider.getName() === "groq") {
        const groqProvider = provider.getProvider() as ReturnType<typeof createGroq>;
        modelInstance = groqProvider(modelName as any); // Type assertion needed
      } else {
        const xaiProvider = provider.getProvider() as ReturnType<typeof createXai>;
        modelInstance = xaiProvider(modelName as any); // Type assertion needed
      }

      let result;
      try {
        result = await generateObject({
          model: modelInstance as Parameters<typeof generateObject>[0]["model"],
          prompt: params.prompt,
          system: params.system,
          schema: params.schema,
          temperature: params.temperature ?? AI_CONFIG.generation.temperature.balanced,
          abortSignal: AbortSignal.timeout(AI_CONFIG.timeouts.default),
        });
      } catch (generateError) {
        // Enhanced error logging for gateway
        if (provider.getName() === "gateway" && process.env.NODE_ENV === "development") {
          const errorDetails =
            generateError instanceof Error
              ? {
                  message: generateError.message,
                  name: generateError.name,
                  stack: generateError.stack?.substring(0, 500),
                  ...((generateError as any).cause ? { cause: (generateError as any).cause } : {}),
                  ...((generateError as any).lastError
                    ? { lastError: (generateError as any).lastError }
                    : {}),
                }
              : generateError;
          console.error(
            `[AI] Gateway generateObject failed for ${modelName}:`,
            JSON.stringify(errorDetails, null, 2)
          );
          console.error(
            `[AI] Gateway API key: ${AI_CONFIG.gateway.apiKey ? `${AI_CONFIG.gateway.apiKey.substring(0, 10)}... (${AI_CONFIG.gateway.apiKey.length} chars)` : "NOT SET"}`
          );
        }
        throw generateError;
      }

      const duration = Date.now() - startTime;
      _modelUsed = modelName;

      if (process.env.NODE_ENV === "development") {
        console.log(`[AI] ✓ Generated object with ${modelName} in ${duration}ms`, {
          provider: provider.getName(),
          modelType,
          usage: result.usage,
        });
      }

      return result.object;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      const parsedError = parseAIError(error);

      // Check if this is a retryable error
      // Quota errors should trigger fallback to different model
      const isQuotaError =
        parsedError.code === "QUOTA_EXCEEDED" || parsedError instanceof QuotaExceededError;
      // Gateway access failures should trigger fallback to other models
      // This includes both gateway initialization errors and gateway access errors
      const isGatewayError =
        parsedError.message.includes("Vercel AI Gateway access failed") ||
        parsedError.message.includes("Gateway access failed") ||
        (parsedError.message.toLowerCase().includes("gateway") &&
          parsedError.message.toLowerCase().includes("failed"));
      const isRetryable =
        parsedError.code === "MODEL_NOT_FOUND" || // Explicit model not found
        parsedError.message.includes("not found") ||
        parsedError.message.includes("not supported") ||
        isQuotaError ||
        isGatewayError || // Make gateway errors retryable to try other models
        parsedError.code === "RATE_LIMIT" ||
        (parsedError instanceof AIProviderError && parsedError.statusCode === 503);

      const isLastModel = i === modelsToTry.length - 1;

      if (isRetryable && !isLastModel) {
        // This is retryable and we have more models to try
        if (process.env.NODE_ENV === "development") {
          console.warn(
            `[AI] Model ${modelName} failed (${parsedError.code}): ${parsedError.message.substring(0, 100)}...`
          );
          console.warn(`[AI] Trying next fallback model (${i + 2}/${modelsToTry.length})...`);
        }
      } else {
        // Not retryable or last model
        if (process.env.NODE_ENV === "development") {
          if (isLastModel) {
            console.error(
              `[AI] All ${modelsToTry.length} models failed. Last error:`,
              parsedError.message.substring(0, 200)
            );
          } else {
            console.error("[AI] Non-retryable error:", parsedError);
          }
        }
        throw parsedError;
      }
    }
  }

  // If we exhausted all models, throw the last error
  throw lastError || new Error("All models failed");
}

/**
 * Stream text generation with quota enforcement
 */
export async function streamAIText(params: {
  prompt: string;
  system?: string;
  temperature?: number;
  maxTokens?: number;
  modelType?: "fast" | "smart" | "creative";
}) {
  // Enforce quota limits
  await enforceQuota();

  const provider = getAIProvider();

  try {
    const modelInstance = provider.getModelInstance(params.modelType || "smart");
    const result = streamText({
      model: modelInstance as Parameters<typeof streamText>[0]["model"],
      prompt: params.prompt,
      system: params.system,
      temperature: params.temperature ?? AI_CONFIG.generation.temperature.balanced,
      // AI SDK 5 doesn't use maxTokens in streamText
      abortSignal: AbortSignal.timeout(AI_CONFIG.timeouts.streaming),
    });

    return result;
  } catch (error) {
    console.error("[AI] Streaming error:", error);
    throw parseAIError(error);
  }
}

// Re-export AIError for convenience
export { AIError } from "./errors";

/**
 * Retry logic with exponential backoff
 */
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

      // Don't retry quota errors - they won't succeed
      if (error instanceof AIError && error.code === "QUOTA_EXCEEDED") {
        throw error;
      }

      if (attempt < maxAttempts) {
        const delay = Math.min(
          AI_CONFIG.retry.initialDelay * AI_CONFIG.retry.backoffMultiplier ** (attempt - 1),
          AI_CONFIG.retry.maxDelay
        );

        console.warn(`[AI] Attempt ${attempt} failed, retrying in ${delay}ms...`);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError || new Error("Operation failed after retries");
}
