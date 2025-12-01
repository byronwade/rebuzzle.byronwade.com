/**
 * AI Quota Manager
 *
 * Tracks and manages API quota usage to prevent hitting limits
 * Implements rate limiting and warning system
 */

import { AI_CONFIG } from "./config";
import { QuotaExceededError } from "./errors";

interface QuotaUsage {
  minute: { count: number; resetAt: Date };
  day: { count: number; resetAt: Date };
}

class QuotaManager {
  private usage: QuotaUsage = {
    minute: { count: 0, resetAt: new Date(Date.now() + 60_000) },
    day: { count: 0, resetAt: this.getNextDayReset() },
  };

  private getNextDayReset(): Date {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    return tomorrow;
  }

  private resetIfNeeded() {
    const now = new Date();

    // Reset minute counter
    if (now >= this.usage.minute.resetAt) {
      this.usage.minute = {
        count: 0,
        resetAt: new Date(now.getTime() + 60_000),
      };
    }

    // Reset day counter
    if (now >= this.usage.day.resetAt) {
      this.usage.day = {
        count: 0,
        resetAt: this.getNextDayReset(),
      };
    }
  }

  /**
   * Check if request can proceed without exceeding quota
   */
  async checkQuota(): Promise<{
    allowed: boolean;
    reason?: string;
    resetAt?: Date;
  }> {
    this.resetIfNeeded();

    const limits = AI_CONFIG.google.quotaLimits;

    // Check minute limit
    if (this.usage.minute.count >= limits.requestsPerMinute) {
      return {
        allowed: false,
        reason: "Minute quota exceeded",
        resetAt: this.usage.minute.resetAt,
      };
    }

    // Check day limit
    if (this.usage.day.count >= limits.requestsPerDay) {
      return {
        allowed: false,
        reason: "Daily quota exceeded",
        resetAt: this.usage.day.resetAt,
      };
    }

    return { allowed: true };
  }

  /**
   * Record a request
   */
  recordRequest() {
    this.resetIfNeeded();
    this.usage.minute.count++;
    this.usage.day.count++;
  }

  /**
   * Get current usage stats
   */
  getUsage() {
    this.resetIfNeeded();

    const limits = AI_CONFIG.google.quotaLimits;

    return {
      minute: {
        used: this.usage.minute.count,
        limit: limits.requestsPerMinute,
        percentage: (this.usage.minute.count / limits.requestsPerMinute) * 100,
        resetAt: this.usage.minute.resetAt,
      },
      day: {
        used: this.usage.day.count,
        limit: limits.requestsPerDay,
        percentage: (this.usage.day.count / limits.requestsPerDay) * 100,
        resetAt: this.usage.day.resetAt,
      },
    };
  }

  /**
   * Check if nearing quota limits
   */
  shouldWarn(): {
    warn: boolean;
    level: "warning" | "critical" | "ok";
    message: string;
  } {
    const usage = this.getUsage();
    const threshold = AI_CONFIG.google.quotaLimits.warningThreshold * 100;

    // Check day usage first (more important)
    if (usage.day.percentage >= 95) {
      return {
        warn: true,
        level: "critical",
        message: `Critical: ${usage.day.used}/${usage.day.limit} daily requests used (${usage.day.percentage.toFixed(1)}%). Quota resets at midnight.`,
      };
    }

    if (usage.day.percentage >= threshold) {
      return {
        warn: true,
        level: "warning",
        message: `Warning: ${usage.day.used}/${usage.day.limit} daily requests used (${usage.day.percentage.toFixed(1)}%). Consider enabling caching.`,
      };
    }

    // Check minute usage
    if (usage.minute.percentage >= 90) {
      return {
        warn: true,
        level: "warning",
        message: `Warning: ${usage.minute.used}/${usage.minute.limit} requests this minute. Slow down to avoid rate limits.`,
      };
    }

    return {
      warn: false,
      level: "ok",
      message: "Quota usage is healthy",
    };
  }
}

// Singleton instance
let quotaManagerInstance: QuotaManager | null = null;

export function getQuotaManager(): QuotaManager {
  if (!quotaManagerInstance) {
    quotaManagerInstance = new QuotaManager();
  }
  return quotaManagerInstance;
}

/**
 * Enforce quota limits before AI call
 * NOTE: Gateway provider has built-in rate limiting, so we skip local quota enforcement
 */
export async function enforceQuota(): Promise<void> {
  // Skip quota enforcement for gateway - it has built-in rate limiting
  if (AI_CONFIG.defaultProvider === "gateway") {
    // Gateway handles rate limiting internally, no need for local quota manager
    return;
  }

  const manager = getQuotaManager();
  const check = await manager.checkQuota();

  if (!check.allowed) {
    const quotaType = check.reason?.includes("Minute") ? "minute" : "day";
    throw new QuotaExceededError(quotaType, check.resetAt);
  }

  manager.recordRequest();

  // Log warnings
  const warning = manager.shouldWarn();
  if (warning.warn && process.env.NODE_ENV === "development") {
    console.warn(
      `[AI Quota] ${warning.level.toUpperCase()}: ${warning.message}`
    );
  }
}

/**
 * Get quota usage stats
 */
export function getQuotaStats() {
  return getQuotaManager().getUsage();
}
