/**
 * AI Decision Tracker Service
 *
 * Captures and logs all AI decisions with full context for analysis and learning.
 * This service wraps AI operations to track chain-of-thought, timing, tokens, and results.
 */

import { v4 as uuidv4 } from "uuid";
import { aiDecisionOps, aiErrorOps } from "../../db/ai-operations";
import type {
  AIChainOfThoughtStep,
  AIDecision,
  AIError,
  AIDifficultyProfile,
  AIQualityMetrics,
  NewAIDecision,
  NewAIError,
} from "../../db/models";

// ============================================================================
// TYPES
// ============================================================================

export type DecisionType = AIDecision["decisionType"];
export type ModelType = AIDecision["modelType"];

export interface DecisionContext {
  userId?: string;
  sessionId?: string;
  puzzleId?: string;
  puzzleType?: string;
  difficulty?: string | number;
  category?: string;
  [key: string]: unknown;
}

export interface TokenUsage {
  prompt: number;
  completion: number;
  total: number;
}

// Model pricing per 1M tokens (in USD)
const MODEL_PRICING: Record<string, { prompt: number; completion: number }> = {
  // Google
  "google/gemini-2.0-flash": { prompt: 0.075, completion: 0.30 },
  "google/gemini-1.5-flash": { prompt: 0.075, completion: 0.30 },
  "google/gemini-1.5-pro": { prompt: 1.25, completion: 5.00 },
  // Groq
  "groq/llama-3.1-70b-versatile": { prompt: 0.59, completion: 0.79 },
  "groq/llama-3.1-8b-instant": { prompt: 0.05, completion: 0.08 },
  "groq/mixtral-8x7b-32768": { prompt: 0.24, completion: 0.24 },
  // XAI
  "xai/grok-beta": { prompt: 5.00, completion: 15.00 },
  // OpenAI
  "openai/gpt-4o": { prompt: 2.50, completion: 10.00 },
  "openai/gpt-4o-mini": { prompt: 0.15, completion: 0.60 },
  // Default fallback
  default: { prompt: 0.50, completion: 1.00 },
};

function calculateCost(model: string, tokens: TokenUsage): number {
  const pricing = MODEL_PRICING[model] ?? MODEL_PRICING.default;
  if (!pricing) return 0;
  return (
    (tokens.prompt * pricing.prompt + tokens.completion * pricing.completion) / 1_000_000
  );
}

// ============================================================================
// DECISION TRACKER CLASS
// ============================================================================

export class DecisionTracker {
  private operationId: string;
  private decisionType: DecisionType;
  private startTime: number;
  private steps: AIChainOfThoughtStep[] = [];
  private stepStartTime: number | null = null;
  private currentStepNumber = 0;
  private context: DecisionContext = {};
  private provider = "";
  private model = "";
  private modelType: ModelType = "smart";
  private prompt = "";
  private systemPrompt = "";
  private parameters: Record<string, unknown> = {};
  private tokens: TokenUsage = { prompt: 0, completion: 0, total: 0 };
  private fallbackChain: AIDecision["fallbackChain"] = [];
  private qualityMetrics?: AIQualityMetrics;
  private difficultyCalibration?: AIDecision["difficultyCalibration"];
  private uniquenessMetrics?: AIDecision["uniquenessMetrics"];
  private thinking?: unknown;
  private layers?: string[];
  private challengeElements?: string[];
  private entityType?: AIDecision["entityType"];
  private entityId?: string;

  constructor(decisionType: DecisionType, existingOperationId?: string) {
    this.operationId = existingOperationId || uuidv4();
    this.decisionType = decisionType;
    this.startTime = Date.now();
  }

  /**
   * Get the operation ID for grouping related decisions
   */
  getOperationId(): string {
    return this.operationId;
  }

  /**
   * Set context for this decision
   */
  setContext(context: DecisionContext): void {
    this.context = { ...this.context, ...context };
  }

  /**
   * Set the model details
   */
  setModel(provider: string, model: string, modelType: ModelType): void {
    this.provider = provider;
    this.model = model;
    this.modelType = modelType;
  }

  /**
   * Set the input prompt
   */
  setInput(prompt: string, systemPrompt?: string, parameters?: Record<string, unknown>): void {
    this.prompt = prompt;
    if (systemPrompt) this.systemPrompt = systemPrompt;
    if (parameters) this.parameters = parameters;
  }

