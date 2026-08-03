"use client";

import { CheckCircle2, Loader2, Mail } from "lucide-react";
import { useEffect, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
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
    return (
      <Card className="p-6">
        <div className="mb-4 flex items-center gap-2">
          <Mail className="h-4 w-4 text-subtle" />
          <h3 className="font-semibold text-base">Email Notifications</h3>
        </div>
        <div className="h-20 animate-pulse rounded-md bg-inset" />
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <div className="mb-4 flex items-center gap-2">
        <Mail className="h-4 w-4 text-subtle" />
        <h3 className="font-semibold text-base">Email Notifications</h3>
      </div>

      <div className="space-y-4">
        {/* Description */}
        <p className="text-muted-foreground text-sm">
          Receive daily puzzle reminders around 4 PM UTC via email. We'll never spam you or share
          your email.
          {isAuthenticated && user?.email && (
            <span className="mt-1 block text-xs">
              Your account email ({user.email}) is pre-filled, but you can use a different email if
              you prefer.
            </span>
          )}
        </p>

        {/* Email Input Form */}
        <div className="space-y-2">
          <Label className="font-medium text-sm" htmlFor="notification-email">
            Email Address
          </Label>
          <div className="flex gap-2">
            <Input
              autoComplete="email"
              className={cn(
                "flex-1",
                emailError &&
                  "border-destructive/60 focus-visible:border-destructive focus-visible:ring-destructive/15"
              )}
              disabled={isSubmitting || isLoading}
              id="notification-email"
              inputMode="email"
              onChange={handleEmailChange}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !isSubmitting && email && validateEmail(email)) {
                  void handleSubscribe();
                }
              }}
              placeholder="your-email@example.com"
              type="email"
              value={email}
            />
            {enabled && (
              <div className="flex items-center gap-1 px-2 text-success">
                <CheckCircle2 aria-hidden="true" className="h-5 w-5" />
                <span className="sr-only">Subscribed</span>
              </div>
            )}
          </div>

          {/* Error Message */}
          {(emailError || error) && (
            <Alert className="py-2" variant="destructive">
              <AlertTitle className="sr-only">Error</AlertTitle>
              <AlertDescription className="text-sm">{emailError || error}</AlertDescription>
            </Alert>
          )}

          {/* Success Message */}
          {enabled && !emailError && !error && (
            <Alert className="py-2.5" variant="success">
              <AlertTitle className="sr-only">Success</AlertTitle>
              <AlertDescription className="text-foreground text-sm">
                Email notifications are enabled. You'll receive daily reminders around 4 PM UTC.
              </AlertDescription>
            </Alert>
          )}
        </div>

        {/* Action Buttons */}
        <div aria-live="polite" className="flex gap-2 pt-2">
          {enabled ? (
            <Button
              className="flex-1"
              disabled={isSubmitting || isLoading}
              onClick={handleUnsubscribe}
              variant="outline"
            >
              {isSubmitting || isLoading ? (
                <>
                  <Loader2 data-icon="inline-start" className="mr-2 h-4 w-4 animate-spin" />
                  Disabling...
                </>
              ) : (
                <>
                  <Mail data-icon="inline-start" className="mr-2 h-4 w-4" />
                  Disable Notifications
                </>
              )}
            </Button>
          ) : (
            <Button
              className="flex-1"
              disabled={!(email && validateEmail(email)) || isSubmitting || isLoading}
              onClick={handleSubscribe}
            >
              {isSubmitting || isLoading ? (
                <>
                  <Loader2 data-icon="inline-start" className="mr-2 h-4 w-4 animate-spin" />
                  Enabling...
                </>
              ) : (
                <>
                  <Mail data-icon="inline-start" className="mr-2 h-4 w-4" />
                  Enable Notifications
                </>
              )}
            </Button>
          )}
        </div>

        {/* Help Text */}
        {!enabled && (
          <p className="text-muted-foreground text-xs">
            Enter your email address above and click "Enable Notifications" to start receiving daily
            puzzle reminders.
          </p>
        )}
      </div>
    </Card>
  );
}
