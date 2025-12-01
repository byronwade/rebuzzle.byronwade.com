/**
 * Analytics Operations
 *
 * MongoDB operations for analytics and tracking
 */

import type {
  AnalyticsEvent,
  NewAnalyticsEvent,
  NewUserSession,
  UserSession,
} from "./models";
import { getCollection } from "./mongodb";

// ============================================================================
// ANALYTICS EVENT OPERATIONS
// ============================================================================

export const analyticsEventOps = {
  /**
   * Create a new analytics event
   */
  async create(event: NewAnalyticsEvent): Promise<AnalyticsEvent> {
    const collection = getCollection<AnalyticsEvent>("analyticsEvents");
    await collection.insertOne(event);
    return event as AnalyticsEvent;
  },

  /**
   * Get events by user ID
   */
  async findByUserId(userId: string, limit = 100): Promise<AnalyticsEvent[]> {
    const collection = getCollection<AnalyticsEvent>("analyticsEvents");
    return await collection
      .find({ userId })
      .sort({ timestamp: -1 })
      .limit(limit)
      .toArray();
  },

  /**
   * Get events by session ID
   */
  async findBySessionId(sessionId: string): Promise<AnalyticsEvent[]> {
    const collection = getCollection<AnalyticsEvent>("analyticsEvents");
    return await collection
      .find({ sessionId })
      .sort({ timestamp: 1 })
      .toArray();
  },

  /**
   * Get events by type
   */
  async findByEventType(
    eventType: string,
    limit = 100
  ): Promise<AnalyticsEvent[]> {
    const collection = getCollection<AnalyticsEvent>("analyticsEvents");
    return await collection
      .find({ eventType })
      .sort({ timestamp: -1 })
      .limit(limit)
      .toArray();
  },

  /**
   * Get events by puzzle ID
   */
  async findByPuzzleId(puzzleId: string): Promise<AnalyticsEvent[]> {
    const collection = getCollection<AnalyticsEvent>("analyticsEvents");
    return await collection
      .find({ "metadata.puzzleId": puzzleId })
      .sort({ timestamp: -1 })
      .toArray();
  },

  /**
   * Count events by type
   */
  async countByEventType(eventType: string): Promise<number> {
    const collection = getCollection<AnalyticsEvent>("analyticsEvents");
    return await collection.countDocuments({ eventType });
  },
};

// ============================================================================
// USER SESSION OPERATIONS
// ============================================================================

export const userSessionOps = {
  /**
   * Create a new user session
   */
  async create(session: NewUserSession): Promise<UserSession> {
    const collection = getCollection<UserSession>("userSessions");
    await collection.insertOne(session);
    return session as UserSession;
  },

  /**
   * Find session by ID
   */
  async findById(id: string): Promise<UserSession | null> {
    const collection = getCollection<UserSession>("userSessions");
    return await collection.findOne({ id });
  },

  /**
   * Find active sessions (no endTime)
   */
  async findActiveSessions(userId?: string): Promise<UserSession[]> {
    const collection = getCollection<UserSession>("userSessions");
    const query: any = { endTime: { $exists: false } };
    if (userId) {
      query.userId = userId;
    }
    return await collection.find(query).sort({ startTime: -1 }).toArray();
  },

  /**
   * Update session end time
   */
  async endSession(
    id: string,
    endTime: Date,
    duration?: number
  ): Promise<void> {
    const collection = getCollection<UserSession>("userSessions");
    const update: any = { endTime, updatedAt: new Date() };
    if (duration !== undefined) {
      update.duration = duration;
    }
    await collection.updateOne({ id }, { $set: update });
  },

  /**
   * Add event to session
   */
  async addEvent(sessionId: string, eventId: string): Promise<void> {
    const collection = getCollection<UserSession>("userSessions");
    await collection.updateOne(
      { id: sessionId },
      { $addToSet: { events: eventId }, $set: { updatedAt: new Date() } }
    );
  },

  /**
   * Add puzzle to session
   */
  async addPuzzle(sessionId: string, puzzleId: string): Promise<void> {
    const collection = getCollection<UserSession>("userSessions");
    await collection.updateOne(
      { id: sessionId },
      { $addToSet: { puzzleIds: puzzleId }, $set: { updatedAt: new Date() } }
    );
  },

  /**
   * Get sessions by user ID
   */
  async findByUserId(userId: string, limit = 50): Promise<UserSession[]> {
    const collection = getCollection<UserSession>("userSessions");
    return await collection
      .find({ userId })
      .sort({ startTime: -1 })
      .limit(limit)
      .toArray();
  },
};

// ============================================================================
// ANALYTICS QUERIES
// ============================================================================

