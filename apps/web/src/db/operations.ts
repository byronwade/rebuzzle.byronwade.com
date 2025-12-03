/**
 * Database Operations
 *
 * Clean, efficient MongoDB operations for Rebuzzle
 */

import type {
  Achievement,
  BlogPost,
  GameSession,
  Level,
  NewAchievement,
  NewBlogPost,
  NewGameSession,
  NewLevel,
  NewPushSubscription,
  NewPuzzle,
  NewPuzzleAttempt,
  NewUser,
  NewUserAchievement,
  NewUserStats,
  PushSubscription,
  Puzzle,
  PuzzleAttempt,
  User,
  UserAchievement,
  UserStats,
} from "./models";
import { getCollection } from "./mongodb";

// ============================================================================
// USER OPERATIONS
// ============================================================================

export const userOps = {
  async create(user: NewUser): Promise<User> {
    const collection = getCollection<User>("users");
    await collection.insertOne(user);
    return user as User;
  },

  async findById(id: string): Promise<User | null> {
    const collection = getCollection<User>("users");
    return await collection.findOne({ id });
  },

  async findByEmail(email: string): Promise<User | null> {
    const collection = getCollection<User>("users");
    return await collection.findOne({ email });
  },

  async updateLastLogin(id: string): Promise<void> {
    const collection = getCollection<User>("users");
    await collection.updateOne({ id }, { $set: { lastLogin: new Date() } });
  },

  async update(id: string, updates: Partial<User>): Promise<void> {
    const collection = getCollection<User>("users");
    await collection.updateOne({ id }, { $set: updates });
  },

  async findByGuestToken(guestToken: string): Promise<User | null> {
    const collection = getCollection<User>("users");
    return await collection.findOne({ guestToken, isGuest: true });
  },

  async createGuestUser(guestToken: string): Promise<User> {
    const collection = getCollection<User>("users");
    const guestNumber = Math.floor(Math.random() * 9000) + 1000;
    const guestUser: NewUser = {
      id: `guest_${Date.now()}_${Math.random().toString(36).substring(7)}`,
      username: `Player${guestNumber}`,
      email: `guest_${guestToken}@guest.rebuzzle.local`,
      passwordHash: "", // No password for guests
      createdAt: new Date(),
      isGuest: true,
      guestToken,
    };
    await collection.insertOne(guestUser);
    return guestUser as User;
  },

  async convertGuestToUser(
    guestId: string,
    userData: { username: string; email: string; passwordHash: string }
  ): Promise<User | null> {
    const collection = getCollection<User>("users");
    const result = await collection.findOneAndUpdate(
      { id: guestId, isGuest: true },
      {
        $set: {
          username: userData.username,
          email: userData.email,
          passwordHash: userData.passwordHash,
          isGuest: false,
          guestToken: undefined,
        },
      },
      { returnDocument: "after" }
    );
    return result;
  },

  async findGuestByIpHash(ipHash: string): Promise<User | null> {
    const collection = getCollection<User>("users");
    return await collection.findOne({ ipHash, isGuest: true });
  },

  async findGuestByDeviceId(deviceId: string): Promise<User | null> {
    const collection = getCollection<User>("users");
    return await collection.findOne({ deviceId, isGuest: true });
  },

  async createGuestUserWithIp(
    guestToken: string,
    ipHash: string,
    deviceId?: string
  ): Promise<User> {
    const collection = getCollection<User>("users");
    const guestNumber = Math.floor(Math.random() * 9000) + 1000;
    const now = new Date();
    const guestUser: NewUser = {
      id: `guest_${Date.now()}_${Math.random().toString(36).substring(7)}`,
      username: `Player${guestNumber}`,
      email: `guest_${guestToken}@guest.rebuzzle.local`,
      passwordHash: "",
      createdAt: now,
      isGuest: true,
      guestToken,
      ipHash,
      deviceId,
      lastSeenIp: ipHash,
      lastSeenAt: now,
    };
    await collection.insertOne(guestUser);
    return guestUser as User;
  },
};

