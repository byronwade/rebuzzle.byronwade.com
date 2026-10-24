"use client";

import { CheckCircle2, Loader2, Mail } from "lucide-react";
import { useEffect, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useEmailNotifications } from "@/hooks/useEmailNotifications";
import { useIsClient } from "@/lib/hooks/use-is-client";
import { cn } from "@/lib/utils";

export function EmailNotificationForm() {
  const { isAuthenticated, user } = useAuth();
  const { enabled, isLoading, error, subscribe, unsubscribe, toggle, checkStatus } =
    useEmailNotifications();
  const authEmail = isAuthenticated && user?.email ? user.email : "";
  const [emailOverride, setEmailOverride] = useState<string | null>(null);
  const email = emailOverride ?? authEmail;
  const [emailError, setEmailError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const mounted = useIsClient();

  useEffect(() => {
    void checkStatus();
  }, [checkStatus]);

  // Validate email format
  const validateEmail = (emailValue: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(emailValue);
  };

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.trim();
    setEmailOverride(value);
    setEmailError(null);

    // Real-time validation
    if (value && !validateEmail(value)) {
      setEmailError("Please enter a valid email address");
    }
  };

  const handleSubscribe = async () => {
    // Clear previous errors
    setEmailError(null);

    // Validate email
    if (!email) {
      setEmailError("Email address is required");
      return;
    }

    if (!validateEmail(email)) {
      setEmailError("Please enter a valid email address");
      return;
    }

    setIsSubmitting(true);
    try {
      await subscribe(email);
      // Success - email is set and subscription is enabled
    } catch (err) {
      // Error is handled by the hook (toast notification)
      // But we can also set local error state if needed
      if (err instanceof Error) {
        setEmailError(err.message);
      }
    }
    setIsSubmitting(false);
  };

  const handleUnsubscribe = async () => {
    setIsSubmitting(true);
    try {
      await unsubscribe();
    } catch (_err) {
      // Error handled by hook
    }
    setIsSubmitting(false);
  };

  const _handleToggle = async () => {
    if (enabled) {
      await handleUnsubscribe();
    } else {
      // If no email is set, require email input
      if (!email) {
        setEmailError("Email address is required");
        return;
      }
      await handleSubscribe();
    }
  };

  if (!mounted) {
    return <div aria-hidden className="h-[4.5rem] animate-pulse rounded-md bg-inset" />;
  }

  const busy = isSubmitting || isLoading;

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-2 sm:flex-row">
        <Label className="sr-only" htmlFor="notification-email">
          Email address
        </Label>
        <Input
          autoComplete="email"
          className={cn(
            "flex-1",
            emailError &&
              "border-destructive/60 focus-visible:border-destructive focus-visible:ring-destructive/15"
          )}
          disabled={busy || enabled}
          id="notification-email"
          inputMode="email"
          onChange={handleEmailChange}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !isSubmitting && email && validateEmail(email)) {
              void handleSubscribe();
            }
          }}
          placeholder="you@example.com…"
          spellCheck={false}
          type="email"
          value={email}
        />
        <div aria-live="polite" className="contents">
          {enabled ? (
            <Button disabled={busy} onClick={handleUnsubscribe} variant="outline">
              {busy ? (
                <Loader2 aria-hidden className="h-4 w-4 animate-spin" data-icon="inline-start" />
              ) : null}
              Turn off
            </Button>
          ) : (
            <Button disabled={!(email && validateEmail(email)) || busy} onClick={handleSubscribe}>
              {busy ? (
                <Loader2 aria-hidden className="h-4 w-4 animate-spin" data-icon="inline-start" />
              ) : (
                <Mail aria-hidden className="h-4 w-4" data-icon="inline-start" />
              )}
              Remind me
            </Button>
          )}
        </div>
      </div>

      {emailError || error ? (
        <p className="text-destructive text-xs" role="alert">
          {emailError || error}
        </p>
      ) : enabled ? (
        <p className="flex items-center gap-1.5 text-success text-xs">
          <CheckCircle2 aria-hidden className="h-3.5 w-3.5" />
          Reminders on. One email a day, around 4 PM UTC.
        </p>
      ) : (
        <p className="text-muted-foreground text-xs">
          One email a day, around 4 PM UTC. Never shared, never spam.
        </p>
      )}
    </div>
  );
}
