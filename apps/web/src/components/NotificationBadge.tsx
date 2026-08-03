"use client";

import { NotificationBadgeShell } from "./notification-badge-shell";
import { useNotificationBadge } from "./use-notification-badge";

export function NotificationBadge(props: any) {
  const state = useNotificationBadge(props);
  return <NotificationBadgeShell {...state} />;
}
