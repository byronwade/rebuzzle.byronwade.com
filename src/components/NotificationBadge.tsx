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
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useEmailNotifications } from "@/hooks/useEmailNotifications";
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

  useEffect(() => {
    setMounted(true);
  }, []);

  // Validate email format
  const validateEmail = useCallback((emailValue: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(emailValue);
  }, []);

  const handleEnableClick = useCallback(() => {
    if (isAuthenticated && user?.email) {
      // Authenticated user - subscribe directly
      void subscribe(user.email);
    } else {
      // Guest - need to collect email
      setShowEmailDialog(true);
    }
  }, [isAuthenticated, user?.email, subscribe]);

  const handleDisableClick = useCallback(async () => {
    try {
      await unsubscribe();
    } catch (err) {
      // Error handled in hook
    }
  }, [unsubscribe]);

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
      return "Email Reminders";
    }
    if (notificationsEnabled) {
      return "Daily reminders enabled - Click to manage";
    }
    return "Get daily puzzle reminders - Click to sign up";
  };

  if (!mounted) {
    return (
      <Button
        aria-label="Email Reminders"
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
            {notificationsEnabled && (
              <div className="-top-1 -right-1 absolute h-2 w-2 animate-pulse rounded-full bg-primary" />
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent align="end" className="w-96 p-0">
          {notificationsEnabled ? (
            // Enabled state - show confirmation and manage option
            <>
              <div className="p-6">
                <div className="mb-4 flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                    <Check className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-sm">Reminders Enabled</h3>
                    <p className="text-muted-foreground text-xs">
                      You'll receive daily puzzle reminders at 8 AM
                    </p>
                  </div>
                </div>
                {isAuthenticated && user?.email && (
                  <p className="mb-4 rounded-md bg-muted p-2 text-muted-foreground text-xs">
                    Sending to: {user.email}
                  </p>
                )}
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
                      Disable Reminders
                    </>
                  )}
                </Button>
              </div>
            </>
          ) : (
            // Not enabled - show signup/engagement content
            <>
              <div className="p-6">
                <div className="mb-4 flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                    <Sparkles className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-sm">
                      Never Miss a Puzzle
                    </h3>
                    <p className="text-muted-foreground text-xs">
                      Get daily reminders to play
                    </p>
                  </div>
                </div>

                <div className="mb-4 space-y-2 rounded-lg bg-muted/50 p-3">
                  <div className="flex items-start gap-2">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                    <p className="text-muted-foreground text-xs">
                      Daily puzzle reminders at 8 AM
                    </p>
                  </div>
                  <div className="flex items-start gap-2">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                    <p className="text-muted-foreground text-xs">
                      Build your streak and compete on leaderboards
                    </p>
                  </div>
                  <div className="flex items-start gap-2">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                    <p className="text-muted-foreground text-xs">
                      Track your progress and achievements
                    </p>
                  </div>
                </div>

                {isAuthenticated ? (
                  // Authenticated user - simple enable button
                  <>
                    {user?.email && (
                      <p className="mb-4 text-muted-foreground text-xs">
                        We'll send reminders to: {user.email}
                      </p>
                    )}
                    <Button
                      className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
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
                          Enable Daily Reminders
                        </>
                      )}
                    </Button>
                  </>
                ) : (
                  // Guest - show signup CTA
                  <>
                    <Button
                      className="mb-3 w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
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
                          Get Daily Reminders
                        </>
                      )}
                    </Button>
                    <p className="text-center text-muted-foreground text-xs">
                      Or{" "}
                      <Link
                        className="font-medium text-primary hover:underline"
                        href="/signup"
                        onClick={() => setIsOpen(false)}
                      >
                        create an account
                      </Link>{" "}
                      to track your progress
                    </p>
                  </>
                )}
              </div>
            </>
          )}
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
