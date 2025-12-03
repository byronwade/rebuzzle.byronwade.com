/**
 * AI Learning System Database Operations
 *
 * CRUD operations for AI decisions, errors, feedback, configurations, and learning events
 */

import type {
  AIConfiguration,
  AIDecision,
  AIError,
  AIFeedback,
  AILearningEvent,
  NewAIConfiguration,
  NewAIDecision,
  NewAIError,
  NewAIFeedback,
  NewAILearningEvent,
} from "./models";
import { getCollection } from "./mongodb";

// ============================================================================
// AI DECISION OPERATIONS
// ============================================================================

export const aiDecisionOps = {
  async create(decision: NewAIDecision): Promise<AIDecision> {
    const collection = getCollection<AIDecision>("aiDecisions");
    await collection.insertOne(decision);
    return decision as AIDecision;
  },

  async findById(id: string): Promise<AIDecision | null> {
    const collection = getCollection<AIDecision>("aiDecisions");
    return await collection.findOne({ id });
  },

  async findByOperationId(operationId: string): Promise<AIDecision[]> {
    const collection = getCollection<AIDecision>("aiDecisions");
    return await collection.find({ operationId }).sort({ timestamp: 1 }).toArray();
  },

  async findByEntityId(entityId: string, entityType?: string): Promise<AIDecision[]> {
    const collection = getCollection<AIDecision>("aiDecisions");
    const filter: Record<string, unknown> = { entityId };
    if (entityType) filter.entityType = entityType;
    return await collection.find(filter).sort({ timestamp: -1 }).toArray();
  },

  async findRecent(
    options: {
      limit?: number;
      decisionType?: AIDecision["decisionType"];
      success?: boolean;
      startDate?: Date;
      endDate?: Date;
      provider?: string;
      model?: string;
    } = {}
  ): Promise<AIDecision[]> {
    const collection = getCollection<AIDecision>("aiDecisions");
    const { limit = 50, decisionType, success, startDate, endDate, provider, model } = options;

    const filter: Record<string, unknown> = {};
    if (decisionType) filter.decisionType = decisionType;
    if (success !== undefined) filter["output.success"] = success;
    if (provider) filter.provider = provider;
    if (model) filter.model = model;

    if (startDate || endDate) {
      filter.timestamp = {};
      if (startDate) (filter.timestamp as Record<string, Date>).$gte = startDate;
      if (endDate) (filter.timestamp as Record<string, Date>).$lte = endDate;
    }

    return await collection.find(filter).sort({ timestamp: -1 }).limit(limit).toArray();
  },

  async getStats(
    startDate?: Date,
    endDate?: Date
  ): Promise<{
    totalDecisions: number;
    successRate: number;
    avgDurationMs: number;
    avgTokens: number;
    totalCost: number;
    byType: Record<string, number>;
    byProvider: Record<string, number>;
  }> {
    const collection = getCollection<AIDecision>("aiDecisions");

    const filter: Record<string, unknown> = {};
    if (startDate || endDate) {
      filter.timestamp = {};
      if (startDate) (filter.timestamp as Record<string, Date>).$gte = startDate;
      if (endDate) (filter.timestamp as Record<string, Date>).$lte = endDate;
    }

    const pipeline = [
      { $match: filter },
      {
        $group: {
          _id: null,
          totalDecisions: { $sum: 1 },
          successCount: { $sum: { $cond: ["$output.success", 1, 0] } },
          avgDurationMs: { $avg: "$durationMs" },
          avgTokens: { $avg: "$tokens.total" },
          totalCost: { $sum: "$tokens.cost" },
        },
      },
    ];

    const [stats] = await collection.aggregate(pipeline).toArray();

    // Get by type
    const byTypePipeline = [
      { $match: filter },
      { $group: { _id: "$decisionType", count: { $sum: 1 } } },
    ];
    const byTypeResults = await collection.aggregate(byTypePipeline).toArray();
    const byType: Record<string, number> = {};
    byTypeResults.forEach((r) => {
      byType[r._id] = r.count;
    });

    // Get by provider
    const byProviderPipeline = [
      { $match: filter },
      { $group: { _id: "$provider", count: { $sum: 1 } } },
    ];
    const byProviderResults = await collection.aggregate(byProviderPipeline).toArray();
    const byProvider: Record<string, number> = {};
    byProviderResults.forEach((r) => {
      byProvider[r._id] = r.count;
    });

    return {
      totalDecisions: stats?.totalDecisions || 0,
      successRate: stats?.totalDecisions ? stats.successCount / stats.totalDecisions : 0,
      avgDurationMs: stats?.avgDurationMs || 0,
      avgTokens: stats?.avgTokens || 0,
      totalCost: stats?.totalCost || 0,
      byType,
      byProvider,
    };
  },

  async getTimeSeries(
    interval: "hour" | "day" | "week",
    startDate: Date,
    endDate: Date
  ): Promise<
    Array<{
      date: Date;
      count: number;
      successCount: number;
      avgDuration: number;
      totalCost: number;
    }>
  > {
    const collection = getCollection<AIDecision>("aiDecisions");

    const dateFormat =
      interval === "hour"
        ? { year: "$year", month: "$month", day: "$dayOfMonth", hour: "$hour" }
        : interval === "day"
          ? { year: "$year", month: "$month", day: "$dayOfMonth" }
          : { year: "$year", week: "$week" };

    const pipeline = [
      { $match: { timestamp: { $gte: startDate, $lte: endDate } } },
      {
        $group: {
          _id: {
            year: { $year: "$timestamp" },
            ...(interval === "hour"
              ? { month: { $month: "$timestamp" }, day: { $dayOfMonth: "$timestamp" }, hour: { $hour: "$timestamp" } }
              : interval === "day"
                ? { month: { $month: "$timestamp" }, day: { $dayOfMonth: "$timestamp" } }
                : { week: { $week: "$timestamp" } }),
          },
          count: { $sum: 1 },
          successCount: { $sum: { $cond: ["$output.success", 1, 0] } },
          avgDuration: { $avg: "$durationMs" },
          totalCost: { $sum: "$tokens.cost" },
        },
      },
      { $sort: { "_id.year": 1, "_id.month": 1, "_id.day": 1, "_id.hour": 1, "_id.week": 1 } },
    ];

    const results = await collection.aggregate(pipeline).toArray();

    return results.map((r) => ({
      date: new Date(
        r._id.year,
        (r._id.month || 1) - 1,
        r._id.day || 1,
        r._id.hour || 0
      ),
      count: r.count,
      successCount: r.successCount,
      avgDuration: r.avgDuration,
      totalCost: r.totalCost,
    }));
  },

  async markFeedbackReceived(id: string): Promise<void> {
    const collection = getCollection<AIDecision>("aiDecisions");
    await collection.updateOne({ id }, { $set: { feedbackReceived: true } });
  },
};

