/**
 * Database Operations
 *
 * Clean, efficient MongoDB operations for Rebuzzle
 */

import { createHash } from "node:crypto";
import type { Filter } from "mongodb";
import type {
  Achievement,
  BlogPost,
  DailyProgress,
  DailyProgressBackfillState,
  GameSession,
  JournalNote,
  Level,
  NewAchievement,
  NewBlogPost,
  NewDailyProgress,
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
    const exact = await collection.findOne({ email });
    if (exact) return exact;
    // Older accounts kept the casing they signed up with; match those too.
    const escaped = email.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    return await collection.findOne({ email: { $regex: `^${escaped}$`, $options: "i" } });
  },

  /** Case-insensitive check against real (non-guest) accounts. */
  async isUsernameTaken(username: string, excludeUserId?: string): Promise<boolean> {
    const collection = getCollection<User>("users");
    const escaped = username.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const match = await collection.findOne(
      {
        username: { $regex: `^${escaped}$`, $options: "i" },
        isGuest: { $ne: true },
        ...(excludeUserId ? { id: { $ne: excludeUserId } } : {}),
      },
      { projection: { id: 1 } }
    );
    return Boolean(match);
  },

  async findByUsername(username: string): Promise<User | null> {
    const collection = getCollection<User>("users");
    // Case-insensitive exact match for public profile URLs
    const escaped = username.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    return await collection.findOne({
      username: { $regex: `^${escaped}$`, $options: "i" },
      isGuest: { $ne: true },
    });
  },

  async updateLastLogin(id: string): Promise<void> {
    const collection = getCollection<User>("users");
    await collection.updateOne({ id }, { $set: { lastLogin: new Date() } });
  },

  async update(id: string, updates: Partial<User>): Promise<void> {
    const collection = getCollection<User>("users");
    await collection.updateOne({ id }, { $set: updates });
  },

  /** Initialize the account's daily reset zone once; concurrent devices use the winner. */
  async initializeJourneyTimeZone(
    id: string,
    timeZone: string,
    observedInvalidTimeZone?: unknown
  ): Promise<string | null> {
    const collection = getCollection<User>("users");
    const replaceableValues: Array<Record<string, unknown>> = [
      { journeyTimeZone: { $exists: false } },
      { journeyTimeZone: null },
      { journeyTimeZone: "" },
    ];
    if (
      observedInvalidTimeZone !== undefined &&
      observedInvalidTimeZone !== null &&
      observedInvalidTimeZone !== ""
    ) {
      replaceableValues.push({ journeyTimeZone: observedInvalidTimeZone });
    }
    const initialized = await collection.findOneAndUpdate(
      {
        id,
        $or: replaceableValues,
      } as unknown as Filter<User>,
      { $set: { journeyTimeZone: timeZone } },
      { returnDocument: "after", projection: { journeyTimeZone: 1 } }
    );
    if (initialized?.journeyTimeZone) return initialized.journeyTimeZone;

    const winner = await collection.findOne({ id }, { projection: { journeyTimeZone: 1 } });
    return winner?.journeyTimeZone ?? null;
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
    // The driver writes undefined as null, which would wipe fields such as
    // lastPlayDate. Leave unset fields alone instead.
    const defined = Object.fromEntries(
      Object.entries(updates).filter(([, value]) => value !== undefined)
    ) as Partial<UserStats>;
    await collection.updateOne({ userId }, { $set: { ...defined, updatedAt: new Date() } });
  },

  async updateStatsOnce(
    userId: string,
    eventId: string,
    updates: Partial<UserStats>
  ): Promise<boolean> {
    const collection = getCollection<UserStats>("userStats");
    const defined = Object.fromEntries(
      Object.entries(updates).filter(([, value]) => value !== undefined)
    ) as Partial<UserStats>;
    const result = await collection.updateOne(
      { userId, appliedStatsEventIds: { $ne: eventId } },
      {
        $set: { ...defined, updatedAt: new Date() },
        $addToSet: { appliedStatsEventIds: eventId },
      }
    );
    return result.matchedCount === 1;
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
  async getStreakLeaderboard(limit = 25, skip = 0): Promise<Array<UserStats & { user: User }>> {
    const userStatsCollection = getCollection<UserStats>("userStats");

    // A streak that hasn't been played in a month has lapsed; callers apply
    // the exact freeze rules on what comes back.
    const lapsedBefore = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const leaderboard = await userStatsCollection
      .aggregate([
        // Only include users with active streaks
        {
          $match: { streak: { $gt: 0 }, lastPlayDate: { $gte: lapsedBefore } },
        },
        // Sort by streak first, then by maxStreak as tiebreaker
        {
          $sort: { streak: -1, maxStreak: -1, points: -1, userId: 1 },
        },
        { $skip: skip },
        {
          $limit: limit,
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
          // Keep rows without a user so callers can page by raw row count.
          $unwind: { path: "$user", preserveNullAndEmptyArrays: true },
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

  async findByIds(ids: string[]): Promise<Puzzle[]> {
    if (ids.length === 0) return [];
    const collection = getCollection<Puzzle>("puzzles");
    return await collection.find({ id: { $in: ids } }).toArray();
  },

  /** Find the active puzzle published on a UTC calendar day (YYYY-MM-DD). */
  async findByDate(dateString: string): Promise<Puzzle | null> {
    const collection = getCollection<Puzzle>("puzzles");
    const start = new Date(`${dateString}T00:00:00.000Z`);
    const end = new Date(`${dateString}T23:59:59.999Z`);

    // Prefer newest if duplicates ever exist
    return await collection.findOne(
      {
        publishedAt: { $gte: start, $lte: end },
        active: true,
      },
      { sort: { publishedAt: -1, createdAt: -1 } }
    );
  },

  /** List active puzzles strictly before a published-day cutoff with a stable page cursor. */
  async findPublishedBefore(input: {
    beforeUtc: Date;
    limit: number;
    after?: { publishedAt: Date; id: string };
  }): Promise<Puzzle[]> {
    const collection = getCollection<Puzzle>("puzzles");
    const filter: Filter<Puzzle> = {
      active: true,
      publishedAt: { $lt: input.beforeUtc },
    };

    if (input.after) {
      filter.$or = [
        { publishedAt: { $lt: input.after.publishedAt } },
        { publishedAt: input.after.publishedAt, id: { $lt: input.after.id } },
      ];
    }

    return await collection
      .find(filter)
      .sort({ publishedAt: -1, id: -1 })
      .limit(input.limit)
      .toArray();
  },

  /** Select one stable, oldest archive puzzle for the free sample. */
  async findOldestPublishedBefore(beforeUtc: Date): Promise<Puzzle | null> {
    const collection = getCollection<Puzzle>("puzzles");
    return await collection.findOne(
      { active: true, publishedAt: { $lt: beforeUtc } },
      { sort: { publishedAt: 1, id: 1 } }
    );
  },

  async findTodaysPuzzle(): Promise<Puzzle | null> {
    const dateString = new Date().toISOString().slice(0, 10);
    return await this.findByDate(dateString);
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

const isValidPuzzleDate = (value: unknown): value is string => {
  if (typeof value !== "string") return false;
  const parts = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!parts) return false;
  const year = Number(parts[1]);
  const month = Number(parts[2]);
  const day = Number(parts[3]);
  const parsed = new Date(Date.UTC(year, month - 1, day));
  return (
    parsed.getUTCFullYear() === year &&
    parsed.getUTCMonth() === month - 1 &&
    parsed.getUTCDate() === day
  );
};

const isValidIanaTimeZone = (value: unknown): value is string => {
  if (typeof value !== "string" || value.length === 0 || value !== value.trim()) return false;
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: value });
    return true;
  } catch {
    return false;
  }
};

const dailyProgressFromAttempt = (attempt: PuzzleAttempt): NewDailyProgress | null => {
  if (
    attempt.isFinal !== true ||
    typeof attempt.isCorrect !== "boolean" ||
    typeof attempt.userId !== "string" ||
    attempt.userId.length === 0 ||
    typeof attempt.puzzleId !== "string" ||
    attempt.puzzleId.length === 0 ||
    !isValidPuzzleDate(attempt.puzzleDate) ||
    attempt.puzzleDate.startsWith("archive:")
  ) {
    return null;
  }

  const attemptNumber = attempt.attemptNumber;
  if (typeof attemptNumber !== "number" || !Number.isInteger(attemptNumber) || attemptNumber < 1) {
    return null;
  }

  const isExtended = attempt.playMode === "extended";
  const withinScoredRound = attemptNumber <= 3;
  let outcome: NewDailyProgress["outcome"];
  let attempts: number;

  if (isExtended && attempt.attemptType === "finalization") {
    if (
      attempt.isCorrect ||
      attempt.isScoredAttempt !== false ||
      typeof attempt.maxAttempts !== "number" ||
      !Number.isInteger(attempt.maxAttempts) ||
      attempt.maxAttempts < 1 ||
      attemptNumber - 1 < attempt.maxAttempts ||
      (attempt.finalizationReason !== "revealed" && attempt.finalizationReason !== "expired")
    ) {
      return null;
    }
    outcome = "failed";
    // The finalization row is a server event, not an answer submitted by the player.
    attempts = attemptNumber - 1;
  } else if (isExtended) {
    if (
      (attempt.attemptType !== undefined && attempt.attemptType !== "guess") ||
      !attempt.isCorrect ||
      attempt.isScoredAttempt !== withinScoredRound
    ) {
      return null;
    }
    outcome = "solved";
    attempts = attemptNumber;
  } else {
    if (
      attempt.playMode !== undefined ||
      attempt.attemptType === "finalization" ||
      attemptNumber > 3 ||
      (!attempt.isCorrect && attemptNumber !== 3)
    ) {
      return null;
    }
    outcome = attempt.isCorrect ? "solved" : "failed";
    attempts = attemptNumber;
  }

  if (!(attempt.attemptedAt instanceof Date) || Number.isNaN(attempt.attemptedAt.getTime())) {
    return null;
  }

  const hintsUsed = attempt.hintsUsed;
  const hintCount =
    typeof hintsUsed === "number" && Number.isInteger(hintsUsed) && hintsUsed >= 0
      ? hintsUsed
      : null;

  return {
    userId: attempt.userId,
    puzzleDate: attempt.puzzleDate,
    puzzleId: attempt.puzzleId,
    outcome,
    attempts,
    hintCount,
    completedAt: attempt.attemptedAt,
    timeZone: isValidIanaTimeZone(attempt.puzzleTimeZone) ? attempt.puzzleTimeZone : null,
    ...(isExtended ? { playMode: "extended" as const } : {}),
  };
};

const isValidStoredDailyProgress = (value: unknown): value is DailyProgress => {
  if (!value || typeof value !== "object") return false;
  const progress = value as Partial<DailyProgress>;
  const validAttempts =
    progress.playMode === "extended"
      ? progress.outcome === "solved"
        ? Number.isInteger(progress.attempts) && progress.attempts! >= 1
        : progress.outcome === "failed" &&
          Number.isInteger(progress.attempts) &&
          progress.attempts! >= 1
      : progress.playMode === undefined &&
        (progress.outcome === "solved"
          ? Number.isInteger(progress.attempts) &&
            progress.attempts! >= 1 &&
            progress.attempts! <= 3
          : progress.outcome === "failed" && progress.attempts === 3);
  return (
    typeof progress.userId === "string" &&
    typeof progress.puzzleId === "string" &&
    progress.puzzleId.length > 0 &&
    isValidPuzzleDate(progress.puzzleDate) &&
    validAttempts &&
    progress.completedAt instanceof Date &&
    Number.isFinite(progress.completedAt.getTime())
  );
};

/**
 * Idempotently project a persisted terminal daily attempt into Journey storage.
 * The unique {userId, puzzleDate} index is the concurrency boundary; this is a
 * projection of accepted server state, never a client-authored reward ledger.
 */
const materializeDailyProgressWithStatus = async (
  attempt: PuzzleAttempt
): Promise<{ progress: DailyProgress | null; inserted: boolean }> => {
  const progress = dailyProgressFromAttempt(attempt);
  if (!progress) return { progress: null, inserted: false };

  const collection = getCollection<DailyProgress>("dailyProgress");
  const key = { userId: progress.userId, puzzleDate: progress.puzzleDate };
  let inserted = false;

  try {
    const result = await collection.updateOne(key, { $setOnInsert: progress }, { upsert: true });
    inserted = result.upsertedCount > 0;
  } catch (error) {
    if ((error as { code?: number })?.code !== 11000) throw error;

    const winner = await collection.findOne(key);
    if (winner) {
      if (isValidStoredDailyProgress(winner)) return { progress: winner, inserted: false };
      await collection.updateOne(key, { $set: progress });
      const repaired = await collection.findOne(key);
      if (repaired) return { progress: repaired, inserted: false };
    }
    throw error;
  }

  const stored = await collection.findOne(key);
  if (!stored) {
    throw new Error("Daily progress upsert completed without a readable row");
  }
  if (!isValidStoredDailyProgress(stored)) {
    await collection.updateOne(key, { $set: progress });
    const repaired = await collection.findOne(key);
    if (!repaired) throw new Error("Daily progress repair completed without a readable row");
    return { progress: repaired, inserted };
  }
  return { progress: stored, inserted };
};

export const dailyProgressOps = {
  async countForUser(userId: string): Promise<number> {
    const collection = getCollection<DailyProgress>("dailyProgress");
    return await collection.countDocuments({ userId });
  },

  async listForUser(userId: string): Promise<DailyProgress[]> {
    const collection = getCollection<DailyProgress>("dailyProgress");
    return await collection.find({ userId }).sort({ puzzleDate: -1 }).toArray();
  },

  async listForUserPage(
    userId: string,
    input: { limit: number; beforePuzzleDate?: string }
  ): Promise<DailyProgress[]> {
    const collection = getCollection<DailyProgress>("dailyProgress");
    const filter = validDailyProgressFilter(userId, input.beforePuzzleDate);
    return await collection.find(filter).sort({ puzzleDate: -1 }).limit(input.limit).toArray();
  },

  async countValidForUser(userId: string): Promise<number> {
    const collection = getCollection<DailyProgress>("dailyProgress");
    return await collection.countDocuments(validDailyProgressFilter(userId));
  },

  async findForUserPuzzle(userId: string, puzzleId: string): Promise<DailyProgress | null> {
    const collection = getCollection<DailyProgress>("dailyProgress");
    return await collection.findOne({
      userId,
      puzzleId,
      outcome: { $in: ["solved", "failed"] },
    });
  },

  async materializeFromAttempt(attempt: PuzzleAttempt): Promise<DailyProgress | null> {
    return (await materializeDailyProgressWithStatus(attempt)).progress;
  },

  async materializeFromAttemptWithStatus(
    attempt: PuzzleAttempt
  ): Promise<{ progress: DailyProgress | null; inserted: boolean }> {
    return materializeDailyProgressWithStatus(attempt);
  },
};

function validDailyProgressFilter(
  userId: string,
  beforePuzzleDate?: string
): Filter<DailyProgress> {
  return {
    userId,
    puzzleDate: {
      $type: "string",
      $regex: /^\d{4}-\d{2}-\d{2}$/,
      ...(beforePuzzleDate ? { $lt: beforePuzzleDate } : {}),
    },
    puzzleId: { $type: "string", $ne: "" },
    completedAt: { $type: "date" },
    $or: [
      {
        outcome: "solved",
        playMode: { $ne: "extended" },
        attempts: { $gte: 1, $lte: 3 },
      },
      { outcome: "failed", playMode: { $ne: "extended" }, attempts: 3 },
      { outcome: "solved", playMode: "extended", attempts: { $gte: 1 } },
      { outcome: "failed", playMode: "extended", attempts: { $gte: 1 } },
    ],
    $expr: {
      $eq: [
        {
          $dateToString: {
            format: "%Y-%m-%d",
            date: {
              $dateFromString: {
                dateString: "$puzzleDate",
                onError: null,
                onNull: null,
              },
            },
          },
        },
        "$puzzleDate",
      ],
    },
  } as Filter<DailyProgress>;
}

export const journalNoteOps = {
  async listForUserPage(userId: string, puzzleIds: string[]): Promise<JournalNote[]> {
    if (puzzleIds.length === 0) return [];
    const collection = getCollection<JournalNote>("journalNotes");
    return await collection.find({ userId, puzzleId: { $in: puzzleIds } }).toArray();
  },

  async findForUser(userId: string, puzzleId: string): Promise<JournalNote | null> {
    const collection = getCollection<JournalNote>("journalNotes");
    return await collection.findOne({ userId, puzzleId });
  },

  async compareAndSet(input: {
    userId: string;
    puzzleId: string;
    note: string;
    expectedRevision: number;
    updatedAt: Date;
  }): Promise<JournalNote | null> {
    const collection = getCollection<JournalNote>("journalNotes");
    try {
      return await collection.findOneAndUpdate(
        {
          userId: input.userId,
          puzzleId: input.puzzleId,
          revision: input.expectedRevision,
        },
        {
          $set: { note: input.note, updatedAt: input.updatedAt },
          $setOnInsert: { userId: input.userId, puzzleId: input.puzzleId },
          $inc: { revision: 1 },
        },
        { upsert: input.expectedRevision === 0, returnDocument: "after" }
      );
    } catch (error) {
      if (
        input.expectedRevision === 0 &&
        error !== null &&
        typeof error === "object" &&
        "code" in error &&
        error.code === 11000
      ) {
        return null;
      }
      throw error;
    }
  },
};

export const dailyProgressBackfillOps = {
  async listUsersAfter(afterId: string | null, limit: number): Promise<Array<{ id: string }>> {
    const collection = getCollection<User>("users");
    return await collection
      .find(afterId ? { id: { $gt: afterId } } : {}, { projection: { id: 1 } })
      .sort({ id: 1 })
      .limit(limit)
      .toArray();
  },

  async findState(userId: string): Promise<DailyProgressBackfillState | null> {
    const collection = getCollection<DailyProgressBackfillState>("dailyProgressBackfills");
    return await collection.findOne({ _id: userId });
  },

  async requestReconciliation(userId: string, requestedAt = new Date()): Promise<void> {
    const collection = getCollection<DailyProgressBackfillState>("dailyProgressBackfills");
    await collection.updateOne(
      { _id: userId },
      {
        $setOnInsert: {
          _id: userId,
          userId,
          status: "scanning",
          cutoffAt: requestedAt,
        },
        $max: {
          reconciliationRequestedAt: requestedAt,
          updatedAt: requestedAt,
        },
        $inc: { reconciliationGeneration: 1 },
      },
      { upsert: true }
    );
  },

  async listPendingReconciliationUsersAfter(
    afterId: string | null,
    limit: number
  ): Promise<Array<{ id: string }>> {
    const collection = getCollection<DailyProgressBackfillState>("dailyProgressBackfills");
    const pending: Array<{ id: string }> = [];
    let cursor = afterId;
    while (pending.length < limit) {
      const filter: Record<string, unknown> = {
        reconciliationRequestedAt: { $type: "date" },
        ...(cursor ? { _id: { $gt: cursor } } : {}),
      };
      const candidates = await collection
        .find(filter, {
          projection: {
            _id: 1,
            userId: 1,
            reconciliationGeneration: 1,
            reconciliationProcessedGeneration: 1,
            reconciliationProcessedAt: 1,
          },
        })
        .sort({ _id: 1 })
        .limit(limit)
        .toArray();
      if (candidates.length === 0) break;

      for (const state of candidates) {
        cursor = state._id;
        const isPending =
          state.reconciliationGeneration !== undefined
            ? state.reconciliationGeneration > (state.reconciliationProcessedGeneration ?? 0)
            : !state.reconciliationProcessedAt ||
              state.reconciliationRequestedAt! > state.reconciliationProcessedAt;
        if (isPending) pending.push({ id: state.userId });
        if (pending.length === limit) break;
      }
      if (candidates.length < limit) break;
    }
    return pending;
  },

  async ensureState(
    userId: string,
    cutoffAt: Date,
    updatedAt: Date
  ): Promise<DailyProgressBackfillState> {
    const collection = getCollection<DailyProgressBackfillState>("dailyProgressBackfills");
    await collection.updateOne(
      { _id: userId },
      {
        $setOnInsert: {
          _id: userId,
          userId,
          status: "scanning",
          cutoffAt,
          updatedAt,
        },
      },
      { upsert: true }
    );
    const state = await collection.findOne({ _id: userId });
    if (!state) throw new Error(`Could not initialize Journey backfill state for ${userId}`);
    return state;
  },

  async findInitialBatch(
    userId: string,
    cutoffAt: Date,
    cursorPuzzleDate: string | undefined,
    limit: number
  ): Promise<PuzzleAttempt[]> {
    const collection = getCollection<PuzzleAttempt>("puzzleAttempts");
    const puzzleDate: Record<string, unknown> = { $regex: /^\d{4}-\d{2}-\d{2}$/ };
    if (cursorPuzzleDate) puzzleDate.$gt = cursorPuzzleDate;
    return await collection
      .find({ userId, isFinal: true, attemptedAt: { $lte: cutoffAt }, puzzleDate })
      .sort({ puzzleDate: 1 })
      .limit(limit)
      .toArray();
  },

  async findDeltaBatch(
    userId: string,
    cutoffAt: Date,
    deltaCutoffAt: Date,
    cursorAttemptedAt: Date | undefined,
    cursorAttemptId: string | undefined,
    limit: number
  ): Promise<PuzzleAttempt[]> {
    const collection = getCollection<PuzzleAttempt>("puzzleAttempts");
    const filter: Record<string, unknown> = {
      userId,
      isFinal: true,
      puzzleDate: { $regex: /^\d{4}-\d{2}-\d{2}$/ },
      attemptedAt: { $gt: cutoffAt, $lte: deltaCutoffAt },
    };
    if (cursorAttemptedAt && cursorAttemptId) {
      filter.$or = [
        { attemptedAt: { $gt: cursorAttemptedAt, $lte: deltaCutoffAt } },
        { attemptedAt: cursorAttemptedAt, id: { $gt: cursorAttemptId } },
      ];
    }
    return await collection.find(filter).sort({ attemptedAt: 1, id: 1 }).limit(limit).toArray();
  },

  async saveState(state: DailyProgressBackfillState): Promise<void> {
    const collection = getCollection<DailyProgressBackfillState>("dailyProgressBackfills");
    const {
      _id,
      userId,
      status,
      cutoffAt,
      cursorPuzzleDate,
      deltaCutoffAt,
      deltaCursorAttemptedAt,
      deltaCursorAttemptId,
      reconciliationStartedGeneration,
      reconciliationProcessedGeneration,
      reconciliationProcessedAt,
    } = state;
    const $set: Record<string, unknown> = {
      userId,
      status,
      cutoffAt,
      ...(cursorPuzzleDate ? { cursorPuzzleDate } : {}),
      ...(deltaCutoffAt ? { deltaCutoffAt } : {}),
      ...(deltaCursorAttemptedAt ? { deltaCursorAttemptedAt } : {}),
      ...(deltaCursorAttemptId ? { deltaCursorAttemptId } : {}),
      ...(reconciliationStartedGeneration !== undefined ? { reconciliationStartedGeneration } : {}),
      ...(reconciliationProcessedGeneration !== undefined
        ? { reconciliationProcessedGeneration }
        : {}),
      ...(reconciliationProcessedAt ? { reconciliationProcessedAt } : {}),
    };
    const $unset: Record<string, ""> = {};
    if (!cursorPuzzleDate) $unset.cursorPuzzleDate = "";
    if (!deltaCutoffAt) $unset.deltaCutoffAt = "";
    if (!deltaCursorAttemptedAt) $unset.deltaCursorAttemptedAt = "";
    if (!deltaCursorAttemptId) $unset.deltaCursorAttemptId = "";
    await collection.updateOne(
      { _id },
      {
        $set,
        $max: { updatedAt: state.updatedAt },
        $unset,
      },
      { upsert: true }
    );
  },
};

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

  /** Final official attempts are the sole repair source for Journey projections. */
  async findRecentFinalDailyAttempts(userId: string, limit = 42): Promise<PuzzleAttempt[]> {
    const collection = getCollection<PuzzleAttempt>("puzzleAttempts");
    return await collection
      .find({ userId, isFinal: true, puzzleDate: /^\d{4}-\d{2}-\d{2}$/ })
      .sort({ attemptedAt: -1 })
      .limit(limit)
      .toArray();
  },

  async countMaterializableFinalOfficialDailyAttempts(userId: string): Promise<number> {
    const collection = getCollection<PuzzleAttempt>("puzzleAttempts");
    const attempts = await collection
      .find({ userId, isFinal: true, puzzleDate: /^\d{4}-\d{2}-\d{2}$/ })
      .toArray();
    return attempts.filter((attempt) => dailyProgressFromAttempt(attempt) !== null).length;
  },

  /** Most recent persisted time zone from an official final attempt, if available. */
  async findNewestDailyTimeZone(userId: string): Promise<string | null> {
    const collection = getCollection<PuzzleAttempt>("puzzleAttempts");
    const attempts = collection
      .find({
        userId,
        isFinal: true,
        puzzleDate: /^\d{4}-\d{2}-\d{2}$/,
        puzzleTimeZone: { $type: "string", $ne: "" },
      })
      .project({ puzzleDate: 1, puzzleTimeZone: 1 })
      .sort({ attemptedAt: -1 });
    for await (const attempt of attempts) {
      if (isValidPuzzleDate(attempt.puzzleDate) && isValidIanaTimeZone(attempt.puzzleTimeZone)) {
        return attempt.puzzleTimeZone;
      }
    }
    return null;
  },

  /** Lifetime count of a user's attempt rows matching `filter`. */
  async countUserAttempts(userId: string, filter: Filter<PuzzleAttempt> = {}): Promise<number> {
    const collection = getCollection<PuzzleAttempt>("puzzleAttempts");
    return await collection.countDocuments({ ...filter, userId } as Filter<PuzzleAttempt>);
  },

  /** Hints used across finished games (each final row carries that game's hint count). */
  async sumFinalHintsUsed(userId: string): Promise<number> {
    const collection = getCollection<PuzzleAttempt>("puzzleAttempts");
    const [row] = await collection
      .aggregate<{ total: number }>([
        { $match: { userId, isFinal: true } },
        { $group: { _id: null, total: { $sum: { $ifNull: ["$hintsUsed", 0] } } } },
      ])
      .toArray();
    return row?.total ?? 0;
  },

  /**
   * Check if user has already finalized today's puzzle (won or out of attempts).
   * Hot path for home lock — no countDocuments.
   */
  async hasTodayAttempt(
    userId: string,
    puzzleDate?: string
  ): Promise<{
    hasAttempt: boolean;
    wasSuccessful: boolean;
    puzzleId?: string;
    attemptsUsed?: number;
  }> {
    const collection = getCollection<PuzzleAttempt>("puzzleAttempts");
    const dateKey = puzzleDate || new Date().toISOString().slice(0, 10);

    // Prefer puzzleDate + isFinal (new lock path)
    const finalAttempt =
      (await collection.findOne(
        {
          userId,
          puzzleDate: dateKey,
          isFinal: true,
        },
        { projection: { isCorrect: 1, puzzleId: 1 } }
      )) ||
      // Legacy fallback: finals from before puzzleDate/isFinal existed. Rows
      // that have a puzzleDate (archive and community plays) never count, or
      // an archive win would lock today and reveal its answer on /game-over.
      (await collection.findOne(
        {
          userId,
          puzzleDate: { $exists: false },
          attemptedAt: {
            $gte: new Date(`${dateKey}T00:00:00.000Z`),
            $lt: new Date(`${dateKey}T23:59:59.999Z`),
          },
          $or: [{ isCorrect: true }, { abandoned: true }],
        },
        { projection: { isCorrect: 1, puzzleId: 1 } }
      ));

    return {
      hasAttempt: !!finalAttempt,
      wasSuccessful: finalAttempt?.isCorrect ?? false,
      puzzleId: finalAttempt?.puzzleId,
    };
  },

  /** How many guesses the user has already submitted for a UTC day. */
  async countTodayGuesses(userId: string, puzzleDate: string): Promise<number> {
    const collection = getCollection<PuzzleAttempt>("puzzleAttempts");
    return await collection.countDocuments({ userId, puzzleDate });
  },

  /** Earliest guess today — used for server-side elapsed time. */
  async findFirstGuessToday(userId: string, puzzleDate: string): Promise<PuzzleAttempt | null> {
    const collection = getCollection<PuzzleAttempt>("puzzleAttempts");
    return await collection.findOne({ userId, puzzleDate }, { sort: { attemptedAt: 1 } });
  },

  /** Max hintsUsed reported on any guess today (prevents under-reporting later). */
  async maxHintsUsedToday(userId: string, puzzleDate: string): Promise<number> {
    const collection = getCollection<PuzzleAttempt>("puzzleAttempts");
    const top = await collection.findOne(
      { userId, puzzleDate },
      { sort: { hintsUsed: -1 }, projection: { hintsUsed: 1 } }
    );
    return typeof top?.hintsUsed === "number" ? top.hintsUsed : 0;
  },

  /**
   * Single round-trip for guess handling: lock + count + first guess + max hints.
   */
  async getTodayGuessContext(
    userId: string,
    puzzleDate: string
  ): Promise<{
    hasFinal: boolean;
    wasSuccessful: boolean;
    guessCount: number;
    firstGuessAt: Date | null;
    maxHintsUsed: number;
    playMode?: "extended";
  }> {
    const collection = getCollection<PuzzleAttempt>("puzzleAttempts");
    const rows = await collection
      .find({ userId, puzzleDate })
      .project({
        isFinal: 1,
        isCorrect: 1,
        abandoned: 1,
        attemptedAt: 1,
        hintsUsed: 1,
        playMode: 1,
        attemptType: 1,
      })
      .toArray();

    let hasFinal = false;
    let wasSuccessful = false;
    let firstGuessAt: Date | null = null;
    let maxHintsUsed = 0;
    let guessCount = 0;
    let playMode: "extended" | undefined;

    for (const row of rows) {
      if (row.isFinal || row.isCorrect || row.abandoned) {
        hasFinal = true;
        if (row.isCorrect) wasSuccessful = true;
      }
      if (row.attemptType !== "finalization") {
        guessCount += 1;
        if (row.playMode === "extended") playMode = "extended";
      }
      if (row.attemptType === "finalization") continue;
      if (row.attemptedAt) {
        const at = new Date(row.attemptedAt);
        if (!firstGuessAt || at < firstGuessAt) firstGuessAt = at;
      }
      if (typeof row.hintsUsed === "number" && row.hintsUsed > maxHintsUsed) {
        maxHintsUsed = row.hintsUsed;
      }
    }

    return {
      hasFinal,
      wasSuccessful,
      guessCount,
      firstGuessAt,
      maxHintsUsed,
      ...(playMode ? { playMode } : {}),
    };
  },

  /** Open, score-locked extended daily runs that can no longer accept guesses. */
  async findExpiredExtendedDailyRuns(
    userId: string,
    beforePuzzleDate: string
  ): Promise<Array<{ puzzleId: string; puzzleDate: string; attempts: PuzzleAttempt[] }>> {
    const collection = getCollection<PuzzleAttempt>("puzzleAttempts");
    const rows = await collection
      .find({
        userId,
        playMode: "extended",
        $or: [
          { isFinal: { $ne: true }, attemptType: { $ne: "finalization" } },
          { isFinal: true, attemptType: "finalization" },
        ],
        puzzleDate: { $type: "string", $regex: /^\d{4}-\d{2}-\d{2}$/, $lt: beforePuzzleDate },
      })
      .sort({ puzzleDate: 1, attemptNumber: 1 })
      .toArray();

    const groups = new Map<string, PuzzleAttempt[]>();
    for (const row of rows) {
      if (!row.puzzleDate || !row.puzzleId) continue;
      const key = `${row.puzzleDate}:${row.puzzleId}`;
      groups.set(key, [...(groups.get(key) ?? []), row]);
    }

    return [...groups.values()]
      .filter((attempts) => {
        const maxAttempts = attempts.at(-1)?.maxAttempts ?? 3;
        return (
          attempts.filter((attempt) => attempt.isScoredAttempt !== false).length >= maxAttempts
        );
      })
      .map((attempts) => ({
        puzzleId: attempts[0]!.puzzleId,
        puzzleDate: attempts[0]!.puzzleDate!,
        attempts,
      }));
  },

  /** Last expired score-locked run for a prior local day, for its optional answer review. */
  async findExpiredExtendedDailyRun(
    userId: string,
    puzzleDate: string
  ): Promise<PuzzleAttempt | null> {
    const collection = getCollection<PuzzleAttempt>("puzzleAttempts");
    return await collection.findOne(
      {
        userId,
        puzzleDate,
        playMode: "extended",
        attemptType: "finalization",
        finalizationReason: "expired",
        isFinal: true,
      },
      { sort: { attemptedAt: -1 } }
    );
  },

  /**
   * One row per daily played since `fromDate` (YYYY-MM-DD): solved if any
   * guess was correct, final if the day was finished. Archive and community
   * lock keys ("archive:…") sort after any date key, so the range drops them.
   * Legacy rows from before puzzleDate existed are keyed by their UTC day,
   * matching the fallback in hasTodayAttempt.
   */
  async getDailyResults(
    userId: string,
    fromDate: string
  ): Promise<Array<{ date: string; solved: boolean; final: boolean }>> {
    const collection = getCollection<PuzzleAttempt>("puzzleAttempts");
    const outcome = {
      solved: { $max: { $eq: ["$isCorrect", true] } },
      final: {
        $max: {
          $or: [
            { $eq: ["$isFinal", true] },
            { $eq: ["$isCorrect", true] },
            { $eq: ["$abandoned", true] },
          ],
        },
      },
    };
    type Row = { _id: string; solved: boolean; final: boolean };
    const [current, legacy] = await Promise.all([
      collection
        .aggregate<Row>([
          { $match: { userId, puzzleDate: { $gte: fromDate, $lte: "9999-12-31" } } },
          { $group: { _id: "$puzzleDate", ...outcome } },
        ])
        .toArray(),
      collection
        .aggregate<Row>([
          {
            $match: {
              userId,
              puzzleDate: { $exists: false },
              attemptedAt: { $gte: new Date(`${fromDate}T00:00:00.000Z`) },
            },
          },
          {
            $group: {
              _id: { $dateToString: { format: "%Y-%m-%d", date: "$attemptedAt" } },
              ...outcome,
            },
          },
        ])
        .toArray(),
    ]);

    const byDate = new Map<string, { date: string; solved: boolean; final: boolean }>();
    for (const row of [...legacy, ...current]) {
      const prev = byDate.get(row._id);
      byDate.set(row._id, {
        date: row._id,
        solved: Boolean(prev?.solved || row.solved),
        final: Boolean(prev?.final || row.final),
      });
    }
    return [...byDate.values()];
  },

  /** Dev tools: wipe a user's guesses for a UTC day so they can replay. */
  async clearAttemptsForDate(userId: string, puzzleDate: string): Promise<number> {
    const collection = getCollection<PuzzleAttempt>("puzzleAttempts");
    const [result, legacy] = await Promise.all([
      collection.deleteMany({ userId, puzzleDate }),
      // Also clear legacy rows keyed only by attemptedAt window
      collection.deleteMany({
        userId,
        puzzleDate: { $exists: false },
        attemptedAt: {
          $gte: new Date(`${puzzleDate}T00:00:00.000Z`),
          $lt: new Date(`${puzzleDate}T23:59:59.999Z`),
        },
      }),
    ]);
    return (result.deletedCount ?? 0) + (legacy.deletedCount ?? 0);
  },

  /**
   * Record a guess. Finals use a unique partial index on {userId, puzzleDate}
   * so concurrent completions cannot both succeed.
   */
  async createAtomicDailyAttempt(
    userId: string,
    todayStart: Date,
    attemptData: NewPuzzleAttempt
  ): Promise<
    | { success: true; attempt: PuzzleAttempt }
    | { success: false; attempt: PuzzleAttempt; reason: "locked" }
    | { success: false; attempt: null; reason: "duplicate-attempt" }
  > {
    const collection = getCollection<PuzzleAttempt>("puzzleAttempts");
    const puzzleDate = attemptData.puzzleDate || todayStart.toISOString().slice(0, 10);
    const isFinal = Boolean(
      attemptData.isFinal ?? (attemptData.isCorrect || attemptData.abandoned)
    );

    const payload: NewPuzzleAttempt = {
      ...attemptData,
      // One row per attempt slot. _id is always unique, so two guesses sent
      // at once can't both land as the same attempt number (or both as #1).
      ...(attemptData.attemptNumber
        ? { _id: `${userId}:${puzzleDate}:${attemptData.attemptNumber}` }
        : {}),
      puzzleDate,
      isFinal,
    };

    const existingFinal = await collection.findOne({
      userId,
      puzzleDate,
      isFinal: true,
    });
    if (existingFinal) {
      return { success: false, attempt: existingFinal, reason: "locked" };
    }

    try {
      await collection.insertOne(payload);
      return { success: true, attempt: payload as PuzzleAttempt };
    } catch (error) {
      if ((error as { code?: number }).code === 11000) {
        const existing = await collection.findOne({
          userId,
          puzzleDate,
          isFinal: true,
        });
        if (existing) {
          return { success: false, attempt: existing, reason: "locked" };
        }
        return { success: false, attempt: null, reason: "duplicate-attempt" };
      }
      throw error;
    }
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

  async findByPuzzleId(puzzleId: string): Promise<BlogPost | null> {
    const collection = getCollection<BlogPost>("blogPosts");
    return await collection.findOne({ puzzleId });
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

type StoreKitRevocationRecord = {
  _id: string;
  transactionId: string;
  productId: string;
  environment: string;
  notificationType: string;
  signedDate: number;
  revoked: boolean;
  updatedAt: Date;
};

/** Latest signed App Store notification state for each Plus transaction. */
export const storeKitOps = {
  async isTransactionRevoked(transactionId: string): Promise<boolean> {
    const collection = getCollection<StoreKitRevocationRecord>("storeKitRevocations");
    // Records created before signed notification ordering existed remain revoked until a
    // newer signed REFUND_REVERSED event explicitly clears them.
    return Boolean(
      await collection.findOne(
        { _id: transactionId, $or: [{ revoked: true }, { revoked: { $exists: false } }] },
        { projection: { _id: 1 } }
      )
    );
  },

  async applyNotification(
    record: Omit<StoreKitRevocationRecord, "_id" | "updatedAt">
  ): Promise<void> {
    const collection = getCollection<StoreKitRevocationRecord>("storeKitRevocations");
    const filter = {
      _id: record.transactionId,
      $or: [{ signedDate: { $lt: record.signedDate } }, { signedDate: { $exists: false } }],
    };
    const update = {
      $set: { ...record, updatedAt: new Date() },
    };

    try {
      await collection.updateOne(filter, update, { upsert: true });
    } catch (error) {
      // A stale event does not match the signedDate filter, so an upsert collides with
      // the existing transaction's _id. Retry without upsert to make it a safe no-op.
      if (
        !error ||
        typeof error !== "object" ||
        !("code" in error) ||
        (error as { code?: unknown }).code !== 11000
      ) {
        throw error;
      }
      await collection.updateOne(filter, update);
    }
  },
};

export interface PracticeRoundTokenState {
  userId: string;
  puzzleId: string;
  roundId: string;
  token: string;
  expiresAt: Date;
}

interface PracticeRoundTokenRecord {
  _id: string;
  userId: string;
  puzzleId: string;
  tokenDigest: string;
  expiresAt: Date;
}

function practiceRoundTokenDigest(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

function practiceRoundTokenFilter(state: PracticeRoundTokenState) {
  return {
    _id: state.roundId,
    userId: state.userId,
    puzzleId: state.puzzleId,
    tokenDigest: practiceRoundTokenDigest(state.token),
    expiresAt: { $gt: new Date() },
  };
}

/** Replay-protection state for signed tokens; stores no guesses, answers, or attempt count. */
export const practiceRoundOps = {
  async activateToken(state: PracticeRoundTokenState): Promise<void> {
    const collection = getCollection<PracticeRoundTokenRecord>("practiceRoundTokens");
    await collection.insertOne({
      _id: state.roundId,
      userId: state.userId,
      puzzleId: state.puzzleId,
      tokenDigest: practiceRoundTokenDigest(state.token),
      expiresAt: state.expiresAt,
    });
  },

  async isTokenActive(state: PracticeRoundTokenState): Promise<boolean> {
    const collection = getCollection<PracticeRoundTokenRecord>("practiceRoundTokens");
    return Boolean(
      await collection.findOne(practiceRoundTokenFilter(state), { projection: { _id: 1 } })
    );
  },

  async advanceToken(
    current: PracticeRoundTokenState,
    next: PracticeRoundTokenState | null
  ): Promise<boolean> {
    const collection = getCollection<PracticeRoundTokenRecord>("practiceRoundTokens");
    if (
      next &&
      (next.userId !== current.userId ||
        next.puzzleId !== current.puzzleId ||
        next.roundId !== current.roundId)
    ) {
      throw new Error("Practice round token transition must remain within the same round");
    }

    const filter = practiceRoundTokenFilter(current);
    if (!next) {
      const result = await collection.deleteOne(filter);
      return result.deletedCount === 1;
    }

    const result = await collection.updateOne(filter, {
      $set: {
        tokenDigest: practiceRoundTokenDigest(next.token),
        expiresAt: next.expiresAt,
      },
    });
    return result.modifiedCount === 1;
  },
};