// ============================================================================
// USER STATS OPERATIONS
// ============================================================================

export const userStatsOps = {
  async create(stats: NewUserStats): Promise<UserStats> {
    const collection = getCollection<UserStats>("userStats");
    await collection.insertOne(stats);
    return stats as UserStats;
  },

  async findByUserId(userId: string): Promise<UserStats | null> {
    const collection = getCollection<UserStats>("userStats");
    return await collection.findOne({ userId });
  },

  async updateStats(userId: string, updates: Partial<UserStats>): Promise<void> {
    const collection = getCollection<UserStats>("userStats");
    await collection.updateOne({ userId }, { $set: { ...updates, updatedAt: new Date() } });
  },

  async getLeaderboard(
    limit = 10,
    timeframe?: "today" | "week" | "month" | "allTime"
  ): Promise<Array<UserStats & { user: User }>> {
    const userStatsCollection = getCollection<UserStats>("userStats");
    const _usersCollection = getCollection<User>("users");

    // Build date filter for timeframe
    let dateFilter: any = {};
    if (timeframe && timeframe !== "allTime") {
      const now = new Date();
      let startDate: Date;

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
        default:
          startDate = new Date(0); // All time
      }

      dateFilter = {
        lastPlayDate: { $gte: startDate },
      };
    }

    const leaderboard = await userStatsCollection
      .aggregate([
        // Filter by timeframe if specified
        ...(Object.keys(dateFilter).length > 0 ? [{ $match: dateFilter }] : []),
        {
          $lookup: {
            from: "users",
            localField: "userId",
            foreignField: "id",
            as: "user",
          },
        },
        {
          $unwind: "$user",
        },
        {
          $sort: { points: -1, streak: -1 },
        },
        {
          $limit: limit,
        },
      ])
      .toArray();

    return leaderboard as Array<UserStats & { user: User }>;
  },

  /**
   * Get leaderboard sorted by current active streak
   * Only includes users with active streaks (streak > 0)
   */
  async getStreakLeaderboard(limit = 25): Promise<Array<UserStats & { user: User }>> {
    const userStatsCollection = getCollection<UserStats>("userStats");

    const leaderboard = await userStatsCollection
      .aggregate([
        // Only include users with active streaks
        {
          $match: { streak: { $gt: 0 } },
        },
        {
          $lookup: {
            from: "users",
            localField: "userId",
            foreignField: "id",
            as: "user",
          },
        },
        {
          $unwind: "$user",
        },
        // Sort by streak first, then by maxStreak as tiebreaker
        {
          $sort: { streak: -1, maxStreak: -1, points: -1 },
        },
        {
          $limit: limit,
        },
      ])
      .toArray();

    return leaderboard as Array<UserStats & { user: User }>;
  },

  async getUserRank(
    userId: string,
    timeframe?: "today" | "week" | "month" | "allTime"
  ): Promise<number | null> {
    const userStatsCollection = getCollection<UserStats>("userStats");
    const userStats = await userStatsCollection.findOne({ userId });

    if (!userStats) return null;

    // Build date filter for timeframe (same logic as getLeaderboard)
    let dateFilter: Record<string, unknown> = {};
    if (timeframe && timeframe !== "allTime") {
      const now = new Date();
      let startDate: Date;

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
        default:
          startDate = new Date(0);
      }

      dateFilter = {
        lastPlayDate: { $gte: startDate },
      };
    }

    const rank = await userStatsCollection.countDocuments({
      ...dateFilter,
      $or: [
        { points: { $gt: userStats.points } },
        {
          points: userStats.points,
          streak: { $gt: userStats.streak },
        },
      ],
    });

    return rank + 1;
  },
};

// ============================================================================
// PUZZLE OPERATIONS
// ============================================================================

