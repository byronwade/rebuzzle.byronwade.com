import { NextResponse } from "next/server";
import { checkDatabaseHealth } from "@/db/mongodb";
import { validateEnv } from "@/lib/env";

/**
 * Health Check Endpoint
 *
 * Returns the health status of the application and its dependencies
 * Used by monitoring services and load balancers
 */
export async function GET() {
  const startTime = Date.now();
  const checks: Record<
    string,
    { status: "healthy" | "unhealthy"; latency?: number; error?: string }
  > = {};

  // Check environment variables
  try {
    const envValidation = validateEnv();
    checks.environment = {
      status: envValidation.valid ? "healthy" : "unhealthy",
      error: envValidation.errors.length > 0 ? envValidation.errors.join(", ") : undefined,
    };
  } catch (error) {
    checks.environment = {
      status: "unhealthy",
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }

  // Check database connection
  try {
    const dbHealth = await checkDatabaseHealth();
    checks.database = {
      status: dbHealth.healthy ? "healthy" : "unhealthy",
      latency: dbHealth.latency,
      error: dbHealth.error,
    };
  } catch (error) {
    checks.database = {
      status: "unhealthy",
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }

  // Determine overall health
  const allHealthy = Object.values(checks).every((check) => check.status === "healthy");
  const overallStatus = allHealthy ? "healthy" : "unhealthy";
  const statusCode = allHealthy ? 200 : 503;

  const responseTime = Date.now() - startTime;

  return NextResponse.json(
    {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      responseTime,
      checks,
      version: process.env.npm_package_version || "unknown",
      environment: process.env.NODE_ENV || "unknown",
    },
    {
      status: statusCode,
      headers: {
        "Cache-Control": "no-cache, no-store, must-revalidate",
        "X-Health-Check": "true",
      },
    }
  );
}
