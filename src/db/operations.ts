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

  async updateStats(
    userId: string,
    updates: Partial<UserStats>
  ): Promise<void> {
    const collection = getCollection<UserStats>("userStats");
    await collection.updateOne(
      { userId },
      { $set: { ...updates, updatedAt: new Date() } }
    );
  },

  async getLeaderboard(
    limit = 10,
    timeframe?: "today" | "week" | "month" | "allTime"
  ): Promise<Array<UserStats & { user: User }>> {
    const userStatsCollection = getCollection<UserStats>("userStats");
    const usersCollection = getCollection<User>("users");

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

  async getUserRank(userId: string): Promise<number | null> {
    const userStatsCollection = getCollection<UserStats>("userStats");
    const userStats = await userStatsCollection.findOne({ userId });

    if (!userStats) return null;

    const rank = await userStatsCollection.countDocuments({
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
    today.setHours(0, 0, 0, 0);

    return await collection.findOne({
      publishedAt: { $gte: today },
      active: true,
    });
  },

  async findActivePuzzles(limit = 10): Promise<Puzzle[]> {
    const collection = getCollection<Puzzle>("puzzles");
    return await collection
      .find({ active: true })
      .sort({ publishedAt: -1 })
      .limit(limit)
      .toArray();
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

  async findByUserAndPuzzle(
    userId: string,
    puzzleId: string
  ): Promise<PuzzleAttempt[]> {
    const collection = getCollection<PuzzleAttempt>("puzzleAttempts");
    return await collection
      .find({ userId, puzzleId })
      .sort({ attemptedAt: -1 })
      .toArray();
  },

  async getUserAttempts(userId: string, limit = 50): Promise<PuzzleAttempt[]> {
    const collection = getCollection<PuzzleAttempt>("puzzleAttempts");
    return await collection
      .find({ userId })
      .sort({ attemptedAt: -1 })
      .limit(limit)
      .toArray();
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
    return await collection
      .find({ userId })
      .sort({ startTime: -1 })
      .limit(limit)
      .toArray();
  },

  async updateSession(
    id: string,
    updates: Partial<GameSession>
  ): Promise<void> {
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
    return await collection
      .find({ authorId })
      .sort({ publishedAt: -1 })
      .limit(limit)
      .toArray();
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

  async findAll(): Promise<Achievement[]> {
    const collection = getCollection<Achievement>("achievements");
    return await collection.find({}).toArray();
  },

  async findById(id: string): Promise<Achievement | null> {
    const collection = getCollection<Achievement>("achievements");
    return await collection.findOne({ id });
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

  async findByUser(userId: string): Promise<UserAchievement[]> {
    const collection = getCollection<UserAchievement>("userAchievements");
    return await collection.find({ userId }).toArray();
  },

  async hasAchievement(
    userId: string,
    achievementId: string
  ): Promise<boolean> {
    const collection = getCollection<UserAchievement>("userAchievements");
    const result = await collection.findOne({ userId, achievementId });
    return result !== null;
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
    await collection.replaceOne(
      { endpoint: subscription.endpoint },
      subscription,
      { upsert: true }
    );
  },
};
