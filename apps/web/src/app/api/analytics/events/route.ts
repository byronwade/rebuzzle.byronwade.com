import { NextResponse } from "next/server";
import { analyticsEventOps, userSessionOps } from "@/db/analytics-ops";
import type { NewAnalyticsEvent, NewUserSession } from "@/db/models";
import { sanitizeId } from "@/lib/api-validation";
import { rateLimiters } from "@/lib/middleware/rate-limit";

/**
 * POST /api/analytics/events
 * Track an analytics event
 * Note: This endpoint is intentionally public for client-side tracking,
 * but rate limited to prevent abuse.
 */
export async function POST(request: Request) {
  // Rate limit analytics events to prevent abuse
  const rateLimitResult = await rateLimiters.api(request);
  if (rateLimitResult && !rateLimitResult.success) {
    return NextResponse.json(
      { error: "Too many requests" },
      { status: 429 }
    );
  }

  try {
    // Check if request has a body before parsing
    const contentType = request.headers.get("content-type");
    if (!contentType || !contentType.includes("application/json")) {
      return NextResponse.json({ error: "Content-Type must be application/json" }, { status: 400 });
    }

    // Read body as text first to check if it's empty
    const text = await request.text();
    if (!text || text.trim().length === 0) {
      return NextResponse.json({ error: "Request body cannot be empty" }, { status: 400 });
    }

    // Parse JSON
    let body: {
      eventType: string;
      sessionId: string;
      userId?: string;
      metadata?: Record<string, any>;
    };
    try {
      body = JSON.parse(text);
    } catch (_parseError) {
      return NextResponse.json({ error: "Invalid JSON in request body" }, { status: 400 });
    }

    const { eventType, sessionId, userId, metadata = {} } = body;

    if (!(eventType && sessionId)) {
      return NextResponse.json({ error: "eventType and sessionId are required" }, { status: 400 });
    }

    // Sanitize IDs to prevent injection and limit length
    const sanitizedSessionId = sanitizeId(sessionId);
    const sanitizedUserId = userId ? sanitizeId(userId) : undefined;

    if (!sanitizedSessionId) {
      return NextResponse.json({ error: "Invalid sessionId format" }, { status: 400 });
    }

    // Create event
    const eventId = `event_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    const event: NewAnalyticsEvent = {
      id: eventId,
      userId: sanitizedUserId,
      sessionId: sanitizedSessionId,
      eventType: eventType.slice(0, 100), // Limit event type length
      timestamp: new Date(),
      metadata,
    };

    await analyticsEventOps.create(event);

    // Handle session-related events (use sanitized IDs)
    if (eventType === "USER_VISIT" || eventType === "SESSION_START") {
      // Check if session exists
      const existingSession = await userSessionOps.findById(sanitizedSessionId);
      if (!existingSession) {
        // Create new session
        const session: NewUserSession = {
          id: sanitizedSessionId,
          userId: sanitizedUserId,
          startTime: new Date(),
          isReturningUser: metadata.isReturningUser,
          events: [eventId],
          puzzleIds: [],
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        await userSessionOps.create(session);
      }
    } else if (eventType === "SESSION_END") {
      // End session
      const session = await userSessionOps.findById(sanitizedSessionId);
      if (session && !session.endTime) {
        const endTime = new Date();
        const duration = metadata.duration || endTime.getTime() - session.startTime.getTime();
        await userSessionOps.endSession(sanitizedSessionId, endTime, duration);
      }
    } else if (eventType === "PUZZLE_START") {
      // Add puzzle to session
      const session = await userSessionOps.findById(sanitizedSessionId);
      if (session) {
        await userSessionOps.addEvent(sanitizedSessionId, eventId);
        if (metadata.puzzleId) {
          const sanitizedPuzzleId = sanitizeId(metadata.puzzleId);
          if (sanitizedPuzzleId) {
            await userSessionOps.addPuzzle(sanitizedSessionId, sanitizedPuzzleId);
          }
        }
      }
    } else {
      // Add event to session if it exists
      const session = await userSessionOps.findById(sanitizedSessionId);
      if (session) {
        await userSessionOps.addEvent(sanitizedSessionId, eventId);
        if (metadata.puzzleId) {
          const sanitizedPuzzleId = sanitizeId(metadata.puzzleId);
          if (sanitizedPuzzleId) {
            await userSessionOps.addPuzzle(sanitizedSessionId, sanitizedPuzzleId);
          }
        }
      }
    }

    return NextResponse.json({ success: true, eventId });
  } catch (error) {
    console.error("Error tracking event:", error);
    return NextResponse.json({ error: "Failed to track event" }, { status: 500 });
  }
}
