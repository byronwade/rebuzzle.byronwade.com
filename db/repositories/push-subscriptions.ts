/**
 * Push Subscriptions Repository
 *
 * Handles all database operations for push notifications
 * with proper error handling and type safety
 */

import { eq, and, gte } from "drizzle-orm"
import { db } from "../client"
import { pushSubscriptions, type NewPushSubscription, type PushSubscription } from "../schema"
import { NotFoundError, wrapDbOperation, type DbResult } from "../errors"

/**
 * Create or update a push subscription
 */
export async function upsertPushSubscription(
  data: Omit<NewPushSubscription, "id" | "createdAt" | "updatedAt">
): Promise<DbResult<PushSubscription>> {
  return wrapDbOperation(async () => {
    // Check if subscription exists
    const existing = await db
      .select()
      .from(pushSubscriptions)
      .where(
        and(
          eq(pushSubscriptions.userId, data.userId),
          eq(pushSubscriptions.endpoint, data.endpoint)
        )
      )
      .limit(1)

    if (existing.length > 0) {
      // Update existing subscription
      const [updated] = await db
        .update(pushSubscriptions)
        .set({
          auth: data.auth,
          p256dh: data.p256dh,
          updatedAt: new Date(),
        })
        .where(eq(pushSubscriptions.id, existing[0]!.id))
        .returning()

      return updated!
    }

    // Create new subscription
    const [created] = await db
      .insert(pushSubscriptions)
      .values(data)
      .returning()

    return created!
  })
}

/**
 * Find subscription by ID
 */
export async function findPushSubscriptionById(
  id: string
): Promise<DbResult<PushSubscription>> {
  return wrapDbOperation(async () => {
    const [subscription] = await db
      .select()
      .from(pushSubscriptions)
      .where(eq(pushSubscriptions.id, id))
      .limit(1)

    if (!subscription) {
      throw new NotFoundError("Push subscription", id)
    }

    return subscription
  })
}

/**
 * Find subscription by user ID and endpoint
 */
export async function findPushSubscriptionByUserAndEndpoint(
  userId: string,
  endpoint: string
): Promise<DbResult<PushSubscription | null>> {
  return wrapDbOperation(async () => {
    const [subscription] = await db
      .select()
      .from(pushSubscriptions)
      .where(
        and(
          eq(pushSubscriptions.userId, userId),
          eq(pushSubscriptions.endpoint, endpoint)
        )
      )
      .limit(1)

    return subscription || null
  })
}

/**
 * Get all subscriptions for a user
 */
export async function findPushSubscriptionsByUser(
  userId: string
): Promise<DbResult<PushSubscription[]>> {
  return wrapDbOperation(async () => {
    return await db
      .select()
      .from(pushSubscriptions)
      .where(eq(pushSubscriptions.userId, userId))
  })
}

/**
 * Get active subscriptions (updated within X days)
 */
export async function findActivePushSubscriptions(
  daysActive = 30
): Promise<DbResult<PushSubscription[]>> {
  return wrapDbOperation(async () => {
    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - daysActive)

    return await db
      .select()
      .from(pushSubscriptions)
      .where(gte(pushSubscriptions.updatedAt, cutoffDate))
  })
}

/**
 * Delete subscription by ID
 */
export async function deletePushSubscriptionById(
  id: string
): Promise<DbResult<{ deletedCount: number }>> {
  return wrapDbOperation(async () => {
    const deleted = await db
      .delete(pushSubscriptions)
      .where(eq(pushSubscriptions.id, id))
      .returning()

    return { deletedCount: deleted.length }
  })
}

/**
 * Delete all subscriptions for a user
 */
export async function deletePushSubscriptionsByUser(
  userId: string
): Promise<DbResult<{ deletedCount: number }>> {
  return wrapDbOperation(async () => {
    const deleted = await db
      .delete(pushSubscriptions)
      .where(eq(pushSubscriptions.userId, userId))
      .returning()

    return { deletedCount: deleted.length }
  })
}

/**
 * Delete subscription by user and endpoint
 */
export async function deletePushSubscriptionByUserAndEndpoint(
  userId: string,
  endpoint: string
): Promise<DbResult<{ deletedCount: number }>> {
  return wrapDbOperation(async () => {
    const deleted = await db
      .delete(pushSubscriptions)
      .where(
        and(
          eq(pushSubscriptions.userId, userId),
          eq(pushSubscriptions.endpoint, endpoint)
        )
      )
      .returning()

    return { deletedCount: deleted.length }
  })
}

/**
 * Clean up old subscriptions (not updated in X days)
 */
export async function cleanupOldPushSubscriptions(
  daysOld = 90
): Promise<DbResult<{ deletedCount: number }>> {
  return wrapDbOperation(async () => {
    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - daysOld)

    const deleted = await db
      .delete(pushSubscriptions)
      .where(gte(cutoffDate, pushSubscriptions.updatedAt))
      .returning()

    return { deletedCount: deleted.length }
  })
}
