import { NextResponse } from "next/server";
import { checkDatabaseHealth } from "@/db/mongodb";
import { getAppUrl } from "@/lib/env";

// Edge runtime removed - incompatible with PPR (cacheComponents)

export async function GET(request: Request) {
  // Verify this is a legitimate cron request
  // Vercel automatically adds this header for cron jobs
  const authHeader = request.headers.get("authorization");
  const vercelCronSecret = request.headers.get("x-vercel-cron-secret");

  // In production, require authentication
  const isProduction = process.env.NODE_ENV === "production";
  const cronSecret = process.env.CRON_SECRET;
  const vercelCronSecretEnv = process.env.VERCEL_CRON_SECRET;

  // Check Vercel cron secret first (automatically set by Vercel)
  if (vercelCronSecretEnv && vercelCronSecret !== vercelCronSecretEnv) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  // Fallback to custom CRON_SECRET if Vercel secret not available
  if (cronSecret) {
    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }
  } else if (isProduction) {
    // In production, require at least one authentication method
    if (!vercelCronSecretEnv) {
      return NextResponse.json(
        { success: false, error: "Cron authentication not configured" },
        { status: 500 }
      );
    }
  }

  try {
    // Check database health before triggering workflow
    const dbHealth = await checkDatabaseHealth();
    if (!dbHealth.healthy) {
      console.error("Database health check failed:", dbHealth.error);
      return NextResponse.json(
        {
          success: false,
          error: "Database connection failed",
          details: dbHealth.error,
        },
        { status: 500 }
      );
    }

    console.log("🚀 Triggering daily content generation workflow...");

    // Trigger the workflow by making a request to it
    const workflowUrl = `${getAppUrl()}/api/workflows/daily-content`;

    const workflowResponse = await fetch(workflowUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        triggeredBy: "cron",
        triggeredAt: new Date().toISOString(),
      }),
    });

    if (!workflowResponse.ok) {
      const errorText = await workflowResponse.text();
      console.error("Workflow trigger failed:", errorText);
      return NextResponse.json(
        {
          success: false,
          error: "Workflow trigger failed",
          details: errorText,
        },
        { status: 500 }
      );
    }

    const workflowResult = await workflowResponse.json();

    console.log("✅ Workflow triggered successfully");
    return NextResponse.json({
      success: true,
      message: "Workflow triggered successfully",
      triggeredAt: new Date().toISOString(),
      workflow: workflowResult,
    });
  } catch (error) {
    console.error("❌ Failed to trigger workflow:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to trigger workflow",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
