import { unstable_cache } from "next/cache";
import { NextResponse } from "next/server";
import type {
  AnalyticsEvent,
  BlogPost,
  GameSession,
  Puzzle,
  PuzzleAttempt,
  User,
  UserSession,
  UserStats,
} from "@/db/models";
import { getCollection } from "@/db/mongodb";
import { verifyAdminAccess } from "@/lib/admin-auth";

// Cache TTL constants
const ADMIN_STATS_CACHE_TTL = 60; // 60 seconds

/**
 * Fetch admin statistics data
 * Extracted for caching
 */
async function fetchAdminStats(dateStart: Date, dateEnd: Date) {
  try {
    const usersCollection = getCollection<User>("users");
    const puzzlesCollection = getCollection<Puzzle>("puzzles");
    const blogPostsCollection = getCollection<BlogPost>("blogPosts");
    const userStatsCollection = getCollection<UserStats>("userStats");
    const analyticsEventsCollection =
      getCollection<AnalyticsEvent>("analyticsEvents");
    const emailSubscriptionsCollection = getCollection("emailSubscriptions");
    const puzzleAttemptsCollection =
      getCollection<PuzzleAttempt>("puzzleAttempts");
    const gameSessionsCollection = getCollection<GameSession>("gameSessions");
    const userSessionsCollection = getCollection<UserSession>("userSessions");

    // Get all counts
    const [
      totalUsers,
      totalPuzzles,
      totalBlogPosts,
      totalUserStats,
      totalAnalyticsEvents,
      totalEmailSubscriptions,
      activeUsers,
      activePuzzles,
      publishedBlogPosts,
    ] = await Promise.all([
      usersCollection.countDocuments(),
      puzzlesCollection.countDocuments(),
      blogPostsCollection.countDocuments(),
      userStatsCollection.countDocuments(),
      analyticsEventsCollection.countDocuments(),
      emailSubscriptionsCollection.countDocuments({ enabled: true }),
      usersCollection.countDocuments({ lastLogin: { $exists: true } }),
      puzzlesCollection.countDocuments({ active: true }),
      blogPostsCollection.countDocuments({ publishedAt: { $lte: new Date() } }),
    ]);

    // Get recent activity (last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const [
      newUsersLast7Days,
      newPuzzlesLast7Days,
      newBlogPostsLast7Days,
      eventsLast7Days,
    ] = await Promise.all([
      usersCollection.countDocuments({ createdAt: { $gte: sevenDaysAgo } }),
      puzzlesCollection.countDocuments({ createdAt: { $gte: sevenDaysAgo } }),
      blogPostsCollection.countDocuments({ createdAt: { $gte: sevenDaysAgo } }),
      analyticsEventsCollection.countDocuments({
        timestamp: { $gte: sevenDaysAgo },
      }),
    ]);

    // Get top users by points
    const topUsers = await userStatsCollection
      .find({})
      .sort({ points: -1 })
      .limit(10)
      .toArray();

    // Get user IDs for top users
    const topUserIds = topUsers.map((stats) => stats.userId);
    const topUsersData = await usersCollection
      .find({ id: { $in: topUserIds } })
      .toArray();

    const topUsersWithNames = topUsers.map((stats) => {
      const user = topUsersData.find((u) => u.id === stats.userId);
      return {
        ...stats,
        username: user?.username || "Unknown",
        email: user?.email || "Unknown",
      };
    });

    // Get puzzle type distribution
    const puzzleTypes = await puzzlesCollection
      .aggregate([
        {
          $group: {
            _id: "$puzzleType",
            count: { $sum: 1 },
          },
        },
        { $sort: { count: -1 } },
      ])
      .toArray();

    // Get event type distribution
    const eventTypes = await analyticsEventsCollection
      .aggregate([
        {
          $group: {
            _id: "$eventType",
            count: { $sum: 1 },
          },
        },
        { $sort: { count: -1 } },
        { $limit: 10 },
      ])
      .toArray();

    // Get daily signups (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const dailySignups = await usersCollection
      .aggregate([
        {
          $match: {
            createdAt: { $gte: thirtyDaysAgo },
          },
        },
        {
          $group: {
            _id: {
              $dateToString: {
                format: "%Y-%m-%d",
                date: "$createdAt",
              },
            },
            count: { $sum: 1 },
          },
        },
        { $sort: { _id: 1 } },
      ])
      .toArray();

    // ============================================
    // NEW METRICS: User Engagement
    // ============================================

    // Daily Active Users (DAU) - last 30 days
    const dailyActiveUsers = await analyticsEventsCollection
      .aggregate([
        {
          $match: {
            timestamp: { $gte: dateStart, $lte: dateEnd },
            userId: { $exists: true, $ne: null as any },
          },
        },
        {
          $group: {
            _id: {
              $dateToString: {
                format: "%Y-%m-%d",
                date: "$timestamp",
              },
            },
            uniqueUsers: { $addToSet: "$userId" },
          },
        },
        {
          $project: {
            date: "$_id",
            count: { $size: "$uniqueUsers" },
          },
        },
        { $sort: { date: 1 } },
      ])
      .toArray();

    // Monthly Active Users (MAU) - last 30 days
    const monthlyActiveUsers = await analyticsEventsCollection.distinct(
      "userId",
      {
        timestamp: { $gte: dateStart, $lte: dateEnd },
        userId: { $exists: true, $ne: null as any },
      } as any
    );

    // Average session duration
    const sessionsWithDuration = await userSessionsCollection
      .find({
        endTime: { $exists: true },
        startTime: { $gte: dateStart, $lte: dateEnd },
      })
      .toArray();

    const avgSessionDuration =
      sessionsWithDuration.length > 0
        ? sessionsWithDuration.reduce(
            (sum, session) => sum + (session.duration || 0),
            0
          ) / sessionsWithDuration.length
        : 0;

    // Returning vs new users
    const allUserSessions = await userSessionsCollection
      .find({
        startTime: { $gte: dateStart, $lte: dateEnd },
      })
      .toArray();

    const returningUsers = allUserSessions.filter(
      (s) => s.isReturningUser
    ).length;
    const newUsers = allUserSessions.filter((s) => !s.isReturningUser).length;

    // User retention (1-day, 7-day, 30-day)
    const oneDayAgo = new Date();
    oneDayAgo.setDate(oneDayAgo.getDate() - 1);
    const sevenDaysAgoRetention = new Date();
    sevenDaysAgoRetention.setDate(sevenDaysAgoRetention.getDate() - 7);
    const thirtyDaysAgoRetention = new Date();
    thirtyDaysAgoRetention.setDate(thirtyDaysAgoRetention.getDate() - 30);

    const usersActiveToday = await analyticsEventsCollection.distinct(
      "userId",
      {
        timestamp: { $gte: oneDayAgo },
        userId: { $exists: true, $ne: null as any },
      }
    );

    const usersActive7DaysAgo = await analyticsEventsCollection.distinct(
      "userId",
      {
        timestamp: {
          $gte: new Date(sevenDaysAgoRetention.getTime() - 24 * 60 * 60 * 1000),
          $lte: sevenDaysAgoRetention,
        },
        userId: { $exists: true, $ne: null as any },
      }
    );

    const usersActive30DaysAgo = await analyticsEventsCollection.distinct(
      "userId",
      {
        timestamp: {
          $gte: new Date(
            thirtyDaysAgoRetention.getTime() - 24 * 60 * 60 * 1000
          ),
          $lte: thirtyDaysAgoRetention,
        },
        userId: { $exists: true, $ne: null as any },
      }
    );

    const retention1Day =
      usersActive7DaysAgo.length > 0
        ? (usersActiveToday.filter((u) => usersActive7DaysAgo.includes(u))
            .length /
            usersActive7DaysAgo.length) *
          100
        : 0;

    const retention7Day =
      usersActive30DaysAgo.length > 0
        ? (usersActive7DaysAgo.filter((u) => usersActive30DaysAgo.includes(u))
            .length /
            usersActive30DaysAgo.length) *
          100
        : 0;

    // User churn rate (users who haven't been active in last 7 days)
    const activeInLast7Days = await analyticsEventsCollection.distinct(
      "userId",
      {
        timestamp: { $gte: sevenDaysAgo },
        userId: { $exists: true, $ne: null as any },
      }
    );
    const totalUsersWithActivity = await analyticsEventsCollection.distinct(
      "userId",
      {
        userId: { $exists: true, $ne: null as any },
      }
    );
    const churnedUsers =
      totalUsersWithActivity.length - activeInLast7Days.length;
    const churnRate =
      totalUsersWithActivity.length > 0
        ? (churnedUsers / totalUsersWithActivity.length) * 100
        : 0;

    // ============================================
    // NEW METRICS: Puzzle Performance
    // ============================================

    // Puzzle completion rates by type
    const puzzleCompletionRates = await puzzlesCollection
      .aggregate([
        {
          $lookup: {
            from: "gameSessions",
            localField: "id",
            foreignField: "puzzleId",
            as: "sessions",
          },
        },
        {
          $project: {
            puzzleType: { $ifNull: ["$puzzleType", "unknown"] },
            totalSessions: { $size: "$sessions" },
            completedSessions: {
              $size: {
                $filter: {
                  input: "$sessions",
                  as: "session",
                  cond: { $eq: ["$$session.completed", true] },
                },
              },
            },
          },
        },
        {
          $group: {
            _id: "$puzzleType",
            totalSessions: { $sum: "$totalSessions" },
            completedSessions: { $sum: "$completedSessions" },
          },
        },
        {
          $project: {
            type: "$_id",
            completionRate: {
              $cond: {
                if: { $gt: ["$totalSessions", 0] },
                then: {
                  $multiply: [
                    { $divide: ["$completedSessions", "$totalSessions"] },
                    100,
                  ],
                },
                else: 0,
              },
            },
            totalSessions: 1,
            completedSessions: 1,
          },
        },
        { $sort: { completionRate: -1 } },
      ])
      .toArray();

    // Average time to solve by puzzle type
    const avgTimeToSolve = await puzzleAttemptsCollection
      .aggregate([
        {
          $match: {
            isCorrect: true,
            timeSpentSeconds: { $exists: true, $ne: null as any },
            attemptedAt: { $gte: dateStart, $lte: dateEnd },
          },
        },
        {
          $lookup: {
            from: "puzzles",
            localField: "puzzleId",
            foreignField: "id",
            as: "puzzle",
          },
        },
        { $unwind: "$puzzle" },
        {
          $group: {
            _id: { $ifNull: ["$puzzle.puzzleType", "unknown"] },
            avgTime: { $avg: "$timeSpentSeconds" },
            count: { $sum: 1 },
          },
        },
        {
          $project: {
            type: "$_id",
            avgTimeSeconds: { $round: ["$avgTime", 2] },
            count: 1,
          },
        },
        { $sort: { avgTimeSeconds: -1 } },
      ])
      .toArray();

    // Most popular puzzles (by attempts)
    const popularPuzzles = await puzzleAttemptsCollection
      .aggregate([
        {
          $match: {
            attemptedAt: { $gte: dateStart, $lte: dateEnd },
          },
        },
        {
          $group: {
            _id: "$puzzleId",
            attempts: { $sum: 1 },
            uniqueUsers: { $addToSet: "$userId" },
          },
        },
        {
          $project: {
            puzzleId: "$_id",
            attempts: 1,
            uniqueUsers: { $size: "$uniqueUsers" },
          },
        },
        { $sort: { attempts: -1 } },
        { $limit: 20 },
      ])
      .toArray();

    // Get puzzle details for popular puzzles
    const popularPuzzleIds = popularPuzzles.map((p) => p.puzzleId);
    const popularPuzzleDetails = await puzzlesCollection
      .find({ id: { $in: popularPuzzleIds } })
      .toArray();

    const popularPuzzlesWithDetails = popularPuzzles.map((p) => {
      const puzzle = popularPuzzleDetails.find((pd) => pd.id === p.puzzleId);
      return {
        puzzleId: p.puzzleId,
        puzzleText: puzzle?.puzzle || "Unknown",
        puzzleType: puzzle?.puzzleType || "unknown",
        attempts: p.attempts,
        uniqueUsers: p.uniqueUsers,
      };
    });

    // Most difficult puzzles (lowest completion rate)
    const difficultPuzzles = await gameSessionsCollection
      .aggregate([
        {
          $match: {
            startTime: { $gte: dateStart, $lte: dateEnd },
          },
        },
        {
          $group: {
            _id: "$puzzleId",
            totalSessions: { $sum: 1 },
            completedSessions: {
              $sum: { $cond: ["$completed", 1, 0] },
            },
          },
        },
        {
          $project: {
            puzzleId: "$_id",
            completionRate: {
              $cond: {
                if: { $gt: ["$totalSessions", 0] },
                then: {
                  $multiply: [
                    { $divide: ["$completedSessions", "$totalSessions"] },
                    100,
                  ],
                },
                else: 0,
              },
            },
            totalSessions: 1,
          },
        },
        { $sort: { completionRate: 1 } },
        { $limit: 20 },
      ])
      .toArray();

    // Puzzle abandonment rate
    const abandonedPuzzles = await puzzleAttemptsCollection
      .aggregate([
        {
          $match: {
            attemptedAt: { $gte: dateStart, $lte: dateEnd },
            abandoned: { $exists: true },
          },
        },
        {
          $group: {
            _id: "$puzzleId",
            totalAttempts: { $sum: 1 },
            abandonedAttempts: {
              $sum: { $cond: ["$abandoned", 1, 0] },
            },
          },
        },
        {
          $project: {
            puzzleId: "$_id",
            abandonmentRate: {
              $cond: {
                if: { $gt: ["$totalAttempts", 0] },
                then: {
                  $multiply: [
                    { $divide: ["$abandonedAttempts", "$totalAttempts"] },
                    100,
                  ],
                },
                else: 0,
              },
            },
          },
        },
        { $sort: { abandonmentRate: -1 } },
      ])
      .toArray();

    // Hint usage statistics
    const hintUsage = await puzzleAttemptsCollection
      .aggregate([
        {
          $match: {
            attemptedAt: { $gte: dateStart, $lte: dateEnd },
            hintsUsed: { $exists: true, $ne: null as any },
          },
        },
        {
          $group: {
            _id: "$hintsUsed",
            count: { $sum: 1 },
          },
        },
        { $sort: { _id: 1 } },
      ])
      .toArray();

    // ============================================
    // NEW METRICS: Time-Series Data
    // ============================================

    // Daily puzzle completions
    const dailyPuzzleCompletions = await gameSessionsCollection
      .aggregate([
        {
          $match: {
            completed: true,
            endTime: { $gte: dateStart, $lte: dateEnd },
          },
        },
        {
          $group: {
            _id: {
              $dateToString: {
                format: "%Y-%m-%d",
                date: "$endTime",
              },
            },
            count: { $sum: 1 },
          },
        },
        { $sort: { _id: 1 } },
      ])
      .toArray();

    // Daily puzzle attempts
    const dailyPuzzleAttempts = await puzzleAttemptsCollection
      .aggregate([
        {
          $match: {
            attemptedAt: { $gte: dateStart, $lte: dateEnd },
          },
        },
        {
          $group: {
            _id: {
              $dateToString: {
                format: "%Y-%m-%d",
                date: "$attemptedAt",
              },
            },
            count: { $sum: 1 },
          },
        },
        { $sort: { _id: 1 } },
      ])
      .toArray();

    // Daily game sessions
    const dailyGameSessions = await gameSessionsCollection
      .aggregate([
        {
          $match: {
            startTime: { $gte: dateStart, $lte: dateEnd },
          },
        },
        {
          $group: {
            _id: {
              $dateToString: {
                format: "%Y-%m-%d",
                date: "$startTime",
              },
            },
            count: { $sum: 1 },
          },
        },
        { $sort: { _id: 1 } },
      ])
      .toArray();

    // Daily analytics events by type
    const dailyEventsByType = await analyticsEventsCollection
      .aggregate([
        {
          $match: {
            timestamp: { $gte: dateStart, $lte: dateEnd },
          },
        },
        {
          $group: {
            _id: {
              date: {
                $dateToString: {
                  format: "%Y-%m-%d",
                  date: "$timestamp",
                },
              },
              eventType: "$eventType",
            },
            count: { $sum: 1 },
          },
        },
        {
          $group: {
            _id: "$_id.date",
            events: {
              $push: {
                type: "$_id.eventType",
                count: "$count",
              },
            },
          },
        },
        { $sort: { _id: 1 } },
      ])
      .toArray();

    // ============================================
    // NEW METRICS: Advanced Analytics
    // ============================================

    // User satisfaction scores by puzzle type
    const satisfactionByType = await puzzleAttemptsCollection
      .aggregate([
        {
          $match: {
            userSatisfaction: { $exists: true, $ne: null as any },
            attemptedAt: { $gte: dateStart, $lte: dateEnd },
          },
        },
        {
          $lookup: {
            from: "puzzles",
            localField: "puzzleId",
            foreignField: "id",
            as: "puzzle",
          },
        },
        { $unwind: "$puzzle" },
        {
          $group: {
            _id: { $ifNull: ["$puzzle.puzzleType", "unknown"] },
            avgSatisfaction: { $avg: "$userSatisfaction" },
            count: { $sum: 1 },
          },
        },
        {
          $project: {
            type: "$_id",
            avgSatisfaction: { $round: ["$avgSatisfaction", 2] },
            count: 1,
          },
        },
        { $sort: { avgSatisfaction: -1 } },
      ])
      .toArray();

    // Difficulty perception vs actual difficulty
    const difficultyPerception = await puzzleAttemptsCollection
      .aggregate([
        {
          $match: {
            difficultyPerception: { $exists: true, $ne: null as any },
            attemptedAt: { $gte: dateStart, $lte: dateEnd },
          },
        },
        {
          $lookup: {
            from: "puzzles",
            localField: "puzzleId",
            foreignField: "id",
            as: "puzzle",
          },
        },
        { $unwind: "$puzzle" },
        {
          $project: {
            puzzleId: 1,
            perceivedDifficulty: "$difficultyPerception",
            actualDifficulty: {
              $switch: {
                branches: [
                  { case: { $eq: ["$puzzle.difficulty", "easy"] }, then: 3 },
                  { case: { $eq: ["$puzzle.difficulty", "medium"] }, then: 5 },
                  { case: { $eq: ["$puzzle.difficulty", "hard"] }, then: 8 },
                ],
                default: 5,
              },
            },
          },
        },
        {
          $group: {
            _id: "$puzzleId",
            avgPerceived: { $avg: "$perceivedDifficulty" },
            actualDifficulty: { $first: "$actualDifficulty" },
            count: { $sum: 1 },
          },
        },
        { $limit: 50 },
      ])
      .toArray();

    // Peak usage times (hourly breakdown)
    const peakUsageTimes = await analyticsEventsCollection
      .aggregate([
        {
          $match: {
            timestamp: { $gte: dateStart, $lte: dateEnd },
          },
        },
        {
          $group: {
            _id: {
              $hour: "$timestamp",
            },
            count: { $sum: 1 },
          },
        },
        { $sort: { _id: 1 } },
      ])
      .toArray();

    // User progression funnel
    const totalSignups = await usersCollection.countDocuments();
    const usersWithFirstPuzzle =
      await puzzleAttemptsCollection.distinct("userId");
    const regularPlayers = await userStatsCollection.countDocuments({
      totalGames: { $gte: 10 },
    });

    const progressionFunnel = {
      signups: totalSignups,
      firstPuzzle: usersWithFirstPuzzle.length,
      regularPlayers,
      conversionToFirstPuzzle:
        totalSignups > 0
          ? (usersWithFirstPuzzle.length / totalSignups) * 100
          : 0,
      conversionToRegular:
        usersWithFirstPuzzle.length > 0
          ? (regularPlayers / usersWithFirstPuzzle.length) * 100
          : 0,
    };

    return {
      success: true,
      stats: {
        overview: {
        totalUsers,
        activeUsers,
        totalPuzzles,
        activePuzzles,
        totalBlogPosts,
        publishedBlogPosts,
        totalUserStats,
        totalAnalyticsEvents,
        totalEmailSubscriptions,
      },
      recentActivity: {
        newUsersLast7Days,
        newPuzzlesLast7Days,
        newBlogPostsLast7Days,
        eventsLast7Days,
      },
      topUsers: topUsersWithNames,
      puzzleTypes: puzzleTypes.map((pt) => ({
        type: pt._id || "unknown",
        count: pt.count,
      })),
      eventTypes: eventTypes.map((et) => ({
        type: et._id,
        count: et.count,
      })),
      dailySignups: dailySignups.map((ds) => ({
        date: ds._id,
        count: ds.count,
      })),
      // NEW: User Engagement Metrics
      userEngagement: {
        dailyActiveUsers: dailyActiveUsers.map((dau) => ({
          date: dau.date,
          count: dau.count,
        })),
        monthlyActiveUsers: monthlyActiveUsers.length,
        averageSessionDuration: Math.round(avgSessionDuration / 1000), // Convert to seconds
        returningVsNew: {
          returning: returningUsers,
          new: newUsers,
        },
        retention: {
          day1: Math.round(retention1Day * 100) / 100,
          day7: Math.round(retention7Day * 100) / 100,
        },
        churnRate: Math.round(churnRate * 100) / 100,
      },
      // NEW: Puzzle Performance Metrics
      puzzlePerformance: {
        completionRatesByType: puzzleCompletionRates,
        averageTimeToSolve: avgTimeToSolve,
        popularPuzzles: popularPuzzlesWithDetails,
        difficultPuzzles,
        abandonmentRate: abandonedPuzzles,
        hintUsage: hintUsage.map((h) => ({
          hintsUsed: h._id,
          count: h.count,
        })),
      },
      // NEW: Time-Series Data
      timeSeries: {
        dailyPuzzleCompletions: dailyPuzzleCompletions.map((d) => ({
          date: d._id,
          count: d.count,
        })),
        dailyPuzzleAttempts: dailyPuzzleAttempts.map((d) => ({
          date: d._id,
          count: d.count,
        })),
        dailyGameSessions: dailyGameSessions.map((d) => ({
          date: d._id,
          count: d.count,
        })),
        dailyEventsByType: dailyEventsByType.map((d) => ({
          date: d._id,
          events: d.events,
        })),
      },
      // NEW: Advanced Analytics
      advancedAnalytics: {
        satisfactionByType,
        difficultyPerception,
        peakUsageTimes: peakUsageTimes.map((p) => ({
          hour: p._id,
          count: p.count,
        })),
        progressionFunnel,
      },
    },
    };
  } catch (error) {
    console.error("Admin stats error:", error);
    throw error;
  }
}

