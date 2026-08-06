import { NextResponse } from "next/server";
import { listAllTechniques } from "@/ai/puzzle-agent/technique-library";
import {
  listCuratedPictogramIds,
  resolveCuratedPictogram,
} from "@/ai/puzzle-agent/visual/curated-pictograms";
import { getAuthenticatedUser } from "@/lib/auth-middleware";
import { requireStudioUser } from "@/lib/ugc/require-studio-user";
import { getStudioAiQuota } from "@/lib/ugc/studio-ai-quota";
import { STUDIO_MARKS } from "@/lib/ugc/studio-marks";

/** GET /api/studio/catalog — pictogram + technique pickers for Studio. */
export async function GET(request: Request) {
  const auth = await getAuthenticatedUser(request);
  if (!auth) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }
  const gate = await requireStudioUser(auth);
  if (!gate.ok) {
    return NextResponse.json({ error: gate.error }, { status: gate.status });
  }

  const pictograms = listCuratedPictogramIds()
    .map((id) => {
      const resolved = resolveCuratedPictogram(id);
      if (!resolved) return null;
      return {
        id: resolved.assetId,
        concept: resolved.canonicalConcept,
        svg: resolved.svg,
      };
    })
    .filter((row): row is NonNullable<typeof row> => Boolean(row))
    .sort((a, b) => a.concept.localeCompare(b.concept));

  const aiQuota = await getStudioAiQuota(auth.userId);

  return NextResponse.json({
    pictograms,
    marks: STUDIO_MARKS,
    aiQuota,
    techniques: listAllTechniques().map((technique) => ({
      id: technique.id,
      name: technique.name,
      summary: technique.summary,
    })),
  });
}
