import { NextResponse } from "next/server";
import { analyticsEventOps, userSessionOps } from "@/db/analytics-ops";
import type { NewAnalyticsEvent, NewUserSession } from "@/db/models";

/**
 * POST /api/analytics/events
 * Track an analytics event
 */
export async function POST(request: Request) {
  try {
    // Check if request has a body before parsing
    const contentType = request.headers.get("content-type");
    if (!contentType || !contentType.includes("application/json")) {
      return NextResponse.json(
        { error: "Content-Type must be application/json" },
        { status: 400 }
      );
    }

    // Read body as text first to check if it's empty
    const text = await request.text();
    if (!text || text.trim().length === 0) {
      return NextResponse.json(
        { error: "Request body cannot be empty" },
        { status: 400 }
      );
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
    } catch (parseError) {
      return NextResponse.json(
        { error: "Invalid JSON in request body" },
        { status: 400 }
      );
    }

    const {
      eventType,
      sessionId,
      userId,
      metadata = {},
    } = body;

    if (!(eventType && sessionId)) {
      return NextResponse.json(
        { error: "eventType and sessionId are required" },
        { status: 400 }
      );
    }

    // Create event
    const eventId = `event_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    const event: NewAnalyticsEvent = {
      id: eventId,
      userId,
      sessionId,
      eventType,
      timestamp: new Date(),
      metadata,
    };

    await analyticsEventOps.create(event);

    // Handle session-related events
    if (eventType === "USER_VISIT" || eventType === "SESSION_START") {
      // Check if session exists
      const existingSession = await userSessionOps.findById(sessionId);
      if (!existingSession) {
        // Create new session
        const session: NewUserSession = {
          id: sessionId,
          userId,
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
      const session = await userSessionOps.findById(sessionId);
      if (session && !session.endTime) {
        const endTime = new Date();
        const duration =
          metadata.duration || endTime.getTime() - session.startTime.getTime();
        await userSessionOps.endSession(sessionId, endTime, duration);
      }
    } else if (eventType === "PUZZLE_START") {
      // Add puzzle to session
      const session = await userSessionOps.findById(sessionId);
      if (session) {
        await userSessionOps.addEvent(sessionId, eventId);
        if (metadata.puzzleId) {
          await userSessionOps.addPuzzle(sessionId, metadata.puzzleId);
        }
      }
    } else {
      // Add event to session if it exists
      const session = await userSessionOps.findById(sessionId);
      if (session) {
        await userSessionOps.addEvent(sessionId, eventId);
        if (metadata.puzzleId) {
          await userSessionOps.addPuzzle(sessionId, metadata.puzzleId);
        }
      }
    }

    return NextResponse.json({ success: true, eventId });
  } catch (error) {
    console.error("Error tracking event:", error);
    return NextResponse.json(
      { error: "Failed to track event" },
      { status: 500 }
    );
  }
}