// ============================================================================
// AI ERROR OPERATIONS
// ============================================================================

export const aiErrorOps = {
  async create(error: NewAIError): Promise<AIError> {
    const collection = getCollection<AIError>("aiErrors");
    await collection.insertOne(error);
    return error as AIError;
  },

  async findById(id: string): Promise<AIError | null> {
    const collection = getCollection<AIError>("aiErrors");
    return await collection.findOne({ id });
  },

  async findByDecisionId(decisionId: string): Promise<AIError[]> {
    const collection = getCollection<AIError>("aiErrors");
    return await collection.find({ decisionId }).sort({ timestamp: -1 }).toArray();
  },

  async findRecent(
    options: {
      limit?: number;
      severity?: AIError["severity"];
      errorType?: AIError["errorType"];
      resolved?: boolean;
      startDate?: Date;
      endDate?: Date;
    } = {}
  ): Promise<AIError[]> {
    const collection = getCollection<AIError>("aiErrors");
    const { limit = 50, severity, errorType, resolved, startDate, endDate } = options;

    const filter: Record<string, unknown> = {};
    if (severity) filter.severity = severity;
    if (errorType) filter.errorType = errorType;
    if (resolved !== undefined) filter.resolved = resolved;

    if (startDate || endDate) {
      filter.timestamp = {};
      if (startDate) (filter.timestamp as Record<string, Date>).$gte = startDate;
      if (endDate) (filter.timestamp as Record<string, Date>).$lte = endDate;
    }

    return await collection.find(filter).sort({ timestamp: -1 }).limit(limit).toArray();
  },

  async getPatterns(
    startDate?: Date,
    endDate?: Date
  ): Promise<
    Array<{
      errorCode: string;
      count: number;
      severity: string;
      recentOccurrence: Date;
      resolvedCount: number;
    }>
  > {
    const collection = getCollection<AIError>("aiErrors");

    const filter: Record<string, unknown> = {};
    if (startDate || endDate) {
      filter.timestamp = {};
      if (startDate) (filter.timestamp as Record<string, Date>).$gte = startDate;
      if (endDate) (filter.timestamp as Record<string, Date>).$lte = endDate;
    }

    const pipeline = [
      { $match: filter },
      {
        $group: {
          _id: "$errorCode",
          count: { $sum: 1 },
          severity: { $first: "$severity" },
          recentOccurrence: { $max: "$timestamp" },
          resolvedCount: { $sum: { $cond: ["$resolved", 1, 0] } },
        },
      },
      { $sort: { count: -1 } },
    ];

    const results = await collection.aggregate(pipeline).toArray();
    return results.map((r) => ({
      errorCode: r._id,
      count: r.count,
      severity: r.severity,
      recentOccurrence: r.recentOccurrence,
      resolvedCount: r.resolvedCount,
    }));
  },

  async resolve(
    id: string,
    resolution: NonNullable<AIError["resolution"]>
  ): Promise<void> {
    const collection = getCollection<AIError>("aiErrors");
    await collection.updateOne(
      { id },
      { $set: { resolved: true, resolution: { ...resolution, resolvedAt: new Date() } } }
    );
  },

  async getUnresolvedCritical(): Promise<AIError[]> {
    const collection = getCollection<AIError>("aiErrors");
    return await collection
      .find({ resolved: false, severity: { $in: ["critical", "major"] } })
      .sort({ timestamp: -1 })
      .toArray();
  },
};

