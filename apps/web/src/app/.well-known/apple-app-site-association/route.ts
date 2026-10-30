import { connection } from "next/server";

const bundleIdentifier = "com.byronwade.rebuzzle";

export async function GET(): Promise<Response> {
  await connection();

  const appIDPrefix = process.env.APPLE_APP_ID_PREFIX?.trim();
  if (!appIDPrefix || !/^[A-Za-z0-9-]+$/.test(appIDPrefix)) {
    return Response.json(
      { error: "Apple App Site Association is not configured." },
      { status: 503, headers: { "Cache-Control": "no-store" } }
    );
  }

  return Response.json(
    {
      applinks: {
        details: [
          {
            appIDs: [`${appIDPrefix}.${bundleIdentifier}`],
            components: [{ "/": "/", "?": { source: "share" } }],
          },
        ],
      },
    },
    {
      headers: {
        "Cache-Control": "public, max-age=300, stale-while-revalidate=300",
      },
    }
  );
}
