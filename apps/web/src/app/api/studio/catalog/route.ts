import { NextResponse } from "next/server";
import {
  listCuratedPictogramIds,
  resolveCuratedPictogram,
} from "@/ai/puzzle-agent/visual/curated-pictograms";
import { listAllTechniques } from "@/ai/puzzle-agent/technique-library";
import { getAuthenticatedUser } from "@/lib/auth-middleware";

/** GET /api/studio/catalog — pictogram + technique pickers for Studio. */
export async function GET(request: Request) {
  const user = await getAuthenticatedUser(request);
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
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
    .filter((row): row is NonNullable<typeof row> => Boolean(row));

  return NextResponse.json({
    pictograms,
    techniques: listAllTechniques().map((technique) => ({
      id: technique.id,
      name: technique.name,
      summary: technique.summary,
    })),
  });
}