// ============================================================================
// AI FEEDBACK OPERATIONS
// ============================================================================

export const aiFeedbackOps = {
  async create(feedback: NewAIFeedback): Promise<AIFeedback> {
    const collection = getCollection<AIFeedback>("aiFeedback");
    await collection.insertOne(feedback);
    return feedback as AIFeedback;
  },

  async findById(id: string): Promise<AIFeedback | null> {
    const collection = getCollection<AIFeedback>("aiFeedback");
    return await collection.findOne({ id });
  },

  async findByPuzzleId(puzzleId: string): Promise<AIFeedback[]> {
    const collection = getCollection<AIFeedback>("aiFeedback");
    return await collection.find({ puzzleId }).sort({ timestamp: -1 }).toArray();
  },

  async findByUserId(userId: string, limit = 50): Promise<AIFeedback[]> {
    const collection = getCollection<AIFeedback>("aiFeedback");
    return await collection.find({ userId }).sort({ timestamp: -1 }).limit(limit).toArray();
  },

  async findUnprocessed(limit = 100): Promise<AIFeedback[]> {
    const collection = getCollection<AIFeedback>("aiFeedback");
    return await collection
      .find({ processedForLearning: false })
      .sort({ timestamp: 1 })
      .limit(limit)
      .toArray();
  },

  async countUnprocessed(): Promise<number> {
    const collection = getCollection<AIFeedback>("aiFeedback");
    return await collection.countDocuments({ processedForLearning: false });
  },

  async markProcessed(
    id: string,
    learningImpact?: AIFeedback["learningImpact"]
  ): Promise<void> {
    const collection = getCollection<AIFeedback>("aiFeedback");
    await collection.updateOne(
      { id },
      { $set: { processedForLearning: true, learningImpact } }
    );
  },

  async getAggregate(
    groupBy: "puzzleType" | "difficulty" | "category" | "feedbackType",
    startDate?: Date,
    endDate?: Date
  ): Promise<
    Array<{
      group: string;
      count: number;
      avgRating: number;
      avgSatisfaction: number;
    }>
  > {
    const collection = getCollection<AIFeedback>("aiFeedback");

    const filter: Record<string, unknown> = {};
    if (startDate || endDate) {
      filter.timestamp = {};
      if (startDate) (filter.timestamp as Record<string, Date>).$gte = startDate;
      if (endDate) (filter.timestamp as Record<string, Date>).$lte = endDate;
    }

    // For puzzleType, difficulty, category - we need to join with puzzles
    // For feedbackType - we can group directly
    const groupField = groupBy === "feedbackType" ? "$feedbackType" : `$context.${groupBy}`;

    const pipeline = [
      { $match: filter },
      {
        $group: {
          _id: groupField,
          count: { $sum: 1 },
          avgRating: { $avg: "$rating" },
          avgSatisfaction: { $avg: "$satisfaction" },
        },
      },
      { $sort: { count: -1 } },
    ];

    const results = await collection.aggregate(pipeline).toArray();
    return results.map((r) => ({
      group: r._id || "unknown",
      count: r.count,
      avgRating: r.avgRating,
      avgSatisfaction: r.avgSatisfaction,
    }));
  },

  async getSatisfactionTrend(
    interval: "day" | "week",
    startDate: Date,
    endDate: Date
  ): Promise<
    Array<{
      date: Date;
      avgRating: number;
      avgSatisfaction: number;
      count: number;
    }>
  > {
    const collection = getCollection<AIFeedback>("aiFeedback");

    const pipeline = [
      { $match: { timestamp: { $gte: startDate, $lte: endDate } } },
      {
        $group: {
          _id:
            interval === "day"
              ? {
                  year: { $year: "$timestamp" },
                  month: { $month: "$timestamp" },
                  day: { $dayOfMonth: "$timestamp" },
                }
              : {
                  year: { $year: "$timestamp" },
                  week: { $week: "$timestamp" },
                },
          avgRating: { $avg: "$rating" },
          avgSatisfaction: { $avg: "$satisfaction" },
          count: { $sum: 1 },
        },
      },
      { $sort: { "_id.year": 1, "_id.month": 1, "_id.day": 1, "_id.week": 1 } },
    ];

    const results = await collection.aggregate(pipeline).toArray();
    return results.map((r) => ({
      date: new Date(r._id.year, (r._id.month || 1) - 1, r._id.day || 1),
      avgRating: r.avgRating,
      avgSatisfaction: r.avgSatisfaction,
      count: r.count,
    }));
  },
};