export const puzzleOps = {
  async create(puzzle: NewPuzzle): Promise<Puzzle> {
    const collection = getCollection<Puzzle>("puzzles");
    await collection.insertOne(puzzle);
    return puzzle as Puzzle;
  },

  async findById(id: string): Promise<Puzzle | null> {
    const collection = getCollection<Puzzle>("puzzles");
    return await collection.findOne({ id });
  },

  async findTodaysPuzzle(): Promise<Puzzle | null> {
    const collection = getCollection<Puzzle>("puzzles");
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);  // Use UTC midnight for consistent behavior across all platforms

    return await collection.findOne({
      publishedAt: { $gte: today },
      active: true,
    });
  },

  async findActivePuzzles(limit = 10): Promise<Puzzle[]> {
    const collection = getCollection<Puzzle>("puzzles");
    return await collection.find({ active: true }).sort({ publishedAt: -1 }).limit(limit).toArray();
  },

  async updateActiveStatus(id: string, active: boolean): Promise<void> {
    const collection = getCollection<Puzzle>("puzzles");
    await collection.updateOne({ id }, { $set: { active } });
  },

  async updateEmbedding(id: string, embedding: number[]): Promise<void> {
    const collection = getCollection<Puzzle>("puzzles");
    await collection.updateOne({ id }, { $set: { embedding } });
  },
};

// ============================================================================
// PUZZLE ATTEMPT OPERATIONS
// ============================================================================

export const puzzleAttemptOps = {
  async create(attempt: NewPuzzleAttempt): Promise<PuzzleAttempt> {
    const collection = getCollection<PuzzleAttempt>("puzzleAttempts");
    await collection.insertOne(attempt);
    return attempt as PuzzleAttempt;
  },

  async findByUserAndPuzzle(userId: string, puzzleId: string): Promise<PuzzleAttempt[]> {
    const collection = getCollection<PuzzleAttempt>("puzzleAttempts");
    return await collection.find({ userId, puzzleId }).sort({ attemptedAt: -1 }).toArray();
  },

  async getUserAttempts(userId: string, limit = 50): Promise<PuzzleAttempt[]> {
    const collection = getCollection<PuzzleAttempt>("puzzleAttempts");
    return await collection.find({ userId }).sort({ attemptedAt: -1 }).limit(limit).toArray();
  },

  /**
   * Check if user has already attempted today's puzzle (either completed or failed)
   * Used to lock puzzle after any final attempt (success or all attempts exhausted)
   */
  async hasTodayAttempt(userId: string): Promise<{
    hasAttempt: boolean;
    wasSuccessful: boolean;
    puzzleId?: string;
  }> {
    const collection = getCollection<PuzzleAttempt>("puzzleAttempts");

    // Get start of today (UTC)
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);

    // Check for either completed (won) or abandoned (failed all attempts)
    const attempt = await collection.findOne({
      userId,
      attemptedAt: { $gte: today },
      $or: [{ isCorrect: true }, { abandoned: true }],
    });

    return {
      hasAttempt: !!attempt,
      wasSuccessful: attempt?.isCorrect ?? false,
      puzzleId: attempt?.puzzleId,
    };
  },

  /**
   * Atomic daily attempt creation to prevent race conditions
   * Uses findOneAndUpdate to atomically check if attempt exists and create if not
   */
  async createAtomicDailyAttempt(
    userId: string,
    todayStart: Date,
    attemptData: NewPuzzleAttempt
  ): Promise<{ success: boolean; attempt: PuzzleAttempt }> {
    const collection = getCollection<PuzzleAttempt>("puzzleAttempts");

    // First, check if a final attempt already exists (atomic read)
    const existingFinalAttempt = await collection.findOne({
      userId,
      attemptedAt: { $gte: todayStart },
      $or: [{ isCorrect: true }, { abandoned: true }],
    });

    if (existingFinalAttempt) {
      return { success: false, attempt: existingFinalAttempt };
    }

    // If this is a final attempt (correct or abandoned), use findOneAndUpdate
    // with upsert to atomically ensure only one final attempt per day
    if (attemptData.isCorrect || attemptData.abandoned) {
      try {
        // Try to insert only if no final attempt exists
        // The query ensures atomicity - only one will succeed
        const result = await collection.findOneAndUpdate(
          {
            userId,
            attemptedAt: { $gte: todayStart },
            $or: [{ isCorrect: true }, { abandoned: true }],
          },
          {
            $setOnInsert: attemptData,
          },
          {
            upsert: true,
            returnDocument: "after",
          }
        );

        // If the returned document has a different ID, it means an existing one was found
        if (result && result.id !== attemptData.id) {
          return { success: false, attempt: result };
        }

        return { success: true, attempt: result as PuzzleAttempt };
      } catch (error) {
        // Duplicate key error means another request beat us
        if ((error as { code?: number }).code === 11000) {
          const existing = await collection.findOne({
            userId,
            attemptedAt: { $gte: todayStart },
            $or: [{ isCorrect: true }, { abandoned: true }],
          });
          return { success: false, attempt: existing as PuzzleAttempt };
        }
        throw error;
      }
    }

    // For non-final attempts, just insert normally
    await collection.insertOne(attemptData);
    return { success: true, attempt: attemptData as PuzzleAttempt };
  },
};

