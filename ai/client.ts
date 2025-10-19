/**
 * AI Client
 *
 * Provider-agnostic AI client with automatic failover,
 * caching, rate limiting, and monitoring
 */

import { createGroq } from "@ai-sdk/groq"
import { createXai } from "@ai-sdk/xai"
import { ollama } from "ollama-ai-provider"
import { generateText, streamText, generateObject } from "ai"
import { AI_CONFIG, validateApiKeys } from "./config"
import { z } from "zod"

/**
 * AI Provider abstraction
 */
class AIProvider {
  private provider: ReturnType<typeof createGroq> | ReturnType<typeof createXai> | ReturnType<typeof ollama>
  private providerName: string

  constructor() {
    const validation = validateApiKeys()

    if (!validation.valid && AI_CONFIG.defaultProvider !== "ollama") {
      throw new Error(
        `Missing API keys: ${validation.missing.join(", ")}. Please set them in your .env file.`
      )
    }

    this.providerName = AI_CONFIG.defaultProvider

    // Initialize provider based on config
    switch (AI_CONFIG.defaultProvider) {
      case "ollama":
        this.provider = ollama
        console.log(`[AI] Using Ollama at ${AI_CONFIG.ollama.baseUrl}`)
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

  /**
   * Get model ID based on task type
   */
  getModel(type: "fast" | "smart" | "creative" = "smart"): string {
    const models = AI_CONFIG.models[this.providerName as keyof typeof AI_CONFIG.models]
    return models[type]
  }

  /**
   * Get provider instance
   */
  getProvider() {
    return this.provider
  }

  /**
   * Get provider name
   */
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
 * Generate text with retry and error handling
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
  const provider = getAIProvider()
  const model = provider.getModel(params.modelType || "smart")

  const startTime = Date.now()

  try {
    const result = await generateText({
      model: provider.getProvider()(model),
      prompt: params.prompt,
      system: params.system,
      temperature: params.temperature ?? AI_CONFIG.generation.temperature.balanced,
      maxTokens: params.maxTokens ?? AI_CONFIG.generation.maxTokens.medium,
      abortSignal: AbortSignal.timeout(AI_CONFIG.timeouts.default),
    })

    const duration = Date.now() - startTime

    // Log for monitoring
    if (process.env.NODE_ENV === "development") {
      console.log(`[AI] Generated text in ${duration}ms`, {
        provider: provider.getName(),
        model,
        tokens: result.usage,
      })
    }

    return result
  } catch (error) {
    console.error("[AI] Generation error:", error)
    throw new AIError("Failed to generate text", { cause: error })
  }
}

/**
 * Generate structured object with schema validation
 */
export async function generateAIObject<T>(params: {
  prompt: string
  system?: string
  schema: z.Schema<T>
  temperature?: number
  modelType?: "fast" | "smart" | "creative"
}): Promise<T> {
  const provider = getAIProvider()
  const model = provider.getModel(params.modelType || "smart")

  const startTime = Date.now()

  try {
    const result = await generateObject({
      model: provider.getProvider()(model),
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
        model,
        usage: result.usage,
      })
    }

    return result.object
  } catch (error) {
    console.error("[AI] Object generation error:", error)
    throw new AIError("Failed to generate structured object", { cause: error })
  }
}

/**
 * Stream text generation
 */
export async function streamAIText(params: {
  prompt: string
  system?: string
  temperature?: number
  maxTokens?: number
  modelType?: "fast" | "smart" | "creative"
}) {
  const provider = getAIProvider()
  const model = provider.getModel(params.modelType || "smart")

  try {
    const result = streamText({
      model: provider.getProvider()(model),
      prompt: params.prompt,
      system: params.system,
      temperature: params.temperature ?? AI_CONFIG.generation.temperature.balanced,
      maxTokens: params.maxTokens ?? AI_CONFIG.generation.maxTokens.medium,
      abortSignal: AbortSignal.timeout(AI_CONFIG.timeouts.streaming),
    })

    return result
  } catch (error) {
    console.error("[AI] Streaming error:", error)
    throw new AIError("Failed to stream text", { cause: error })
  }
}

/**
 * Custom AI Error class
 */
export class AIError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options)
    this.name = "AIError"
  }
}

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