/**
 * GET /api/admin/stats
 * Get admin statistics with optional date range
 */
export async function GET(request: Request) {
  try {
    // Verify admin access
    const admin = await verifyAdminAccess(request);
    if (!admin) {
      return NextResponse.json(
        { error: "Unauthorized - Admin access required" },
        { status: 401 }
      );
    }

    // Get date range from query params (optional)
    const { searchParams } = new URL(request.url);
    const startDateParam = searchParams.get("startDate");
    const endDateParam = searchParams.get("endDate");

    // Default to last 30 days if not provided
    const dateEnd = endDateParam ? new Date(endDateParam) : new Date();
    const dateStart = startDateParam
      ? new Date(startDateParam)
      : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    // Validate dates
    if (isNaN(dateStart.getTime()) || isNaN(dateEnd.getTime())) {
      return NextResponse.json(
        { error: "Invalid date format" },
        { status: 400 }
      );
    }

    if (dateStart > dateEnd) {
      return NextResponse.json(
        { error: "startDate must be before endDate" },
        { status: 400 }
      );
    }

    // Fetch stats with caching
    const cachedFetchStats = unstable_cache(
      async () => fetchAdminStats(dateStart, dateEnd),
      ["admin-stats", dateStart.toISOString(), dateEnd.toISOString()],
      {
        revalidate: ADMIN_STATS_CACHE_TTL,
      }
    );

    const result = await cachedFetchStats();
    return NextResponse.json(result);
  } catch (error) {
    console.error("Admin stats GET error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch statistics",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
