import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { ensureValidated } from "./lib/startup-validation";

/**
 * Next.js Proxy
 *
 * Runs on every request before the route handler
 * Validates environment on first request
 */
export function proxy(request: NextRequest) {
  // Validate environment on first request
  try {
    ensureValidated();
  } catch (error) {
    // If validation fails, return error response
    return NextResponse.json(
      {
        error: "Server configuration error",
        message: "Environment validation failed. Please check server logs.",
      },
      { status: 500 }
    );
  }

  // Continue to route handler
  return NextResponse.next();
}

// Configure which routes this proxy runs on
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};

