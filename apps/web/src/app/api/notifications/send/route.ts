import { NextResponse } from "next/server";
import { verifyAdminAccess } from "@/lib/admin-auth";

export async function POST(req: Request) {
  if (!(await verifyAdminAccess(req))) {
    return NextResponse.json({ success: false, error: "Admin access required" }, { status: 403 });
  }
  try {
    const { title, body, userId } = await req.json();

    // eslint-disable-next-line no-console
    console.log("Would send notification:", {
      title,
      body,
      userId,
    });

    // Simulate successful send
    return NextResponse.json({
      success: true,
      message: "Notification would be sent",
    });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("Send notification error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to send notification",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

export function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
}
