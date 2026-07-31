/**
 * Dev Mode Visual Lab API — generate visual variants without publishing.
 * Auth: any signed-in user (guest OK), same gate as /api/dev/session.
 */

import { NextResponse } from "next/server";
import {
  formatGatewayAuthError,
  getGatewayAuthDiagnostics,
  isGatewayAuthError,
  probeGatewayAuth,
} from "@/ai/client";
import {
  isVisualLabMode,
  VISUAL_LAB_MODE_META,
  VISUAL_LAB_MODES,
} from "@/ai/puzzle-agent/visual/lab-recipes";
import { runVisualLab } from "@/ai/puzzle-agent/visual/run-visual-lab";
import { getAuthenticatedUser } from "@/lib/auth-middleware";

export async function GET(request: Request) {
  const authUser = await getAuthenticatedUser(request);
  if (!authUser) {
    return NextResponse.json({ success: false, allowed: false }, { status: 401 });
  }

  return NextResponse.json({
    success: true,
    allowed: true,
    modes: VISUAL_LAB_MODES.map((id) => VISUAL_LAB_MODE_META[id]),
    gateway: getGatewayAuthDiagnostics(),
  });
}

export async function POST(request: Request) {
  try {
    const authUser = await getAuthenticatedUser(request);
    if (!authUser) {
      return NextResponse.json(
        { success: false, error: "Sign in (guest or account) to use the Visual Lab" },
        { status: 401 }
      );
    }

    const body = (await request.json().catch(() => ({}))) as {
      mode?: unknown;
      concept?: unknown;
      answer?: unknown;
      difficulty?: unknown;
      renderImages?: unknown;
    };

    if (!isVisualLabMode(body.mode)) {
      return NextResponse.json(
        {
          success: false,
          error: `mode required — one of: ${VISUAL_LAB_MODES.join(", ")}`,
        },
        { status: 400 }
      );
    }

    const authProbe = await probeGatewayAuth();
    if (!authProbe.ok) {
      return NextResponse.json(
        {
          success: false,
          error: authProbe.error,
          gateway: authProbe.diagnostics,
        },
        { status: 503 }
      );
    }

    const difficulty =
      typeof body.difficulty === "number" && Number.isFinite(body.difficulty)
        ? body.difficulty
        : undefined;

    const result = await runVisualLab({
      mode: body.mode,
      concept: typeof body.concept === "string" ? body.concept : undefined,
      answer: typeof body.answer === "string" ? body.answer : undefined,
      difficulty,
      renderImages: body.renderImages !== false,
    });

    return NextResponse.json({
      success: true,
      /** Explicit: never writes to the daily puzzle catalog */
      published: false,
      result,
      gateway: authProbe.diagnostics,
    });
  } catch (error) {
    console.error("[dev/visual-lab]", error);
    const diagnostics = getGatewayAuthDiagnostics();
    const message = isGatewayAuthError(error)
      ? formatGatewayAuthError(diagnostics)
      : error instanceof Error
        ? error.message
        : "Visual lab generation failed";
    return NextResponse.json(
      {
        success: false,
        error: message,
        gateway: diagnostics,
      },
      { status: isGatewayAuthError(error) ? 503 : 500 }
    );
  }
}
