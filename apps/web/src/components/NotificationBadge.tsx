"use client";

import { Bell, BellRing, Check, Loader2, Mail, Sparkles } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
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
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useEmailNotifications } from "@/hooks/useEmailNotifications";
import { useInAppNotifications } from "@/hooks/useInAppNotifications";
import {
  dailyReminderDialogBlurb,
  dailyReminderEnabledBlurb,
  PUZZLE_EMAIL_REMINDER_SHORT,
} from "@/lib/game/reminder-copy";
import { cn } from "@/lib/utils";
import { useAuth } from "./AuthProvider";

export function NotificationBadge() {
  const { isAuthenticated, user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [showEmailDialog, setShowEmailDialog] = useState(false);
  const [guestEmail, setGuestEmail] = useState("");
  const [emailError, setEmailError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    enabled: notificationsEnabled,
    isLoading: emailLoading,
    subscribe,
    unsubscribe,
  } = useEmailNotifications();
  const {
    notifications: inbox,
    unreadCount,
    refresh: refreshInbox,
    markRead,
  } = useInAppNotifications(isAuthenticated);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (isOpen && isAuthenticated) {
      void refreshInbox();
    }
  }, [isOpen, isAuthenticated, refreshInbox]);

  // Validate email format
  const validateEmail = useCallback((emailValue: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(emailValue);
  }, []);

  const handleEnableClick = useCallback(async () => {
    // Prevent rapid clicks
    if (isSubmitting || emailLoading) return;

    if (isAuthenticated && user?.email) {
      // Authenticated user - subscribe directly
      setIsSubmitting(true);
      try {
        await subscribe(user.email);
      } finally {
        setIsSubmitting(false);
      }
    } else {
      // Guest - need to collect email
      setShowEmailDialog(true);
    }
  }, [isAuthenticated, user?.email, subscribe, isSubmitting, emailLoading]);

  const handleDisableClick = useCallback(async () => {
    // Prevent rapid clicks
    if (isSubmitting || emailLoading) return;

    setIsSubmitting(true);
    try {
      await unsubscribe();
    } catch (_err) {
      // Error handled in hook
    } finally {
      setIsSubmitting(false);
    }
  }, [unsubscribe, isSubmitting, emailLoading]);

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
    if (unreadCount > 0) {
      return `${unreadCount} unread notification${unreadCount === 1 ? "" : "s"}`;
    }
    if (notificationsEnabled) {
      return "Notifications · daily email on";
    }
    return "Notifications · get daily email reminders";
  };

  if (!mounted) {
    return (
      <Button aria-label="Email Reminders" className="relative" size="icon" variant="ghost">
        <Bell className="h-5 w-5" />
      </Button>
    );
  }

  return (
    <TooltipProvider delayDuration={300}>
      <Popover onOpenChange={setIsOpen} open={isOpen}>
        <Tooltip>
          <TooltipTrigger asChild>
            <PopoverTrigger asChild>
              <Button
                aria-label={getBellTooltip()}
                className={cn(
                  "relative h-9 w-9 rounded-full transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary focus-visible:outline-offset-2",
                  "text-muted-foreground hover:bg-muted hover:text-foreground",
                  emailLoading && "cursor-not-allowed opacity-50"
                )}
                disabled={emailLoading}
                size="icon"
                variant="ghost"
              >
                {getBellIcon()}
                {unreadCount > 0 ? (
                  <span className="-top-0.5 -right-0.5 absolute h-1.5 w-1.5 rounded-full bg-foreground/70" />
                ) : null}
              </Button>
            </PopoverTrigger>
          </TooltipTrigger>
          <TooltipContent>{getBellTooltip()}</TooltipContent>
        </Tooltip>
        <PopoverContent align="end" className="w-[min(24rem,calc(100vw-1.5rem))] p-0">
          <div className="border-border border-b px-4 py-3">
            <h3 className="font-medium text-sm">Inbox</h3>
            <p className="mt-0.5 text-muted-foreground text-xs">{dailyReminderEnabledBlurb()}</p>
          </div>

          {isAuthenticated && (
            <div className="max-h-48 overflow-y-auto border-border border-b">
              {inbox.length === 0 ? (
                <p className="px-4 py-4 text-muted-foreground text-xs">Nothing new.</p>
              ) : (
                <ul className="divide-y divide-border">
                  {inbox.map((item) => (
                    <li key={item.id}>
                      <button
                        className="flex w-full flex-col gap-0.5 px-4 py-3 text-left transition-colors hover:bg-muted/50"
                        onClick={() => {
                          void markRead(item.id);
                          if (item.link) {
                            window.location.href = item.link;
                          }
                        }}
                        type="button"
                      >
                        <span className="font-medium text-foreground text-xs">{item.title}</span>
                        <span className="line-clamp-2 text-muted-foreground text-xs">
                          {item.message}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          <div className="p-4">
            {notificationsEnabled ? (
              <>
                <div className="mb-3 flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10">
                    <Check className="h-4 w-4 text-primary" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-sm">Email reminders on</p>
                    <p className="text-muted-foreground text-xs">
                      Around {PUZZLE_EMAIL_REMINDER_SHORT}
                      {user?.email ? ` · ${user.email}` : ""}
                    </p>
                  </div>
                </div>
                <Button
                  className="w-full"
                  disabled={emailLoading}
                  onClick={handleDisableClick}
                  size="sm"
                  variant="outline"
                >
                  {emailLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Disabling...
                    </>
                  ) : (
                    <>
                      <Bell className="mr-2 h-4 w-4" />
                      Disable email reminders
                    </>
                  )}
                </Button>
              </>
            ) : (
              <>
                <div className="mb-3 flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10">
                    <Sparkles className="h-4 w-4 text-primary" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-sm">Never miss a puzzle</p>
                    <p className="text-muted-foreground text-xs">
                      Daily email around {PUZZLE_EMAIL_REMINDER_SHORT}
                    </p>
                  </div>
                </div>
                <Button
                  className="w-full"
                  disabled={emailLoading}
                  onClick={handleEnableClick}
                  size="sm"
                >
                  {emailLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Enabling...
                    </>
                  ) : (
                    <>
                      <Mail className="mr-2 h-4 w-4" />
                      Enable daily reminders
                    </>
                  )}
                </Button>
                {!isAuthenticated && (
                  <p className="mt-3 text-center text-muted-foreground text-xs">
                    Or{" "}
                    <Link
                      className="font-medium text-primary hover:underline"
                      href="/signup"
                      onClick={() => setIsOpen(false)}
                    >
                      create an account
                    </Link>
                  </p>
                )}
              </>
            )}
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
            <DialogDescription>{dailyReminderDialogBlurb()}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="guest-email">Email Address</Label>
              <Input
                autoComplete="email"
                autoFocus
                className={cn(emailError && "border-destructive focus-visible:ring-destructive")}
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
              {emailError && <p className="text-destructive text-sm">{emailError}</p>}
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
    </TooltipProvider>
  );
}