// ============================================================================
// GAME SESSION OPERATIONS
// ============================================================================

export const gameSessionOps = {
  async create(session: NewGameSession): Promise<GameSession> {
    const collection = getCollection<GameSession>("gameSessions");
    await collection.insertOne(session);
    return session as GameSession;
  },

  async findById(id: string): Promise<GameSession | null> {
    const collection = getCollection<GameSession>("gameSessions");
    return await collection.findOne({ id });
  },

  async findByUser(userId: string, limit = 20): Promise<GameSession[]> {
    const collection = getCollection<GameSession>("gameSessions");
    return await collection.find({ userId }).sort({ startTime: -1 }).limit(limit).toArray();
  },

  async updateSession(id: string, updates: Partial<GameSession>): Promise<void> {
    const collection = getCollection<GameSession>("gameSessions");
    await collection.updateOne({ id }, { $set: updates });
  },
};

// ============================================================================
// BLOG POST OPERATIONS
// ============================================================================

export const blogPostOps = {
  async create(post: NewBlogPost): Promise<BlogPost> {
    const collection = getCollection<BlogPost>("blogPosts");
    await collection.insertOne(post);
    return post as BlogPost;
  },

  async findBySlug(slug: string): Promise<BlogPost | null> {
    const collection = getCollection<BlogPost>("blogPosts");
    return await collection.findOne({ slug });
  },

  async findPublished(limit = 10): Promise<BlogPost[]> {
    const collection = getCollection<BlogPost>("blogPosts");
    return await collection
      .find({ publishedAt: { $lte: new Date() } })
      .sort({ publishedAt: -1 })
      .limit(limit)
      .toArray();
  },

  async findByAuthor(authorId: string, limit = 10): Promise<BlogPost[]> {
    const collection = getCollection<BlogPost>("blogPosts");
    return await collection.find({ authorId }).sort({ publishedAt: -1 }).limit(limit).toArray();
  },
};

// ============================================================================
// ACHIEVEMENT OPERATIONS
// ============================================================================