// ============================================================================
// AI CONFIGURATION OPERATIONS
// ============================================================================

export const aiConfigOps = {
  async create(config: NewAIConfiguration): Promise<AIConfiguration> {
    const collection = getCollection<AIConfiguration>("aiConfigurations");
    await collection.insertOne(config);
    return config as AIConfiguration;
  },

  async findById(id: string): Promise<AIConfiguration | null> {
    const collection = getCollection<AIConfiguration>("aiConfigurations");
    return await collection.findOne({ id });
  },

  async findByVersion(version: string): Promise<AIConfiguration | null> {
    const collection = getCollection<AIConfiguration>("aiConfigurations");
    return await collection.findOne({ version });
  },

  async findActive(): Promise<AIConfiguration | null> {
    const collection = getCollection<AIConfiguration>("aiConfigurations");
    return await collection.findOne({ status: "active", isDefault: true });
  },

  async findAll(includeArchived = false): Promise<AIConfiguration[]> {
    const collection = getCollection<AIConfiguration>("aiConfigurations");
    if (includeArchived) {
      return await collection.find({}).sort({ createdAt: -1 }).toArray();
    }
    return await collection.find({ status: { $ne: "archived" as const } }).sort({ createdAt: -1 }).toArray();
  },

  async findByABTest(testId: string): Promise<AIConfiguration[]> {
    const collection = getCollection<AIConfiguration>("aiConfigurations");
    return await collection.find({ "abTest.testId": testId }).toArray();
  },

  async update(id: string, updates: Partial<AIConfiguration>): Promise<void> {
    const collection = getCollection<AIConfiguration>("aiConfigurations");
    await collection.updateOne({ id }, { $set: { ...updates, updatedAt: new Date() } });
  },

  async activate(id: string): Promise<void> {
    const collection = getCollection<AIConfiguration>("aiConfigurations");

    // Deactivate all other default configs
    await collection.updateMany(
      { isDefault: true, status: "active" },
      { $set: { status: "archived", deactivatedAt: new Date() } }
    );

    // Activate this one
    await collection.updateOne(
      { id },
      { $set: { status: "active", isDefault: true, activatedAt: new Date(), updatedAt: new Date() } }
    );
  },

  async archive(id: string): Promise<void> {
    const collection = getCollection<AIConfiguration>("aiConfigurations");
    await collection.updateOne(
      { id },
      { $set: { status: "archived", deactivatedAt: new Date(), updatedAt: new Date() } }
    );
  },

  async updateMetrics(id: string, metrics: AIConfiguration["metrics"]): Promise<void> {
    const collection = getCollection<AIConfiguration>("aiConfigurations");
    await collection.updateOne({ id }, { $set: { metrics, updatedAt: new Date() } });
  },

  async getActiveABTests(): Promise<
    Array<{
      testId: string;
      testName: string;
      variants: AIConfiguration[];
    }>
  > {
    const collection = getCollection<AIConfiguration>("aiConfigurations");

    const configs = await collection
      .find({
        "abTest.testId": { $exists: true },
        "abTest.endDate": { $exists: false },
        status: "testing",
      })
      .toArray();

    // Group by testId
    const testMap = new Map<string, { testName: string; variants: AIConfiguration[] }>();
    for (const config of configs) {
      if (config.abTest) {
        if (!testMap.has(config.abTest.testId)) {
          testMap.set(config.abTest.testId, {
            testName: config.abTest.testName,
            variants: [],
          });
        }
        testMap.get(config.abTest.testId)!.variants.push(config);
      }
    }

    return Array.from(testMap.entries()).map(([testId, data]) => ({
      testId,
      ...data,
    }));
  },
};

