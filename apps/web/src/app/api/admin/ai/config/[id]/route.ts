import { NextResponse } from "next/server";
import { verifyAdminAccess } from "@/lib/admin-auth";
import { aiConfigOps } from "@/db/ai-operations";
import { sanitizeId, sanitizeString } from "@/lib/api-validation";

/**
 * GET /api/admin/ai/config/[id]
 * Get a single AI configuration
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await verifyAdminAccess(request);
    if (!admin) {
      return NextResponse.json({ error: "Admin access required" }, { status: 401 });
    }

    const { id: rawId } = await params;
    const id = sanitizeId(rawId);

    if (!id) {
      return NextResponse.json({ error: "Invalid configuration ID", code: "INVALID_ID" }, { status: 400 });
    }

    const config = await aiConfigOps.findById(id);

    if (!config) {
      return NextResponse.json({ error: "Configuration not found", code: "NOT_FOUND" }, { status: 404 });
    }

    return NextResponse.json({ config });
  } catch (error) {
    console.error("AI Config detail API error:", error);
    return NextResponse.json(
      { error: "Failed to fetch AI configuration" },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/admin/ai/config/[id]
 * Update an AI configuration
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await verifyAdminAccess(request);
    if (!admin) {
      return NextResponse.json({ error: "Admin access required" }, { status: 401 });
    }

    const { id: rawId } = await params;
    const id = sanitizeId(rawId);

    if (!id) {
      return NextResponse.json({ error: "Invalid configuration ID", code: "INVALID_ID" }, { status: 400 });
    }

    const body = await request.json();

    const existingConfig = await aiConfigOps.findById(id);
    if (!existingConfig) {
      return NextResponse.json({ error: "Configuration not found", code: "NOT_FOUND" }, { status: 404 });
    }

    // Don't allow editing active/archived configs directly
    if (existingConfig.status === "active") {
      return NextResponse.json(
        { error: "Cannot edit active configuration. Create a new version instead.", code: "CANNOT_EDIT_ACTIVE" },
        { status: 400 }
      );
    }

    const { name: rawName, description: rawDescription, config, abTest } = body;
    const updates: Record<string, unknown> = {};

    // Sanitize string inputs
    if (rawName !== undefined) updates.name = sanitizeString(rawName, 200);
    if (rawDescription !== undefined) updates.description = sanitizeString(rawDescription, 2000);
    if (config !== undefined) updates.config = config;
    if (abTest !== undefined) updates.abTest = abTest;

    await aiConfigOps.update(id, updates);

    const updatedConfig = await aiConfigOps.findById(id);
    return NextResponse.json({ config: updatedConfig });
  } catch (error) {
    console.error("AI Config update API error:", error);
    return NextResponse.json(
      { error: "Failed to update AI configuration" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/admin/ai/config/[id]
 * Archive an AI configuration
 */
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await verifyAdminAccess(request);
    if (!admin) {
      return NextResponse.json({ error: "Admin access required" }, { status: 401 });
    }

    const { id: rawId } = await params;
    const id = sanitizeId(rawId);

    if (!id) {
      return NextResponse.json({ error: "Invalid configuration ID", code: "INVALID_ID" }, { status: 400 });
    }

    const config = await aiConfigOps.findById(id);

    if (!config) {
      return NextResponse.json({ error: "Configuration not found", code: "NOT_FOUND" }, { status: 404 });
    }

    if (config.isDefault && config.status === "active") {
      return NextResponse.json(
        { error: "Cannot archive the default active configuration", code: "CANNOT_ARCHIVE_DEFAULT" },
        { status: 400 }
      );
    }

    await aiConfigOps.archive(id);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("AI Config archive API error:", error);
    return NextResponse.json(
      { error: "Failed to archive AI configuration" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/ai/config/[id]
 * Activate an AI configuration
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await verifyAdminAccess(request);
    if (!admin) {
      return NextResponse.json({ error: "Admin access required" }, { status: 401 });
    }

    const { id: rawId } = await params;
    const id = sanitizeId(rawId);

    if (!id) {
      return NextResponse.json({ error: "Invalid configuration ID", code: "INVALID_ID" }, { status: 400 });
    }

    const { searchParams } = new URL(request.url);
    const action = searchParams.get("action");

    const config = await aiConfigOps.findById(id);
    if (!config) {
      return NextResponse.json({ error: "Configuration not found", code: "NOT_FOUND" }, { status: 404 });
    }

    if (action === "activate") {
      await aiConfigOps.activate(id);
      return NextResponse.json({ success: true, message: "Configuration activated" });
    }

    return NextResponse.json({ error: "Invalid action", code: "INVALID_ACTION" }, { status: 400 });
  } catch (error) {
    console.error("AI Config action API error:", error);
    return NextResponse.json(
      { error: "Failed to perform action on AI configuration" },
      { status: 500 }
    );
  }
}
