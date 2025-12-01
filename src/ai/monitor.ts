/**
 * AI Monitoring and Analytics
 *
 * Tracks AI usage, costs, performance, and quality metrics
 */

interface AIMetrics {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  totalTokens: number;
  promptTokens: number;
  completionTokens: number;
  totalCost: number;
  averageLatency: number;
  cacheHits: number;
  cacheMisses: number;
}

interface AIEvent {
  timestamp: Date;
  operation: string;
  model: string;
  provider: string;
  success: boolean;
  latencyMs: number;
  tokens?: {
    prompt: number;
    completion: number;
    total: number;
  };
  error?: string;
}

class AIMonitor {
  private events: AIEvent[] = [];
  private metrics: AIMetrics = {
    totalRequests: 0,
    successfulRequests: 0,
    failedRequests: 0,
    totalTokens: 0,
    promptTokens: 0,
    completionTokens: 0,
    totalCost: 0,
    averageLatency: 0,
    cacheHits: 0,
    cacheMisses: 0,
  };

  // Approximate token costs (USD per 1M tokens)
  private readonly TOKEN_COSTS = {
    groq: {
      input: 0.05, // Example pricing
      output: 0.1,
    },
    xai: {
      input: 5.0,
      output: 15.0,
    },
    openai: {
      "gpt-4o": {
        input: 2.5,
        output: 10.0,
      },
      "gpt-4o-mini": {
        input: 0.15,
        output: 0.6,
      },
    },
  };

  /**
   * Track an AI operation
   */
  trackOperation(event: Omit<AIEvent, "timestamp">): void {
    const fullEvent: AIEvent = {
      ...event,
      timestamp: new Date(),
    };

    this.events.push(fullEvent);

    // Update metrics
    this.metrics.totalRequests++;

    if (event.success) {
      this.metrics.successfulRequests++;
    } else {
      this.metrics.failedRequests++;
    }

    if (event.tokens) {
      this.metrics.promptTokens += event.tokens.prompt;
      this.metrics.completionTokens += event.tokens.completion;
      this.metrics.totalTokens += event.tokens.total;

      // Calculate cost
      this.metrics.totalCost += this.calculateCost(
        event.provider,
        event.model,
        event.tokens
      );
    }

    // Update average latency
    const totalLatency =
      this.metrics.averageLatency * (this.metrics.totalRequests - 1) +
      event.latencyMs;
    this.metrics.averageLatency = totalLatency / this.metrics.totalRequests;

    // Keep only last 1000 events in memory
    if (this.events.length > 1000) {
      this.events.shift();
    }

    // Log in development
    if (process.env.NODE_ENV === "development") {
      console.log(`[AI Monitor] ${event.operation}`, {
        success: event.success,
        latency: `${event.latencyMs}ms`,
        tokens: event.tokens?.total,
      });
    }
  }

  /**
   * Track cache hit/miss
   */
  trackCache(hit: boolean): void {
    if (hit) {
      this.metrics.cacheHits++;
    } else {
      this.metrics.cacheMisses++;
    }
  }

  /**
   * Calculate cost for operation
   */
  private calculateCost(
    provider: string,
    model: string,
    tokens: { prompt: number; completion: number }
  ): number {
    if (provider === "groq") {
      // Groq is currently free, but track as if paid
      return (
        (tokens.prompt / 1_000_000) * this.TOKEN_COSTS.groq.input +
        (tokens.completion / 1_000_000) * this.TOKEN_COSTS.groq.output
      );
    }

    if (provider === "xai") {
      return (
        (tokens.prompt / 1_000_000) * this.TOKEN_COSTS.xai.input +
        (tokens.completion / 1_000_000) * this.TOKEN_COSTS.xai.output
      );
    }

    if (provider === "openai") {
      const costs = model.includes("mini")
        ? this.TOKEN_COSTS.openai["gpt-4o-mini"]
        : this.TOKEN_COSTS.openai["gpt-4o"];

      return (
        (tokens.prompt / 1_000_000) * costs.input +
        (tokens.completion / 1_000_000) * costs.output
      );
    }

    return 0;
  }

