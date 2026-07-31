/**
 * AI Metrics and Monitoring API
 *
 * Provides insights into AI usage, performance, and costs.
 * REQUIRES ADMIN AUTHENTICATION - contains sensitive cost/usage data.
 */

import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { getAIMetrics, getAIReport, getCacheStats } from "@/ai";
import { verifyToken } from "@/lib/jwt";
import { userOps } from "@/db/operations";

/**
 * Verify admin authentication
 */
async function verifyAdmin(request: NextRequest): Promise<{ isAdmin: boolean; error?: string }> {
  try {
    const authHeader = request.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return { isAdmin: false, error: "Missing authorization header" };
    }

    const token = authHeader.slice(7);
    const payload = await verifyToken(token);

    if (!payload) {
      return { isAdmin: false, error: "Invalid token" };
    }

    const user = await userOps.findById(payload.userId);
    if (!user?.isAdmin) {
      return { isAdmin: false, error: "Admin access required" };
    }

    return { isAdmin: true };
  } catch {
    return { isAdmin: false, error: "Authentication failed" };
  }
}

export async function GET(request: NextRequest) {
  // Require admin authentication for metrics access
  const auth = await verifyAdmin(request);
  if (!auth.isAdmin) {
    return NextResponse.json({ error: auth.error }, { status: 401 });
  }

  try {
    const metrics = getAIMetrics();
    const cacheStats = getCacheStats();
    const report = getAIReport();

    // Calculate derived metrics
    const successRate =
      metrics.totalRequests > 0 ? (metrics.successfulRequests / metrics.totalRequests) * 100 : 100;

    const cacheHitRate =
      cacheStats.size > 0 && metrics.totalRequests > 0
        ? (metrics.cacheHits / (metrics.cacheHits + metrics.cacheMisses)) * 100
        : 0;

    const avgCostPerRequest =
      metrics.totalRequests > 0 ? metrics.totalCost / metrics.totalRequests : 0;

    return NextResponse.json({
      success: true,
      metrics: {
        requests: {
          total: metrics.totalRequests,
          successful: metrics.successfulRequests,
          failed: metrics.failedRequests,
          successRate: `${successRate.toFixed(1)}%`,
        },
        tokens: {
          total: metrics.totalTokens,
          prompt: metrics.promptTokens,
          completion: metrics.completionTokens,
        },
        performance: {
          averageLatency: `${Math.round(metrics.averageLatency)}ms`,
          cacheHitRate: `${cacheHitRate.toFixed(1)}%`,
          cacheSize: cacheStats.size,
        },
        costs: {
          total: `$${metrics.totalCost.toFixed(4)}`,
          perRequest: `$${avgCostPerRequest.toFixed(6)}`,
          cacheSavings: `$${(metrics.cacheHits * 0.001).toFixed(4)}`,
        },
      },
      report,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[AI API] Metrics error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to retrieve metrics",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  // Require admin authentication for cache/metrics reset
  const auth = await verifyAdmin(request);
  if (!auth.isAdmin) {
    return NextResponse.json({ error: auth.error }, { status: 401 });
  }

  try {
    const { getMonitor, clearAICache } = await import("@/ai");

    // Reset metrics
    getMonitor().reset();

    // Clear cache
    clearAICache();

    return NextResponse.json({
      success: true,
      message: "AI metrics and cache cleared",
    });
  } catch (error) {
    console.error("[AI API] Reset error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to reset metrics",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
