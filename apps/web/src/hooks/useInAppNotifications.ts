"use client";

import { useCallback, useEffect, useState } from "react";
import { withLoadingFlag } from "@/lib/with-loading-flag";

export type InAppNotificationItem = {
  id: string;
  type: string;
  title: string;
  message: string;
  link?: string;
  createdAt: string;
};

export function useInAppNotifications(enabled: boolean) {
  const [notifications, setNotifications] = useState<InAppNotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!enabled) {
      setNotifications([]);
      setUnreadCount(0);
      return;
    }
    await withLoadingFlag(setIsLoading, async () => {
      try {
        const response = await fetch("/api/notifications/in-app", { credentials: "include" });
        if (!response.ok) {
          return;
        }
        const data = await response.json();
        if (data.success) {
          setNotifications(data.notifications ?? []);
          setUnreadCount(data.unreadCount ?? 0);
        }
      } catch {
        // non-fatal
      }
    });

  }, [enabled]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const markRead = useCallback(async (notificationId: string) => {
    try {
      await fetch("/api/notifications/in-app", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ notificationId }),
      });
      setNotifications((prev) => prev.filter((item) => item.id !== notificationId));
      setUnreadCount((count) => Math.max(0, count - 1));
    } catch {
      // ignore
    }
  }, []);

  return { notifications, unreadCount, isLoading, refresh, markRead };
}
