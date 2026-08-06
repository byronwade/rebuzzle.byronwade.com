import { NextResponse } from "next/server";
import { generateImageTile } from "@/ai/puzzle-agent/visual/generate-image-tile";
import { getAuthenticatedUser } from "@/lib/auth-middleware";
import { requireStudioUser } from "@/lib/ugc/require-studio-user";
import { consumeStudioAiGeneration, getStudioAiQuota } from "@/lib/ugc/studio-ai-quota";
import { STUDIO_AI_GENERATION_LIMIT } from "@/lib/ugc/studio-marks";

type GenerateBody = {
  concept?: string;
  prompt?: string;
};

/** GET /api/studio/generate — remaining Studio AI generations. */
export async function GET(request: Request) {
  const auth = await getAuthenticatedUser(request);
  if (!auth) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }
  const gate = await requireStudioUser(auth);
  if (!gate.ok) {
    return NextResponse.json({ error: gate.error }, { status: gate.status });
  }

  const quota = await getStudioAiQuota(auth.userId);
  return NextResponse.json(quota);
}

/**
 * POST /api/studio/generate — spend one of three lifetime AI image generations.
 * Returns an image layer payload ready to place on the Studio artboard.
 */
export async function POST(request: Request) {
  const auth = await getAuthenticatedUser(request);
  if (!auth) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }
  const gate = await requireStudioUser(auth);
  if (!gate.ok) {
    return NextResponse.json({ error: gate.error }, { status: gate.status });
  }

  let body: GenerateBody;
  try {
    body = (await request.json()) as GenerateBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const concept = (body.concept ?? "").trim().slice(0, 48);
  if (concept.length < 2) {
    return NextResponse.json(
      { error: "Describe what to draw (at least 2 characters)." },
      { status: 400 }
    );
  }

  const prompt =
    (body.prompt ?? "").trim().slice(0, 400) ||
    `Simple recognizable ${concept} for a rebus puzzle tile`;

  const before = await getStudioAiQuota(auth.userId);
  if (before.remaining <= 0) {
    return NextResponse.json(
      {
        error: `AI generator limit reached (${STUDIO_AI_GENERATION_LIMIT} per account).`,
        ...before,
      },
      { status: 403 }
    );
  }

  const generated = await generateImageTile({
    concept,
    prompt,
    alt: concept,
  });

  if (!generated.ok || !generated.src) {
    return NextResponse.json(
      {
        error: "Could not generate that image — try a simpler subject.",
        detail: generated.error,
        ...before,
      },
      { status: 502 }
    );
  }

  const quota = await consumeStudioAiGeneration(auth.userId);
  if (!quota) {
    return NextResponse.json(
      {
        error: `AI generator limit reached (${STUDIO_AI_GENERATION_LIMIT} per account).`,
        ...(await getStudioAiQuota(auth.userId)),
      },
      { status: 403 }
    );
  }

  return NextResponse.json({
    layer: {
      kind: "image" as const,
      concept,
      prompt,
      alt: generated.alt || concept,
      src: generated.src,
    },
    ...quota,
  });
}