export const achievementOps = {
  async create(achievement: NewAchievement): Promise<Achievement> {
    const collection = getCollection<Achievement>("achievements");
    await collection.insertOne(achievement);
    return achievement as Achievement;
  },

  async createMany(achievements: NewAchievement[]): Promise<void> {
    const collection = getCollection<Achievement>("achievements");
    if (achievements.length > 0) {
      await collection.insertMany(achievements);
    }
  },

  async findAll(): Promise<Achievement[]> {
    const collection = getCollection<Achievement>("achievements");
    return await collection.find({}).sort({ order: 1 }).toArray();
  },

  async findById(id: string): Promise<Achievement | null> {
    const collection = getCollection<Achievement>("achievements");
    return await collection.findOne({ id });
  },

  async findByCategory(category: string): Promise<Achievement[]> {
    const collection = getCollection<Achievement>("achievements");
    return await collection.find({ category }).sort({ order: 1 }).toArray();
  },

  async findByRarity(rarity: Achievement["rarity"]): Promise<Achievement[]> {
    const collection = getCollection<Achievement>("achievements");
    return await collection.find({ rarity }).sort({ order: 1 }).toArray();
  },

  async upsert(achievement: NewAchievement): Promise<void> {
    const collection = getCollection<Achievement>("achievements");
    await collection.replaceOne({ id: achievement.id }, achievement, {
      upsert: true,
    });
  },

  async upsertMany(achievements: NewAchievement[]): Promise<void> {
    const collection = getCollection<Achievement>("achievements");
    const bulkOps = achievements.map((achievement) => ({
      replaceOne: {
        filter: { id: achievement.id },
        replacement: achievement,
        upsert: true,
      },
    }));
    if (bulkOps.length > 0) {
      await collection.bulkWrite(bulkOps);
    }
  },

  async count(): Promise<number> {
    const collection = getCollection<Achievement>("achievements");
    return await collection.countDocuments();
  },
};

// ============================================================================
// USER ACHIEVEMENT OPERATIONS
// ============================================================================

