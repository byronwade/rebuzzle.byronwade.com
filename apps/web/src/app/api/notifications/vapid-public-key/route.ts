import { NextResponse } from "next/server";
import { buildCacheControl } from "@/lib/http/cache-headers";

export async function GET() {
  const vapidPublicKey = process.env.VAPID_PUBLIC_KEY;

  if (!vapidPublicKey) {
    return NextResponse.json(
      { error: "VAPID public key not configured" },
      { status: 500, headers: { "Cache-Control": buildCacheControl({ private: true }) } }
    );
  }

  return NextResponse.json(
    { vapidPublicKey },
    {
      headers: {
        "Cache-Control": buildCacheControl({
          public: true,
          maxAge: 86400,
          sMaxAge: 86400,
          staleWhileRevalidate: 604800,
        }),
      },
    }
  );
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
}
