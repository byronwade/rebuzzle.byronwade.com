/**
 * Dev Mode Visual Lab API — generate visual variants, persist for feedback.
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
import { persistLabPuzzle } from "@/lib/game/persist-lab-puzzle";

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
      persist?: unknown;
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

    // Always store generations as inactive lab puzzles so we can like/dislike + learn
    let puzzleId: string | undefined;
    const answer = result.puzzle?.answer || result.seed?.answer;
    if (body.persist !== false && answer) {
      try {
        const persisted = await persistLabPuzzle({
          puzzleDisplay:
            result.puzzle?.rebusPuzzle ||
            result.visual?.unicodeFallback ||
            "◆",
          answer,
          difficulty: result.puzzle?.difficulty ?? result.seed?.difficulty ?? 5,
          difficultyLevel: result.puzzle?.difficultyLevel,
          category: result.puzzle?.category || "dev_lab",
          explanation:
            result.puzzle?.explanation ||
            (result.seed
              ? `Dev Lab ${body.mode} probe — concept “${result.seed.concept}”.`
              : undefined),
          hints: result.puzzle?.hints,
          techniqueId: result.puzzle?.techniqueId,
          visual: result.puzzle?.visual || result.visual,
          rebusPuzzle: result.puzzle?.rebusPuzzle,
          labMode: body.mode,
          engine: result.meta.engine || result.puzzle?.engine,
          qualityScore: result.puzzle?.qualityScore,
          funScore: result.puzzle?.funScore ?? result.compose?.funScore,
          fingerprint: result.puzzle?.fingerprint,
          uniquenessScore: result.puzzle?.uniquenessScore,
          createdByUserId: authUser.userId,
        });
        puzzleId = persisted.id;
      } catch (persistError) {
        console.warn("[dev/visual-lab] persist soft-failed", persistError);
      }
    }

    return NextResponse.json({
      success: true,
      /** Inactive lab row may exist; never swaps today's daily */
      published: false,
      persisted: Boolean(puzzleId),
      puzzleId,
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
