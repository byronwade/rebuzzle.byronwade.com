/**
 * AI API Test Endpoint — Vercel AI Gateway
 *
 * REQUIRES ADMIN AUTHENTICATION.
 */

import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { generateAIText } from "@/ai/client";
import { AI_CONFIG, validateApiKeys } from "@/ai/config";
import { userOps } from "@/db/operations";
import { verifyToken } from "@/lib/jwt";

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
  const auth = await verifyAdmin(request);
  if (!auth.isAdmin) {
    return NextResponse.json({ error: auth.error }, { status: 401 });
  }

  try {
    const keyValidation = validateApiKeys();
    const gatewayKeyPresent = Boolean(process.env.AI_GATEWAY_API_KEY || process.env.VERCEL_OIDC_TOKEN);
    const startTime = Date.now();

    let result: { text: string; usage?: unknown; finishReason?: string; modelUsed?: string } | null =
      null;
    let lastError: Error | null = null;

    try {
      result = await generateAIText({
        prompt: "Say 'Hello' in one word.",
        modelType: "fast",
        temperature: 0.3,
      });
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
    }

    if (!result) {
      return NextResponse.json(
        {
          success: false,
          error: "Gateway model test failed",
          gateway: {
            keyPresent: gatewayKeyPresent,
            provider: keyValidation.provider,
            model: AI_CONFIG.models.gateway.fast,
          },
          lastError: lastError
            ? { name: lastError.name, message: lastError.message }
            : null,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "AI Gateway is working!",
      test: {
        response: result.text,
        duration: `${Date.now() - startTime}ms`,
        tokens: result.usage,
        finishReason: result.finishReason,
        modelUsed: result.modelUsed ?? AI_CONFIG.models.gateway.fast,
      },
      config: {
        provider: "gateway",
        puzzleAgentModel: AI_CONFIG.puzzleAgent.model,
        gatewayKeyPresent,
      },
    });
  } catch (error) {
    console.error("[AI Test] Error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "AI API test failed",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
