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

  // Accept either Vercel cron secret OR Bearer CRON_SECRET (true OR, not AND)
  const vercelOk =
    Boolean(vercelCronSecretEnv) && vercelCronSecret === vercelCronSecretEnv;
  const bearerOk = Boolean(cronSecret) && authHeader === `Bearer ${cronSecret}`;

  if (isProduction) {
    if (!(vercelCronSecretEnv || cronSecret)) {
      return NextResponse.json(
        { success: false, error: "Cron authentication not configured" },
        { status: 500 }
      );
    }
    if (!(vercelOk || bearerOk)) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }
  } else if ((vercelCronSecretEnv || cronSecret) && !(vercelOk || bearerOk)) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
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

    // Forward cron auth so the workflow can authorize in production
    const forwardHeaders: Record<string, string> = {
      "Content-Type": "application/json",
    };
    if (authHeader) {
      forwardHeaders.Authorization = authHeader;
    }
    if (vercelCronSecret) {
      forwardHeaders["x-vercel-cron-secret"] = vercelCronSecret;
    } else if (vercelCronSecretEnv) {
      forwardHeaders["x-vercel-cron-secret"] = vercelCronSecretEnv;
    } else if (cronSecret) {
      forwardHeaders.Authorization = `Bearer ${cronSecret}`;
    }

    const workflowResponse = await fetch(workflowUrl, {
      method: "POST",
      headers: forwardHeaders,
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
