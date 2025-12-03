/**
 * Database Indexes Admin API
 *
 * Endpoints for managing database indexes.
 * Requires admin authentication.
 */

import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { dropAllCustomIndexes, listAllIndexes, setupDatabaseIndexes } from "@/db/indexes";
import { verifyToken } from "@/lib/jwt";
import { userOps } from "@/db/operations";

/**
 * Verify admin authentication
 */
async function verifyAdmin(request: NextRequest): Promise<{ isAdmin: boolean; error?: string }> {
  try {
    const authHeader = request.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return { isAdmin: false, error: "Missing authorization header" };
    }

    const token = authHeader.slice(7);
    const payload = await verifyToken(token);

    if (!payload) {
      return { isAdmin: false, error: "Invalid token" };
    }

    const user = await userOps.findById(payload.userId);
    if (!user?.isAdmin) {
      return { isAdmin: false, error: "Admin access required" };
    }

    return { isAdmin: true };
  } catch {
    return { isAdmin: false, error: "Authentication failed" };
  }
}

/**
 * GET /api/admin/db/indexes
 *
 * List all database indexes
 */
export async function GET(request: NextRequest) {
  const auth = await verifyAdmin(request);
  if (!auth.isAdmin) {
    return NextResponse.json({ error: auth.error }, { status: 401 });
  }

  try {
    const indexes = await listAllIndexes();

    // Convert Map to serializable object
    const indexesObject: Record<string, Array<{ name: string; key: Record<string, number> }>> = {};
    for (const [collection, collIndexes] of indexes) {
      indexesObject[collection] = collIndexes;
    }

    return NextResponse.json({
      success: true,
      indexes: indexesObject,
      totalCollections: indexes.size,
    });
  } catch (error) {
    console.error("[Admin API] Error listing indexes:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to list indexes",
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/db/indexes
 *
 * Create all database indexes
 */
export async function POST(request: NextRequest) {
  const auth = await verifyAdmin(request);
  if (!auth.isAdmin) {
    return NextResponse.json({ error: auth.error }, { status: 401 });
  }

  try {
    const result = await setupDatabaseIndexes();

    return NextResponse.json({
      success: result.success,
      message: result.success
        ? `Successfully created ${result.totalCreated} indexes`
        : `Created ${result.totalCreated} indexes with ${result.totalErrors} errors`,
      results: result.results,
      totalCreated: result.totalCreated,
      totalErrors: result.totalErrors,
    });
  } catch (error) {
    console.error("[Admin API] Error creating indexes:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to create indexes",
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/admin/db/indexes
 *
 * Drop all custom indexes (WARNING: can cause performance issues)
 */
export async function DELETE(request: NextRequest) {
  const auth = await verifyAdmin(request);
  if (!auth.isAdmin) {
    return NextResponse.json({ error: auth.error }, { status: 401 });
  }

  // Require confirmation parameter to prevent accidental deletion
  const { searchParams } = new URL(request.url);
  const confirm = searchParams.get("confirm");

  if (confirm !== "true") {
    return NextResponse.json(
      {
        success: false,
        error: "Add ?confirm=true to confirm index deletion. This can cause performance issues.",
      },
      { status: 400 }
    );
  }

  try {
    const result = await dropAllCustomIndexes();

    return NextResponse.json({
      success: result.success,
      message: result.success
        ? `Successfully dropped ${result.dropped} indexes`
        : `Dropped ${result.dropped} indexes with ${result.errors.length} errors`,
      dropped: result.dropped,
      errors: result.errors,
    });
  } catch (error) {
    console.error("[Admin API] Error dropping indexes:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to drop indexes",
      },
      { status: 500 }
    );
  }
}
