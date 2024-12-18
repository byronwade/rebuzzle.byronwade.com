import { NextResponse } from "next/server";

export async function GET() {
	const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

	if (!vapidPublicKey) {
		console.error("[VapidAPI] VAPID public key not found in environment variables");
		return NextResponse.json({ error: "VAPID public key not configured" }, { status: 500 });
	}

	// Remove any whitespace and ensure the key is properly formatted
	const cleanKey = vapidPublicKey.trim();

	console.log("[VapidAPI] Returning VAPID public key");
	return NextResponse.json({ vapidPublicKey: cleanKey });
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
