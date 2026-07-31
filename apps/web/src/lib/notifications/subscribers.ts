import type { User } from "@/db/models";
import { getCollection } from "@/db/mongodb";

export type EmailRecipient = {
  email: string;
  username?: string;
  userId?: string;
};

/**
 * Active email notification recipients.
 * Includes every enabled subscription (no stale cutoff) so the full
 * signup / notification list gets morning blog + afternoon puzzle emails.
 */
export async function getActiveEmailRecipients(options?: {
  sendToAllUsers?: boolean;
}): Promise<EmailRecipient[]> {
  if (options?.sendToAllUsers) {
    const usersCollection = getCollection<User>("users");
    const allUsers = await usersCollection.find({ email: { $exists: true, $ne: "" } }).toArray();
    return allUsers
      .filter((u) => !u.isGuest)
      .map((user) => ({
        email: user.email,
        username: user.username,
        userId: user.id,
      }));
  }

  const emailSubscriptionsCollection = getCollection("emailSubscriptions");
  const subscriptions = await emailSubscriptionsCollection.find({ enabled: true }).toArray();

  const usersCollection = getCollection<User>("users");
  const userIds = subscriptions.map((s) => s.userId).filter((id): id is string => Boolean(id));
  const users =
    userIds.length > 0 ? await usersCollection.find({ id: { $in: userIds } }).toArray() : [];
  const userMap = new Map(users.map((u) => [u.id, u]));

  const seen = new Set<string>();
  const recipients: EmailRecipient[] = [];

  for (const sub of subscriptions) {
    const email = (sub.email || "").toLowerCase().trim();
    if (!email || seen.has(email)) continue;
    seen.add(email);
    const user = sub.userId ? userMap.get(sub.userId) : undefined;
    recipients.push({
      email,
      username: user?.username,
      userId: sub.userId,
    });
  }

  return recipients;
}