export const userAchievementOps = {
  async create(userAchievement: NewUserAchievement): Promise<UserAchievement> {
    const collection = getCollection<UserAchievement>("userAchievements");
    await collection.insertOne(userAchievement);
    return userAchievement as UserAchievement;
  },

  async createMany(userAchievements: NewUserAchievement[]): Promise<void> {
    const collection = getCollection<UserAchievement>("userAchievements");
    if (userAchievements.length > 0) {
      await collection.insertMany(userAchievements);
    }
  },

  async findByUser(userId: string): Promise<UserAchievement[]> {
    const collection = getCollection<UserAchievement>("userAchievements");
    return await collection.find({ userId }).sort({ unlockedAt: -1 }).toArray();
  },

  async findByUserWithDetails(
    userId: string
  ): Promise<Array<UserAchievement & { achievement: Achievement }>> {
    const collection = getCollection<UserAchievement>("userAchievements");
    const results = await collection
      .aggregate([
        { $match: { userId } },
        {
          $lookup: {
            from: "achievements",
            localField: "achievementId",
            foreignField: "id",
            as: "achievement",
          },
        },
        { $unwind: "$achievement" },
        { $sort: { unlockedAt: -1 } },
      ])
      .toArray();
    return results as Array<UserAchievement & { achievement: Achievement }>;
  },

  async hasAchievement(userId: string, achievementId: string): Promise<boolean> {
    const collection = getCollection<UserAchievement>("userAchievements");
    const result = await collection.findOne({ userId, achievementId });
    return result !== null;
  },

  async hasAchievements(userId: string, achievementIds: string[]): Promise<Set<string>> {
    const collection = getCollection<UserAchievement>("userAchievements");
    const results = await collection
      .find({ userId, achievementId: { $in: achievementIds } })
      .toArray();
    return new Set(results.map((r) => r.achievementId));
  },

  async countByUser(userId: string): Promise<number> {
    const collection = getCollection<UserAchievement>("userAchievements");
    return await collection.countDocuments({ userId });
  },

  async getRecentUnlocks(
    userId: string,
    limit = 5
  ): Promise<Array<UserAchievement & { achievement: Achievement }>> {
    const collection = getCollection<UserAchievement>("userAchievements");
    const results = await collection
      .aggregate([
        { $match: { userId } },
        { $sort: { unlockedAt: -1 } },
        { $limit: limit },
        {
          $lookup: {
            from: "achievements",
            localField: "achievementId",
            foreignField: "id",
            as: "achievement",
          },
        },
        { $unwind: "$achievement" },
      ])
      .toArray();
    return results as Array<UserAchievement & { achievement: Achievement }>;
  },

  async markEmailSent(userId: string, achievementId: string): Promise<void> {
    const collection = getCollection<UserAchievement>("userAchievements");
    await collection.updateOne({ userId, achievementId }, { $set: { notifiedByEmail: true } });
  },

  async getPendingEmailNotifications(): Promise<
    Array<UserAchievement & { achievement: Achievement; user: User }>
  > {
    const collection = getCollection<UserAchievement>("userAchievements");
    const results = await collection
      .aggregate([
        { $match: { notifiedByEmail: false } },
        {
          $lookup: {
            from: "achievements",
            localField: "achievementId",
            foreignField: "id",
            as: "achievement",
          },
        },
        { $unwind: "$achievement" },
        {
          $lookup: {
            from: "users",
            localField: "userId",
            foreignField: "id",
            as: "user",
          },
        },
        { $unwind: "$user" },
        { $sort: { unlockedAt: 1 } },
      ])
      .toArray();
    return results as Array<UserAchievement & { achievement: Achievement; user: User }>;
  },

  async getLeaderboard(limit = 10): Promise<Array<{ userId: string; count: number; user: User }>> {
    const collection = getCollection<UserAchievement>("userAchievements");
    const results = await collection
      .aggregate([
        { $group: { _id: "$userId", count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: limit },
        {
          $lookup: {
            from: "users",
            localField: "_id",
            foreignField: "id",
            as: "user",
          },
        },
        { $unwind: "$user" },
        { $project: { userId: "$_id", count: 1, user: 1 } },
      ])
      .toArray();
    return results as Array<{ userId: string; count: number; user: User }>;
  },
};

// ============================================================================
// LEVEL OPERATIONS
// ============================================================================

export const levelOps = {
  async create(level: NewLevel): Promise<Level> {
    const collection = getCollection<Level>("levels");
    await collection.insertOne(level);
    return level as Level;
  },

  async findAll(): Promise<Level[]> {
    const collection = getCollection<Level>("levels");
    return await collection.find({}).sort({ levelNumber: 1 }).toArray();
  },

  async findByLevel(levelNumber: number): Promise<Level | null> {
    const collection = getCollection<Level>("levels");
    return await collection.findOne({ levelNumber });
  },
};

// ============================================================================
// PUSH SUBSCRIPTION OPERATIONS
// ============================================================================

export const pushSubscriptionOps = {
  async create(subscription: NewPushSubscription): Promise<PushSubscription> {
    const collection = getCollection<PushSubscription>("pushSubscriptions");
    await collection.insertOne(subscription);
    return subscription as PushSubscription;
  },

  async findByEndpoint(endpoint: string): Promise<PushSubscription | null> {
    const collection = getCollection<PushSubscription>("pushSubscriptions");
    return await collection.findOne({ endpoint });
  },

  async findByUser(userId: string): Promise<PushSubscription[]> {
    const collection = getCollection<PushSubscription>("pushSubscriptions");
    return await collection.find({ userId }).toArray();
  },

  async findActive(limit = 100): Promise<PushSubscription[]> {
    const collection = getCollection<PushSubscription>("pushSubscriptions");
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    return await collection
      .find({ createdAt: { $gte: thirtyDaysAgo } })
      .limit(limit)
      .toArray();
  },

  async deleteById(id: string): Promise<void> {
    const collection = getCollection<PushSubscription>("pushSubscriptions");
    await collection.deleteOne({ id });
  },

  async deleteByEndpoint(endpoint: string): Promise<void> {
    const collection = getCollection<PushSubscription>("pushSubscriptions");
    await collection.deleteOne({ endpoint });
  },

  async upsert(subscription: NewPushSubscription): Promise<void> {
    const collection = getCollection<PushSubscription>("pushSubscriptions");
    await collection.replaceOne({ endpoint: subscription.endpoint }, subscription, {
      upsert: true,
    });
  },
};
