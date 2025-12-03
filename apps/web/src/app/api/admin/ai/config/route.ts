import { NextResponse } from "next/server";
import { verifyAdminAccess } from "@/lib/admin-auth";
import { aiConfigOps } from "@/db/ai-operations";
import type { NewAIConfiguration } from "@/db/models";
import { v4 as uuidv4 } from "uuid";
import { sanitizeString } from "@/lib/api-validation";

/**
 * GET /api/admin/ai/config
 * List all AI configurations
 */
export async function GET(request: Request) {
  try {
    const admin = await verifyAdminAccess(request);
    if (!admin) {
      return NextResponse.json({ error: "Admin access required" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const includeArchived = searchParams.get("includeArchived") === "true";
    const activeOnly = searchParams.get("activeOnly") === "true";

    if (activeOnly) {
      const activeConfig = await aiConfigOps.findActive();
      return NextResponse.json({ config: activeConfig });
    }

    const [configs, activeABTests] = await Promise.all([
      aiConfigOps.findAll(includeArchived),
      aiConfigOps.getActiveABTests(),
    ]);

    return NextResponse.json({
      configs,
      activeABTests,
    });
  } catch (error) {
    console.error("AI Config API error:", error);
    return NextResponse.json(
      { error: "Failed to fetch AI configurations" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/ai/config
 * Create a new AI configuration
 */
export async function POST(request: Request) {
  try {
    const admin = await verifyAdminAccess(request);
    if (!admin) {
      return NextResponse.json({ error: "Admin access required" }, { status: 401 });
    }

    const body = await request.json();
    const { name: rawName, description: rawDescription, config, version: rawVersion, abTest } = body;

    // Sanitize string inputs
    const name = sanitizeString(rawName, 200);
    const description = sanitizeString(rawDescription, 2000);
    const version = sanitizeString(rawVersion, 50);

    if (!name || !config || !version) {
      return NextResponse.json(
        { error: "name, config, and version are required", code: "MISSING_FIELDS" },
        { status: 400 }
      );
    }

    // Validate config structure
    if (typeof config !== "object") {
      return NextResponse.json(
        { error: "config must be an object", code: "INVALID_CONFIG" },
        { status: 400 }
      );
    }

    // Check if version already exists
    const existingVersion = await aiConfigOps.findByVersion(version);
    if (existingVersion) {
      return NextResponse.json(
        { error: "Version already exists", code: "VERSION_EXISTS" },
        { status: 400 }
      );
    }

    const newConfig: NewAIConfiguration = {
      id: uuidv4(),
      version,
      name,
      description: description || "",
      config,
      abTest,
      status: abTest ? "testing" : "draft",
      isDefault: false,
      createdBy: admin.id,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const created = await aiConfigOps.create(newConfig);

    return NextResponse.json({ config: created }, { status: 201 });
  } catch (error) {
    console.error("AI Config create API error:", error);
    return NextResponse.json(
      { error: "Failed to create AI configuration" },
      { status: 500 }
    );
  }
}