  /**
   * Start tracking a chain-of-thought step
   */
  startStep(stepType: string, description: string): void {
    this.currentStepNumber++;
    this.stepStartTime = Date.now();
    this.steps.push({
      stepNumber: this.currentStepNumber,
      stepType,
      description,
      reasoning: "",
    });
  }

  /**
   * Complete the current step with reasoning
   */
  completeStep(reasoning: string, metadata?: Record<string, unknown>): void {
    const currentStep = this.steps[this.steps.length - 1];
    if (currentStep) {
      currentStep.reasoning = reasoning;
      if (metadata) currentStep.metadata = metadata;
      if (this.stepStartTime) {
        currentStep.durationMs = Date.now() - this.stepStartTime;
      }
    }
    this.stepStartTime = null;
  }

  /**
   * Record a complete step at once
   */
  recordStep(step: Omit<AIChainOfThoughtStep, "stepNumber">): void {
    this.currentStepNumber++;
    this.steps.push({
      ...step,
      stepNumber: this.currentStepNumber,
    });
  }

  /**
   * Set raw thinking output from chain-of-thought generation
   */
  setThinking(thinking: unknown): void {
    this.thinking = thinking;
  }

  /**
   * Set multi-layer reasoning layers
   */
  setLayers(layers: string[]): void {
    this.layers = layers;
  }

  /**
   * Set challenge elements identified during generation
   */
  setChallengeElements(elements: string[]): void {
    this.challengeElements = elements;
  }

  /**
   * Record token usage
   */
  setTokens(tokens: TokenUsage): void {
    this.tokens = tokens;
  }

  /**
   * Add tokens to running total
   */
  addTokens(tokens: Partial<TokenUsage>): void {
    if (tokens.prompt) this.tokens.prompt += tokens.prompt;
    if (tokens.completion) this.tokens.completion += tokens.completion;
    if (tokens.total) this.tokens.total += tokens.total;
  }

  /**
   * Record a fallback attempt
   */
  recordFallback(model: string, success: boolean, error?: string, durationMs?: number): void {
    this.fallbackChain = this.fallbackChain || [];
    this.fallbackChain.push({
      model,
      attempted: true,
      success,
      error,
      durationMs,
    });
  }

  /**
   * Set quality metrics
   */
  setQualityMetrics(metrics: AIQualityMetrics): void {
    this.qualityMetrics = metrics;
  }

  /**
   * Set difficulty calibration
   */
  setDifficultyCalibration(
    proposed: number,
    calculated: number,
    calibrated: number,
    profile: AIDifficultyProfile
  ): void {
    this.difficultyCalibration = {
      proposed,
      calculated,
      calibrated,
      profile,
    };
  }

  /**
   * Set uniqueness metrics
   */
  setUniquenessMetrics(
    fingerprint: string,
    score: number,
    isUnique: boolean,
    similarPuzzles?: Array<{ puzzleId: string; similarity: number }>
  ): void {
    this.uniquenessMetrics = {
      fingerprint,
      score,
      isUnique,
      similarPuzzles,
    };
  }

  /**
   * Set the entity this decision created
   */
  setEntity(entityType: AIDecision["entityType"], entityId: string): void {
    this.entityType = entityType;
    this.entityId = entityId;
  }

  /**
   * Finalize and save the decision as successful
   */
  async recordSuccess(result: unknown): Promise<AIDecision> {
    const durationMs = Date.now() - this.startTime;
    const cost = calculateCost(this.model, this.tokens);

    const decision: NewAIDecision = {
      id: uuidv4(),
      decisionType: this.decisionType,
      operationId: this.operationId,
      sessionId: this.context.sessionId,
      userId: this.context.userId,
      timestamp: new Date(),
      durationMs,
      provider: this.provider,
      model: this.model,
      modelType: this.modelType,
      input: {
        prompt: this.prompt,
        systemPrompt: this.systemPrompt,
        parameters: this.parameters,
        context: this.context,
      },
      output: {
        success: true,
        result,
      },
      chainOfThought:
        this.steps.length > 0
          ? {
              steps: this.steps,
              thinking: this.thinking,
              layers: this.layers,
              challengeElements: this.challengeElements,
            }
          : undefined,
      tokens: {
        ...this.tokens,
        cost,
      },
      qualityMetrics: this.qualityMetrics,
      difficultyCalibration: this.difficultyCalibration,
      uniquenessMetrics: this.uniquenessMetrics,
      fallbackChain: this.fallbackChain?.length ? this.fallbackChain : undefined,
      entityType: this.entityType,
      entityId: this.entityId,
      feedbackReceived: false,
      createdAt: new Date(),
    };

    try {
      return await aiDecisionOps.create(decision);
    } catch (error) {
      console.error("[DecisionTracker] Failed to save decision:", error);
      // Return the decision even if save failed
      return decision as AIDecision;
    }
  }

