/**
 * AI API Test Endpoint
 *
 * Simple endpoint to test if the AI API is working correctly
 */

import { NextResponse } from "next/server";
import { generateAIText } from "@/ai/client";
import { AI_CONFIG, validateApiKeys } from "@/ai/config";

export async function GET() {
  try {
    // Test 1: Validate API keys
    console.log("[AI Test] Checking API keys...");
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

    // Check API key format
    const apiKey = process.env.GOOGLE_AI_API_KEY || AI_CONFIG.google.apiKey;
    const keyPreview = apiKey ? `${apiKey.substring(0, 15)}...` : "MISSING";
    const keyLength = apiKey?.length || 0;

    // Test 1.5: Direct API key validation via Google API
    let directApiTest: any = null;
    try {
      console.log("[AI Test] Testing API key directly with Google API...");
      const googleApiResponse = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`,
        { method: "GET" }
      );

      if (googleApiResponse.ok) {
        const modelsData = await googleApiResponse.json();
        directApiTest = {
          success: true,
          availableModels:
            modelsData.models?.slice(0, 10).map((m: any) => m.name) || [],
          totalModels: modelsData.models?.length || 0,
        };
        console.log(
          `[AI Test] API key is valid! Found ${directApiTest.totalModels} models`
        );
      } else {
        const errorText = await googleApiResponse.text();
        directApiTest = {
          success: false,
          status: googleApiResponse.status,
          error: errorText,
        };
        console.error(
          `[AI Test] API key test failed: ${googleApiResponse.status}`,
          errorText
        );
      }
    } catch (error) {
      directApiTest = {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
      console.error("[AI Test] Direct API test error:", error);
    }

    // Test 2: Simple text generation with current config
    console.log("[AI Test] Testing text generation...");
    console.log(`[AI Test] Using model: ${AI_CONFIG.models.google.fast}`);
    const startTime = Date.now();

    let result: any = null;
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
            preview: keyPreview,
            length: keyLength,
            format:
              keyLength > 0
                ? keyLength === 39
                  ? "Looks like Google API key format"
                  : "Unexpected length"
                : "Missing",
          },
          directApiTest,
          modelUsed: AI_CONFIG.models.google.fast,
          lastError: lastError
            ? {
                name: lastError.name,
                message: lastError.message,
              }
            : null,
          suggestion: directApiTest?.success
            ? `API key is valid. Try using one of these available models: ${directApiTest.availableModels?.join(", ") || "Check directApiTest.availableModels"}`
            : "The API key may be invalid, expired, or doesn't have access. Get a new key from https://aistudio.google.com/apikey",
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
        apiKeyPreview: keyPreview,
        directApiTest,
      },
    });
  } catch (error) {
    console.error("[AI Test] Error:", error);

    return NextResponse.json(
      {
        success: false,
        error: "AI API test failed",
        details:
          error instanceof Error
            ? {
                name: error.name,
                message: error.message,
                stack: error.stack,
              }
            : String(error),
      },
      { status: 500 }
    );
  }
}
