/**
 * AI Client
 *
 * Provider-agnostic AI client with quota management,
 * error handling, and automatic fallback
 */

import { createGroq } from "@ai-sdk/groq"
import { createXai } from "@ai-sdk/xai"
import { google } from "@ai-sdk/google"
import { generateText, streamText, generateObject } from "ai"
import { AI_CONFIG, validateApiKeys } from "./config"
import { enforceQuota } from "./quota-manager"
import { parseAIError, AIError } from "./errors"
import { z } from "zod"

type ProviderInstance = ReturnType<typeof createGroq> | ReturnType<typeof createXai> | typeof google

/**
 * AI Provider abstraction
 */
class AIProvider {
  private provider: ProviderInstance
  private providerName: string

  constructor() {
    const validation = validateApiKeys()

    if (!validation.valid) {
      throw new Error(
        `Missing API keys: ${validation.missing.join(", ")}. Please set them in your .env file.`
      )
    }

    this.providerName = AI_CONFIG.defaultProvider

    // Initialize provider based on config
    switch (AI_CONFIG.defaultProvider) {
      case "google":
        this.provider = google
        console.log(`[AI] Using Google AI (Gemini) - Free tier with quota limits`)
        break
      case "groq":
        this.provider = createGroq({
          apiKey: process.env.GROQ_API_KEY,
        })
        break
      case "xai":
        this.provider = createXai({
          apiKey: process.env.XAI_API_KEY,
        })
        break
      default:
        throw new Error(`Unsupported AI provider: ${AI_CONFIG.defaultProvider}`)
    }
  }

  getModel(type: "fast" | "smart" | "creative" = "smart"): string {
    const models = AI_CONFIG.models[this.providerName as keyof typeof AI_CONFIG.models]
    return models[type]
  }

  getProvider() {
    return this.provider
  }

  getModelInstance(modelType: "fast" | "smart" | "creative" = "smart") {
    const modelName = this.getModel(modelType)
    return (this.provider as any)(modelName)
  }

  getName(): string {
    return this.providerName
  }
}

// Singleton instance
let aiProvider: AIProvider | null = null

export function getAIProvider(): AIProvider {
  if (!aiProvider) {
    aiProvider = new AIProvider()
  }
  return aiProvider
}

/**
 * Generate text with quota enforcement and error handling
 */
export async function generateAIText(params: {
  prompt: string
  system?: string
  temperature?: number
  maxTokens?: number
  modelType?: "fast" | "smart" | "creative"
}): Promise<{
  text: string
  usage?: {
    promptTokens: number
    completionTokens: number
    totalTokens: number
  }
  finishReason: string
}> {
  // Enforce quota limits
  await enforceQuota()

  const provider = getAIProvider()
  const startTime = Date.now()

  try {
    const result = await generateText({
      model: provider.getModelInstance(params.modelType || "smart"),
      prompt: params.prompt,
      system: params.system,
      temperature: params.temperature ?? AI_CONFIG.generation.temperature.balanced,
      // AI SDK 5 doesn't use maxTokens in generateText
      abortSignal: AbortSignal.timeout(AI_CONFIG.timeouts.default),
    })

    const duration = Date.now() - startTime

    if (process.env.NODE_ENV === "development") {
      console.log(`[AI] Generated text in ${duration}ms`, {
        provider: provider.getName(),
        modelType: params.modelType || "smart",
        tokens: result.usage,
      })
    }

    // AI SDK 5 returns different structure
    return {
      text: result.text,
      usage: result.usage,
      finishReason: result.finishReason,
    }
  } catch (error) {
    console.error("[AI] Generation error:", error)
    throw parseAIError(error)
  }
}

/**
 * Generate structured object with quota enforcement
 */
export async function generateAIObject<T>(params: {
  prompt: string
  system?: string
  schema: z.Schema<T>
  temperature?: number
  modelType?: "fast" | "smart" | "creative"
}): Promise<T> {
  // Enforce quota limits
  await enforceQuota()

  const provider = getAIProvider()
  const startTime = Date.now()

  try {
    const result = await generateObject({
      model: provider.getModelInstance(params.modelType || "smart"),
      prompt: params.prompt,
      system: params.system,
      schema: params.schema,
      temperature: params.temperature ?? AI_CONFIG.generation.temperature.balanced,
      abortSignal: AbortSignal.timeout(AI_CONFIG.timeouts.default),
    })

    const duration = Date.now() - startTime

    if (process.env.NODE_ENV === "development") {
      console.log(`[AI] Generated object in ${duration}ms`, {
        provider: provider.getName(),
        modelType: params.modelType || "smart",
        usage: result.usage,
      })
    }

    return result.object
  } catch (error) {
    console.error("[AI] Object generation error:", error)
    throw parseAIError(error)
  }
}

/**
 * Stream text generation with quota enforcement
 */
export async function streamAIText(params: {
  prompt: string
  system?: string
  temperature?: number
  maxTokens?: number
  modelType?: "fast" | "smart" | "creative"
}) {
  // Enforce quota limits
  await enforceQuota()

  const provider = getAIProvider()

  try {
    const result = streamText({
      model: provider.getModelInstance(params.modelType || "smart"),
      prompt: params.prompt,
      system: params.system,
      temperature: params.temperature ?? AI_CONFIG.generation.temperature.balanced,
      // AI SDK 5 doesn't use maxTokens in streamText
      abortSignal: AbortSignal.timeout(AI_CONFIG.timeouts.streaming),
    })

    return result
  } catch (error) {
    console.error("[AI] Streaming error:", error)
    throw parseAIError(error)
  }
}

// Re-export AIError for convenience
export { AIError } from "./errors"

/**
 * Retry logic with exponential backoff
 */
export async function withRetry<T>(
  operation: () => Promise<T>,
  maxAttempts = AI_CONFIG.retry.maxAttempts
): Promise<T> {
  let lastError: Error | undefined

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await operation()
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error))

      // Don't retry quota errors - they won't succeed
      if (error instanceof AIError && error.code === "QUOTA_EXCEEDED") {
        throw error
      }

      if (attempt < maxAttempts) {
        const delay = Math.min(
          AI_CONFIG.retry.initialDelay * Math.pow(AI_CONFIG.retry.backoffMultiplier, attempt - 1),
          AI_CONFIG.retry.maxDelay
        )

        console.warn(`[AI] Attempt ${attempt} failed, retrying in ${delay}ms...`)
        await new Promise((resolve) => setTimeout(resolve, delay))
      }
    }
  }

  throw lastError || new Error("Operation failed after retries")
}