  /**
   * Finalize and save the decision as failed
   */
  async recordError(error: Error | string, errorCode?: string): Promise<AIDecision> {
    const durationMs = Date.now() - this.startTime;
    const cost = calculateCost(this.model, this.tokens);
    const errorMessage = error instanceof Error ? error.message : error;

    const decision: NewAIDecision = {
      id: uuidv4(),
      decisionType: this.decisionType,
      operationId: this.operationId,
      sessionId: this.context.sessionId,
      userId: this.context.userId,
      timestamp: new Date(),
      durationMs,
      provider: this.provider,
      model: this.model,
      modelType: this.modelType,
      input: {
        prompt: this.prompt,
        systemPrompt: this.systemPrompt,
        parameters: this.parameters,
        context: this.context,
      },
      output: {
        success: false,
        error: errorMessage,
        errorCode,
      },
      chainOfThought:
        this.steps.length > 0
          ? {
              steps: this.steps,
              thinking: this.thinking,
              layers: this.layers,
              challengeElements: this.challengeElements,
            }
          : undefined,
      tokens: {
        ...this.tokens,
        cost,
      },
      fallbackChain: this.fallbackChain?.length ? this.fallbackChain : undefined,
      feedbackReceived: false,
      createdAt: new Date(),
    };

    try {
      const savedDecision = await aiDecisionOps.create(decision);

      // Also create an error record for pattern analysis
      await this.createErrorRecord(savedDecision.id, error, errorCode);

      return savedDecision;
    } catch (saveError) {
      console.error("[DecisionTracker] Failed to save error decision:", saveError);
      return decision as AIDecision;
    }
  }

  /**
   * Create an error record for pattern analysis
   */
  private async createErrorRecord(
    decisionId: string,
    error: Error | string,
    errorCode?: string
  ): Promise<void> {
    const errorMessage = error instanceof Error ? error.message : error;
    const stackTrace = error instanceof Error ? error.stack : undefined;

    // Determine error type and severity
    const { errorType, severity, tags } = this.classifyError(errorMessage, errorCode);

    const aiError: NewAIError = {
      id: uuidv4(),
      errorCode: errorCode || this.extractErrorCode(errorMessage),
      errorType,
      severity,
      decisionId,
      operationId: this.operationId,
      decisionType: this.decisionType,
      provider: this.provider,
      model: this.model,
      message: errorMessage,
      stackTrace,
      rawError: error instanceof Error ? { name: error.name, message: error.message } : error,
      input: {
        prompt: this.prompt.substring(0, 500), // Truncate for storage
        parameters: this.parameters,
      },
      resolved: false,
      tags,
      timestamp: new Date(),
      createdAt: new Date(),
    };

    try {
      await aiErrorOps.create(aiError);
    } catch (saveError) {
      console.error("[DecisionTracker] Failed to save error record:", saveError);
    }
  }

