"use client";

import { formatDistanceToNow } from "date-fns";
import { Bell, BellRing, Loader2, Mail } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { useEmailNotifications } from "@/hooks/useEmailNotifications";
import { cn } from "@/lib/utils";
import { useAuth } from "./AuthProvider";

interface InAppNotification {
  id: string;
  type: string;
  title: string;
  message: string;
  link?: string;
  createdAt: string;
}

export function NotificationBadge() {
  const { userId, isAuthenticated, user } = useAuth();
  const [notifications, setNotifications] = useState<InAppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [showEmailDialog, setShowEmailDialog] = useState(false);
  const [guestEmail, setGuestEmail] = useState("");
  const [emailError, setEmailError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    enabled: notificationsEnabled,
    isLoading: emailLoading,
    toggle,
    subscribe,
    unsubscribe,
  } = useEmailNotifications();

  const fetchNotifications = async () => {
    if (!userId) return;

    try {
      const response = await fetch(
        `/api/notifications/in-app?userId=${userId}`
      );
      if (response.ok) {
        const data = await response.json();
        setNotifications(data.notifications || []);
        setUnreadCount(data.unreadCount || 0);
      }
    } catch (error) {
      console.error("[Notifications] Fetch failed:", error);
    }
  };

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (isAuthenticated && userId) {
      fetchNotifications();
      // Poll for new notifications every 30 seconds
      const interval = setInterval(fetchNotifications, 30_000);
      return () => clearInterval(interval);
    }
  }, [isAuthenticated, userId]);

  // Validate email format
  const validateEmail = useCallback((emailValue: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(emailValue);
  }, []);

  const markAsRead = async (notificationId: string) => {
    if (!userId) return;

    try {
      await fetch("/api/notifications/in-app", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notificationId, userId }),
      });

      // Update local state
      setNotifications((prev) =>
        prev.map((n) => (n.id === notificationId ? { ...n, read: true } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (error) {
      console.error("[Notifications] Mark read failed:", error);
    }
  };

  const handleEmailToggle = useCallback(async () => {
    if (notificationsEnabled) {
      // Unsubscribe
      try {
        await unsubscribe();
      } catch (err) {
        // Error handled in hook
      }
      return;
    }

    // Subscribe
    if (isAuthenticated && user?.email) {
      // Authenticated user - use their email on file
      try {
        await subscribe(user.email);
      } catch (err) {
        // Error handled in hook
      }
    } else {
      // Guest - need to collect email
      setShowEmailDialog(true);
    }
  }, [
    notificationsEnabled,
    isAuthenticated,
    user?.email,
    subscribe,
    unsubscribe,
  ]);

  const handleEmailSubmit = useCallback(async () => {
    // Clear previous errors
    setEmailError(null);

    // Validate email
    if (!guestEmail.trim()) {
      setEmailError("Email address is required");
      return;
    }

    if (!validateEmail(guestEmail.trim())) {
      setEmailError("Please enter a valid email address");
      return;
    }

    setIsSubmitting(true);
    try {
      await subscribe(guestEmail.trim());
      setShowEmailDialog(false);
      setGuestEmail("");
      setEmailError(null);
    } catch (err) {
      // Error handled in hook, but set local error for dialog
      if (err instanceof Error) {
        setEmailError(err.message);
      }
    } finally {
      setIsSubmitting(false);
    }
  }, [guestEmail, validateEmail, subscribe]);

  const getBellIcon = () => {
    if (emailLoading) {
      return (
        <div className="h-5 w-5 animate-spin rounded-full border-2 border-border border-t-primary" />
      );
    }

    if (notificationsEnabled) {
      return <BellRing className="h-5 w-5" />;
    }

    return <Bell className="h-5 w-5" />;
  };

  const getBellTooltip = () => {
    if (!mounted) {
      return "Notifications";
    }
    if (notificationsEnabled) {
      return "Daily reminders enabled - Click to manage";
    }
    return "Get daily puzzle reminders - Click to enable";
  };

  if (!mounted) {
    return (
      <Button
        aria-label="Notifications"
        className="relative"
        size="icon"
        variant="ghost"
      >
        <Bell className="h-5 w-5" />
      </Button>
    );
  }

  return (
    <>
      <Popover onOpenChange={setIsOpen} open={isOpen}>
        <PopoverTrigger asChild>
          <Button
            aria-label={getBellTooltip()}
            className={cn(
              "relative transition-all duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary focus-visible:outline-offset-2",
              notificationsEnabled
                ? "text-primary hover:bg-primary/10 hover:text-primary"
                : "text-muted-foreground hover:bg-primary/10 hover:text-primary",
              emailLoading && "cursor-not-allowed opacity-50"
            )}
            disabled={emailLoading}
            size="icon"
            title={getBellTooltip()}
            variant="ghost"
          >
            {getBellIcon()}
            {unreadCount > 0 && (
              <Badge
                className="-top-1 -right-1 absolute flex h-5 w-5 items-center justify-center p-0 text-xs"
                variant="destructive"
              >
                {unreadCount > 9 ? "9+" : unreadCount}
              </Badge>
            )}
            {notificationsEnabled && unreadCount === 0 && (
              <div className="-top-1 -right-1 absolute h-2 w-2 animate-pulse rounded-full bg-primary" />
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent align="end" className="w-80 p-0">
          <div className="border-b p-4">
            <h3 className="font-semibold text-sm">Notifications</h3>
          </div>

          {/* In-app notifications section (only for authenticated users) */}
          {isAuthenticated && (
            <>
              <ScrollArea className="h-[300px]">
                {notifications.length === 0 ? (
                  <div className="p-4 text-center text-muted-foreground text-sm">
                    No new notifications
                  </div>
                ) : (
                  <div className="divide-y">
                    {notifications.map((notification) => (
                      <div
                        className="p-4 transition-colors hover:bg-muted/50"
                        key={notification.id}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <p className="font-medium text-sm">
                              {notification.title}
                            </p>
                            <p className="mt-1 text-muted-foreground text-xs">
                              {notification.message}
                            </p>
                            <p className="mt-1 text-muted-foreground text-xs">
                              {formatDistanceToNow(
                                new Date(notification.createdAt),
                                {
                                  addSuffix: true,
                                }
                              )}
                            </p>
                          </div>
                          {notification.link && (
                            <Link
                              className="text-primary text-xs hover:underline"
                              href={notification.link}
                              onClick={() => {
                                markAsRead(notification.id);
                                setIsOpen(false);
                              }}
                            >
                              View
                            </Link>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
              <Separator />
            </>
          )}

          {/* Email notification toggle section */}
          <div className="border-t p-4">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0 flex-1">
                <p className="font-medium text-sm">Email Reminders</p>
                <p className="mt-0.5 text-muted-foreground text-xs">
                  Daily puzzle notifications at 8 AM
                </p>
                {isAuthenticated && user?.email && (
                  <p className="mt-1 text-muted-foreground text-xs">
                    Using: {user.email}
                  </p>
                )}
              </div>
              <Button
                className={cn(
                  "text-xs",
                  notificationsEnabled &&
                    "bg-primary text-primary-foreground hover:bg-primary/90"
                )}
                disabled={emailLoading || isSubmitting}
                onClick={handleEmailToggle}
                size="sm"
                variant={notificationsEnabled ? "default" : "outline"}
              >
                {emailLoading || isSubmitting ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : notificationsEnabled ? (
                  "Enabled"
                ) : (
                  "Enable"
                )}
              </Button>
            </div>
          </div>
        </PopoverContent>
      </Popover>

      {/* Email Dialog for guests */}
      <Dialog onOpenChange={setShowEmailDialog} open={showEmailDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5" />
              Enable Daily Reminders
            </DialogTitle>
            <DialogDescription>
              Enter your email to receive daily puzzle notifications at 8 AM.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="guest-email">Email Address</Label>
              <Input
                autoComplete="email"
                autoFocus
                className={cn(
                  emailError && "border-destructive focus-visible:ring-destructive"
                )}
                disabled={isSubmitting || emailLoading}
                id="guest-email"
                inputMode="email"
                onChange={(e) => {
                  setGuestEmail(e.target.value);
                  setEmailError(null);
                }}
                onKeyDown={(e) => {
                  if (
                    e.key === "Enter" &&
                    !isSubmitting &&
                    guestEmail.trim() &&
                    validateEmail(guestEmail.trim())
                  ) {
                    void handleEmailSubmit();
                  }
                }}
                placeholder="your-email@example.com"
                type="email"
                value={guestEmail}
              />
              {emailError && (
                <p className="text-destructive text-sm">{emailError}</p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button
              disabled={emailLoading}
              onClick={() => {
                setShowEmailDialog(false);
                setGuestEmail("");
                setEmailError(null);
              }}
              variant="outline"
            >
              Cancel
            </Button>
            <Button
              disabled={
                !guestEmail.trim() ||
                !validateEmail(guestEmail.trim()) ||
                isSubmitting ||
                emailLoading
              }
              onClick={handleEmailSubmit}
            >
              {isSubmitting || emailLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Enabling...
                </>
              ) : (
                <>
                  <Mail className="mr-2 h-4 w-4" />
                  Enable Notifications
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