export const analyticsQueries = {
  /**
   * Get active users (DAU, WAU, MAU)
   */
  async getActiveUsers(
    timeframe: "day" | "week" | "month" = "day"
  ): Promise<number> {
    const collection = getCollection<UserSession>("userSessions");
    const now = new Date();
    let startDate: Date;

    switch (timeframe) {
      case "day":
        startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        break;
      case "week":
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case "month":
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
    }

    const uniqueUsers = await collection.distinct("userId", {
      startTime: { $gte: startDate },
      userId: { $exists: true, $ne: null },
    } as Record<string, unknown>);

    return uniqueUsers.length;
  },

  /**
   * Get user retention rates
   */
  async getUserRetention(): Promise<{
    day1: number;
    day7: number;
    day30: number;
  }> {
    const sessionsCollection = getCollection<UserSession>("userSessions");
    const eventsCollection = getCollection<AnalyticsEvent>("analyticsEvents");

    const now = new Date();
    const day1Ago = new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000);
    const day7Ago = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const day30Ago = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    // Get all users who signed up
    const signupEvents = await eventsCollection
      .find({ eventType: "USER_SIGNUP" })
      .toArray();
    const totalSignups = signupEvents.length;

    if (totalSignups === 0) {
      return { day1: 0, day7: 0, day30: 0 };
    }

    // Get returning users (users who logged in after signup)
    const returnEvents = await eventsCollection
      .find({
        eventType: "USER_RETURN",
        timestamp: { $gte: day1Ago },
      })
      .toArray();
    const day1Returns = new Set(returnEvents.map((e) => e.userId)).size;

    const returnEvents7 = await eventsCollection
      .find({
        eventType: "USER_RETURN",
        timestamp: { $gte: day7Ago },
      })
      .toArray();
    const day7Returns = new Set(returnEvents7.map((e) => e.userId)).size;

    const returnEvents30 = await eventsCollection
      .find({
        eventType: "USER_RETURN",
        timestamp: { $gte: day30Ago },
      })
      .toArray();
    const day30Returns = new Set(returnEvents30.map((e) => e.userId)).size;

    return {
      day1: totalSignups > 0 ? (day1Returns / totalSignups) * 100 : 0,
      day7: totalSignups > 0 ? (day7Returns / totalSignups) * 100 : 0,
      day30: totalSignups > 0 ? (day30Returns / totalSignups) * 100 : 0,
    };
  },

  /**
   * Get puzzle completion rates
   */
  async getCompletionRates(): Promise<{
    overall: number;
    byDifficulty: Record<string, number>;
    completed: number;
    abandoned: number;
    total: number;
  }> {
    const collection = getCollection<AnalyticsEvent>("analyticsEvents");

    // Get all puzzle starts
    const starts = await collection
      .find({ eventType: "PUZZLE_START" })
      .toArray();
    const total = starts.length;

    // Get all puzzle completions
    const completions = await collection
      .find({ eventType: "PUZZLE_COMPLETE" })
      .toArray();
    const completed = completions.length;

    // Get all puzzle abandons
    const abandons = await collection
      .find({ eventType: "PUZZLE_ABANDON" })
      .toArray();
    const abandoned = abandons.length;

    // Calculate by difficulty
    const byDifficulty: Record<string, number> = {};
    const difficultyGroups: Record<
      string,
      { starts: number; completes: number }
    > = {};

    starts.forEach((start) => {
      const difficulty = start.metadata.difficulty || "unknown";
      if (!difficultyGroups[difficulty]) {
        difficultyGroups[difficulty] = { starts: 0, completes: 0 };
      }
      difficultyGroups[difficulty].starts++;
    });

    completions.forEach((completion) => {
      const difficulty = completion.metadata.difficulty || "unknown";
      if (!difficultyGroups[difficulty]) {
        difficultyGroups[difficulty] = { starts: 0, completes: 0 };
      }
      difficultyGroups[difficulty].completes++;
    });

    Object.keys(difficultyGroups).forEach((difficulty) => {
      const group = difficultyGroups[difficulty];
      if (group) {
        byDifficulty[difficulty] =
          group.starts > 0 ? (group.completes / group.starts) * 100 : 0;
      }
    });

    return {
      overall: total > 0 ? (completed / total) * 100 : 0,
      byDifficulty,
      completed,
      abandoned,
      total,
    };
  },

  /**
   * Get engagement metrics
   */
  async getEngagementMetrics(): Promise<{
    averageSessionDuration: number;
    averagePuzzlesPerSession: number;
    averageHintsPerPuzzle: number;
    averageAttemptsPerPuzzle: number;
  }> {
    const sessionsCollection = getCollection<UserSession>("userSessions");
    const eventsCollection = getCollection<AnalyticsEvent>("analyticsEvents");

    // Get all completed sessions
    const sessions = await sessionsCollection
      .find({ duration: { $exists: true } })
      .toArray();

    const totalDuration = sessions.reduce(
      (sum, session) => sum + (session.duration || 0),
      0
    );
    const averageSessionDuration =
      sessions.length > 0 ? totalDuration / sessions.length : 0;

    // Average puzzles per session
    const totalPuzzles = sessions.reduce(
      (sum, session) => sum + session.puzzleIds.length,
      0
    );
    const averagePuzzlesPerSession =
      sessions.length > 0 ? totalPuzzles / sessions.length : 0;

    // Average hints per puzzle
    const hintEvents = await eventsCollection
      .find({ eventType: "HINT_USED" })
      .toArray();
    const puzzleStarts = await eventsCollection
      .find({ eventType: "PUZZLE_START" })
      .toArray();
    const averageHintsPerPuzzle =
      puzzleStarts.length > 0 ? hintEvents.length / puzzleStarts.length : 0;

    // Average attempts per puzzle
    const guessEvents = await eventsCollection
      .find({ eventType: "GUESS_SUBMITTED" })
      .toArray();
    const averageAttemptsPerPuzzle =
      puzzleStarts.length > 0 ? guessEvents.length / puzzleStarts.length : 0;

    return {
      averageSessionDuration,
      averagePuzzlesPerSession,
      averageHintsPerPuzzle,
      averageAttemptsPerPuzzle,
    };
  },

  /**
   * Get leaderboard by timeframe
   */
  async getLeaderboardByTimeframe(
    timeframe: "today" | "week" | "month" | "allTime" = "allTime",
    limit = 10
  ): Promise<
    Array<{
      userId: string;
      username: string;
      points: number;
      completions: number;
      completionRate: number;
    }>
  > {
    const eventsCollection = getCollection<AnalyticsEvent>("analyticsEvents");
    const usersCollection = getCollection<any>("users");

    let startDate: Date | null = null;
    if (timeframe !== "allTime") {
      const now = new Date();
      switch (timeframe) {
        case "today":
          startDate = new Date(now);
          startDate.setHours(0, 0, 0, 0);
          break;
        case "week":
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case "month":
          startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          break;
      }
    }

    // Get puzzle completions in timeframe
    const query: any = { eventType: "PUZZLE_COMPLETE" };
    if (startDate) {
      query.timestamp = { $gte: startDate };
    }

    const completions = await eventsCollection.find(query).toArray();

    // Aggregate by user
    const userStats: Record<
      string,
      { points: number; completions: number; starts: number }
    > = {};

    completions.forEach((event) => {
      if (!event.userId) return;
      if (!userStats[event.userId]) {
        userStats[event.userId] = { points: 0, completions: 0, starts: 0 };
      }
      const stats = userStats[event.userId];
      if (stats) {
        stats.completions++;
        stats.points += event.metadata.score || 0;
      }
    });

    // Get puzzle starts for completion rate
    const startQuery: any = { eventType: "PUZZLE_START" };
    if (startDate) {
      startQuery.timestamp = { $gte: startDate };
    }
    const starts = await eventsCollection.find(startQuery).toArray();

    starts.forEach((event) => {
      if (!event.userId) return;
      if (!userStats[event.userId]) {
        userStats[event.userId] = { points: 0, completions: 0, starts: 0 };
      }
      const stats = userStats[event.userId];
      if (stats) {
        stats.starts++;
      }
    });

    // Get usernames
    const userIds = Object.keys(userStats);
    const users = await usersCollection
      .find({ id: { $in: userIds } })
      .toArray();
    const userMap = new Map(users.map((u) => [u.id, u.username]));

    // Build leaderboard
    const leaderboard = Object.entries(userStats)
      .map(([userId, stats]) => ({
        userId,
        username: userMap.get(userId) || "Unknown",
        points: stats.points,
        completions: stats.completions,
        completionRate:
          stats.starts > 0 ? (stats.completions / stats.starts) * 100 : 0,
      }))
      .sort((a, b) => b.points - a.points)
      .slice(0, limit);

    return leaderboard;
  },

  /**
   * Get total signups
   */
  async getTotalSignups(): Promise<number> {
    const collection = getCollection<AnalyticsEvent>("analyticsEvents");
    return await collection.countDocuments({ eventType: "USER_SIGNUP" });
  },

  /**
   * Get metrics summary
   */
  async getMetricsSummary(): Promise<{
    totalSignups: number;
    activeUsers: {
      day: number;
      week: number;
      month: number;
    };
    retention: {
      day1: number;
      day7: number;
      day30: number;
    };
    completion: {
      overall: number;
      completed: number;
      abandoned: number;
      total: number;
    };
    engagement: {
      averageSessionDuration: number;
      averagePuzzlesPerSession: number;
    };
  }> {
    const [totalSignups, activeUsers, retention, completion, engagement] =
      await Promise.all([
        this.getTotalSignups(),
        Promise.all([
          this.getActiveUsers("day"),
          this.getActiveUsers("week"),
          this.getActiveUsers("month"),
        ]).then(([day, week, month]) => ({ day, week, month })),
        this.getUserRetention(),
        this.getCompletionRates(),
        this.getEngagementMetrics(),
      ]);

    return {
      totalSignups,
      activeUsers,
      retention,
      completion: {
        overall: completion.overall,
        completed: completion.completed,
        abandoned: completion.abandoned,
        total: completion.total,
      },
      engagement: {
        averageSessionDuration: engagement.averageSessionDuration,
        averagePuzzlesPerSession: engagement.averagePuzzlesPerSession,
      },
    };
  },
};