  /**
   * Classify error type and severity
   */
  private classifyError(
    message: string,
    code?: string
  ): { errorType: AIError["errorType"]; severity: AIError["severity"]; tags: string[] } {
    const lowerMessage = message.toLowerCase();
    const tags: string[] = [];

    // Add context tags
    if (this.context.puzzleType) tags.push(this.context.puzzleType as string);
    if (this.context.difficulty) tags.push(`difficulty_${this.context.difficulty}`);
    if (this.context.category) tags.push(this.context.category as string);

    // Quota/rate limit errors
    if (lowerMessage.includes("quota") || lowerMessage.includes("rate limit") || code === "QUOTA_EXCEEDED") {
      tags.push("quota");
      return { errorType: "provider", severity: "major", tags };
    }

    // Timeout errors
    if (lowerMessage.includes("timeout") || lowerMessage.includes("timed out") || code === "TIMEOUT") {
      tags.push("timeout");
      return { errorType: "timeout", severity: "minor", tags };
    }

    // Validation errors
    if (lowerMessage.includes("validation") || lowerMessage.includes("invalid") || code?.startsWith("VALIDATION")) {
      tags.push("validation");
      return { errorType: "validation", severity: "minor", tags };
    }

    // Quality rejection
    if (lowerMessage.includes("quality") || lowerMessage.includes("rejected") || code === "QUALITY_REJECTED") {
      tags.push("quality");
      return { errorType: "quality", severity: "warning", tags };
    }

    // Provider errors
    if (lowerMessage.includes("api") || lowerMessage.includes("service") || lowerMessage.includes("unavailable")) {
      tags.push("provider");
      return { errorType: "provider", severity: "major", tags };
    }

    // Generation errors
    if (lowerMessage.includes("generate") || lowerMessage.includes("failed to create")) {
      tags.push("generation");
      return { errorType: "generation", severity: "major", tags };
    }

    // Default unknown
    tags.push("unknown");
    return { errorType: "unknown", severity: "minor", tags };
  }

  /**
   * Extract error code from message if not provided
   */
  private extractErrorCode(message: string): string {
    // Try to extract error codes from common patterns
    const codeMatch = message.match(/\b([A-Z_]+_ERROR|[A-Z_]+_FAILED|[A-Z_]+_EXCEEDED)\b/);
    if (codeMatch?.[1]) return codeMatch[1];

    // Generate a code from the error type
    if (message.toLowerCase().includes("quota")) return "QUOTA_EXCEEDED";
    if (message.toLowerCase().includes("timeout")) return "TIMEOUT";
    if (message.toLowerCase().includes("validation")) return "VALIDATION_ERROR";
    if (message.toLowerCase().includes("rate limit")) return "RATE_LIMIT_EXCEEDED";

    return "UNKNOWN_ERROR";
  }
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Create a new decision tracker
 */
export function createTracker(
  decisionType: DecisionType,
  existingOperationId?: string
): DecisionTracker {
  return new DecisionTracker(decisionType, existingOperationId);
}

/**
 * Wrap an async operation with decision tracking
 */
export async function trackDecision<T>(
  decisionType: DecisionType,
  operation: (tracker: DecisionTracker) => Promise<T>,
  existingOperationId?: string
): Promise<{ result: T; decision: AIDecision }> {
  const tracker = createTracker(decisionType, existingOperationId);

  try {
    const result = await operation(tracker);
    const decision = await tracker.recordSuccess(result);
    return { result, decision };
  } catch (error) {
    const decision = await tracker.recordError(
      error instanceof Error ? error : String(error)
    );
    throw error; // Re-throw after recording
  }
}

/**
 * Create a simple decision record without full tracking
 */
export async function recordSimpleDecision(params: {
  decisionType: DecisionType;
  operationId?: string;
  provider: string;
  model: string;
  modelType: ModelType;
  prompt: string;
  systemPrompt?: string;
  result: unknown;
  success: boolean;
  error?: string;
  durationMs: number;
  tokens: TokenUsage;
  context?: DecisionContext;
  entityType?: AIDecision["entityType"];
  entityId?: string;
}): Promise<AIDecision> {
  const cost = calculateCost(params.model, params.tokens);

  const decision: NewAIDecision = {
    id: uuidv4(),
    decisionType: params.decisionType,
    operationId: params.operationId || uuidv4(),
    sessionId: params.context?.sessionId,
    userId: params.context?.userId,
    timestamp: new Date(),
    durationMs: params.durationMs,
    provider: params.provider,
    model: params.model,
    modelType: params.modelType,
    input: {
      prompt: params.prompt,
      systemPrompt: params.systemPrompt,
      parameters: {},
      context: params.context,
    },
    output: {
      success: params.success,
      result: params.success ? params.result : undefined,
      error: params.error,
    },
    tokens: {
      ...params.tokens,
      cost,
    },
    entityType: params.entityType,
    entityId: params.entityId,
    feedbackReceived: false,
    createdAt: new Date(),
  };

  return await aiDecisionOps.create(decision);
}

// Types are already exported at their definitions above