// ============================================================================
// AI LEARNING EVENT OPERATIONS
// ============================================================================

export const aiLearningEventOps = {
  async create(event: NewAILearningEvent): Promise<AILearningEvent> {
    const collection = getCollection<AILearningEvent>("aiLearningEvents");
    await collection.insertOne(event);
    return event as AILearningEvent;
  },

  async findById(id: string): Promise<AILearningEvent | null> {
    const collection = getCollection<AILearningEvent>("aiLearningEvents");
    return await collection.findOne({ id });
  },

  async findByStatus(status: AILearningEvent["status"]): Promise<AILearningEvent[]> {
    const collection = getCollection<AILearningEvent>("aiLearningEvents");
    return await collection.find({ status }).sort({ timestamp: -1 }).toArray();
  },

  async findByConfigId(configId: string): Promise<AILearningEvent[]> {
    const collection = getCollection<AILearningEvent>("aiLearningEvents");
    return await collection.find({ appliedToConfigId: configId }).sort({ timestamp: -1 }).toArray();
  },

  async findRecent(limit = 50): Promise<AILearningEvent[]> {
    const collection = getCollection<AILearningEvent>("aiLearningEvents");
    return await collection.find({}).sort({ timestamp: -1 }).limit(limit).toArray();
  },

  async updateStatus(id: string, status: AILearningEvent["status"]): Promise<void> {
    const collection = getCollection<AILearningEvent>("aiLearningEvents");
    await collection.updateOne({ id }, { $set: { status } });
  },

  async apply(id: string, configId: string): Promise<void> {
    const collection = getCollection<AILearningEvent>("aiLearningEvents");
    await collection.updateOne(
      { id },
      { $set: { status: "applied", appliedToConfigId: configId } }
    );
  },

  async revert(id: string): Promise<void> {
    const collection = getCollection<AILearningEvent>("aiLearningEvents");
    await collection.updateOne({ id }, { $set: { status: "reverted" } });
  },

  async recordActualImpact(
    id: string,
    impact: NonNullable<AILearningEvent["actualImpact"]>
  ): Promise<void> {
    const collection = getCollection<AILearningEvent>("aiLearningEvents");
    await collection.updateOne({ id }, { $set: { actualImpact: impact } });
  },

  async getImpactSummary(
    startDate?: Date,
    endDate?: Date
  ): Promise<{
    totalEvents: number;
    applied: number;
    reverted: number;
    avgQualityChange: number;
    avgSatisfactionChange: number;
    avgCostChange: number;
  }> {
    const collection = getCollection<AILearningEvent>("aiLearningEvents");

    const filter: Record<string, unknown> = {};
    if (startDate || endDate) {
      filter.timestamp = {};
      if (startDate) (filter.timestamp as Record<string, Date>).$gte = startDate;
      if (endDate) (filter.timestamp as Record<string, Date>).$lte = endDate;
    }

    const pipeline = [
      { $match: filter },
      {
        $group: {
          _id: null,
          totalEvents: { $sum: 1 },
          applied: { $sum: { $cond: [{ $eq: ["$status", "applied"] }, 1, 0] } },
          reverted: { $sum: { $cond: [{ $eq: ["$status", "reverted"] }, 1, 0] } },
          avgQualityChange: { $avg: "$actualImpact.qualityChange" },
          avgSatisfactionChange: { $avg: "$actualImpact.satisfactionChange" },
          avgCostChange: { $avg: "$actualImpact.costChange" },
        },
      },
    ];

    const [result] = await collection.aggregate(pipeline).toArray();
    return {
      totalEvents: result?.totalEvents || 0,
      applied: result?.applied || 0,
      reverted: result?.reverted || 0,
      avgQualityChange: result?.avgQualityChange || 0,
      avgSatisfactionChange: result?.avgSatisfactionChange || 0,
      avgCostChange: result?.avgCostChange || 0,
    };
  },
};
