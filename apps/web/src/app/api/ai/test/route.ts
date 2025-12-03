/**
 * AI API Test Endpoint
 *
 * Simple endpoint to test if the AI API is working correctly.
 * REQUIRES ADMIN AUTHENTICATION - sensitive endpoint.
 */

import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { generateAIText } from "@/ai/client";
import { AI_CONFIG, validateApiKeys } from "@/ai/config";
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
  // Require admin authentication for this sensitive endpoint
  const auth = await verifyAdmin(request);
  if (!auth.isAdmin) {
    return NextResponse.json({ error: auth.error }, { status: 401 });
  }

  try {
    // Test 1: Validate API keys
    const keyValidation = validateApiKeys();

    if (!keyValidation.valid) {
      return NextResponse.json(
        {
          success: false,
          error: "API keys missing",
          missing: keyValidation.missing,
          provider: keyValidation.provider,
        },
        { status: 500 }
      );
    }

    // Check API key format (don't expose the actual key)
    const apiKey = process.env.GOOGLE_AI_API_KEY || AI_CONFIG.google.apiKey;
    const keyLength = apiKey?.length || 0;

    // Test direct API connectivity (without exposing key details)
    let directApiTest: { success: boolean; totalModels?: number; error?: string } | null = null;
    try {
      const googleApiResponse = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`,
        { method: "GET" }
      );

      if (googleApiResponse.ok) {
        const modelsData = await googleApiResponse.json();
        directApiTest = {
          success: true,
          totalModels: modelsData.models?.length || 0,
        };
      } else {
        directApiTest = {
          success: false,
          error: `API returned status ${googleApiResponse.status}`,
        };
      }
    } catch (error) {
      directApiTest = {
        success: false,
        error: error instanceof Error ? error.message : "Connection failed",
      };
    }

    // Test text generation
    const startTime = Date.now();
    let result: { text: string; usage?: unknown; finishReason?: string } | null = null;
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
          error: "Model test failed",
          apiKeyInfo: {
            present: !!apiKey,
            lengthValid: keyLength === 39,
          },
          directApiTest,
          modelUsed: AI_CONFIG.models.google.fast,
          lastError: lastError
            ? {
                name: lastError.name,
                message: lastError.message,
              }
            : null,
        },
        { status: 500 }
      );
    }

    const duration = Date.now() - startTime;

    return NextResponse.json({
      success: true,
      message: "AI API is working!",
      test: {
        response: result.text,
        duration: `${duration}ms`,
        tokens: result.usage,
        finishReason: result.finishReason,
        modelUsed: AI_CONFIG.models.google.fast,
      },
      config: {
        provider: keyValidation.provider,
        apiKeyPresent: true,
        directApiTest,
      },
    });
  } catch (error) {
    console.error("[AI Test] Error:", error);

    // Don't expose stack traces in production
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