  /**
   * Get current metrics
   */
  getMetrics(): AIMetrics {
    return { ...this.metrics };
  }

  /**
   * Get recent events
   */
  getRecentEvents(count = 10): AIEvent[] {
    return this.events.slice(-count);
  }

  /**
   * Get events by operation type
   */
  getEventsByOperation(operation: string): AIEvent[] {
    return this.events.filter((e) => e.operation === operation);
  }

  /**
   * Get success rate
   */
  getSuccessRate(): number {
    if (this.metrics.totalRequests === 0) return 1.0;
    return this.metrics.successfulRequests / this.metrics.totalRequests;
  }

  /**
   * Get cache hit rate
   */
  getCacheHitRate(): number {
    const total = this.metrics.cacheHits + this.metrics.cacheMisses;
    if (total === 0) return 0;
    return this.metrics.cacheHits / total;
  }

  /**
   * Get cost summary
   */
  getCostSummary(): {
    total: number;
    perRequest: number;
    perToken: number;
    savings: number;
  } {
    const savings = this.metrics.cacheHits * 0.001; // Estimate $0.001 per cached request

    return {
      total: this.metrics.totalCost,
      perRequest:
        this.metrics.totalRequests > 0
          ? this.metrics.totalCost / this.metrics.totalRequests
          : 0,
      perToken:
        this.metrics.totalTokens > 0
          ? this.metrics.totalCost / this.metrics.totalTokens
          : 0,
      savings,
    };
  }

  /**
   * Generate performance report
   */
  generateReport(): string {
    const metrics = this.getMetrics();
    const costs = this.getCostSummary();

    return `
AI Performance Report
====================

Requests:
  Total: ${metrics.totalRequests}
  Successful: ${metrics.successfulRequests} (${(this.getSuccessRate() * 100).toFixed(1)}%)
  Failed: ${metrics.failedRequests}

Tokens:
  Total: ${metrics.totalTokens.toLocaleString()}
  Prompt: ${metrics.promptTokens.toLocaleString()}
  Completion: ${metrics.completionTokens.toLocaleString()}

Performance:
  Average Latency: ${metrics.averageLatency.toFixed(0)}ms
  Cache Hit Rate: ${(this.getCacheHitRate() * 100).toFixed(1)}%

Costs:
  Total: $${costs.total.toFixed(4)}
  Per Request: $${costs.perRequest.toFixed(4)}
  Cache Savings: $${costs.savings.toFixed(4)}
    `.trim();
  }

  /**
   * Reset all metrics
   */
  reset(): void {
    this.events = [];
    this.metrics = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      totalTokens: 0,
      promptTokens: 0,
      completionTokens: 0,
      totalCost: 0,
      averageLatency: 0,
      cacheHits: 0,
      cacheMisses: 0,
    };
  }
}

// Singleton instance
let monitorInstance: AIMonitor | null = null;

export function getMonitor(): AIMonitor {
  if (!monitorInstance) {
    monitorInstance = new AIMonitor();
  }
  return monitorInstance;
}

/**
 * Track an AI operation (convenience function)
 */
export function trackAIOperation(
  operation: string,
  provider: string,
  model: string,
  success: boolean,
  latencyMs: number,
  tokens?: { prompt: number; completion: number; total: number },
  error?: string
): void {
  const monitor = getMonitor();
  monitor.trackOperation({
    operation,
    provider,
    model,
    success,
    latencyMs,
    tokens,
    error,
  });
}

/**
 * Get AI metrics (convenience function)
 */
export function getAIMetrics(): AIMetrics {
  return getMonitor().getMetrics();
}

/**
 * Get AI report (convenience function)
 */
export function getAIReport(): string {
  return getMonitor().generateReport();
}
