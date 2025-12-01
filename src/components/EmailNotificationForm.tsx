"use client";

import { AlertCircle, CheckCircle2, Loader2, Mail } from "lucide-react";
import { useEffect, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useEmailNotifications } from "@/hooks/useEmailNotifications";
import { cn } from "@/lib/utils";

export function EmailNotificationForm() {
  const { isAuthenticated, user } = useAuth();
  const {
    enabled,
    isLoading,
    error,
    subscribe,
    unsubscribe,
    toggle,
    checkStatus,
  } = useEmailNotifications();
  const [email, setEmail] = useState("");
  const [emailError, setEmailError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [mounted, setMounted] = useState(false);

  // Get user's email from auth context if authenticated
  useEffect(() => {
    setMounted(true);
    if (isAuthenticated && user?.email) {
      setEmail(user.email);
    }
    // Check subscription status on mount
    void checkStatus();
  }, [isAuthenticated, user, checkStatus]);

  // Validate email format
  const validateEmail = (emailValue: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(emailValue);
  };

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.trim();
    setEmail(value);
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
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUnsubscribe = async () => {
    setIsSubmitting(true);
    try {
      await unsubscribe();
    } catch (err) {
      // Error handled by hook
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggle = async () => {
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
          <Mail className="h-5 w-5 text-purple-600" />
          <h3 className="font-semibold text-base">Email Notifications</h3>
        </div>
        <div className="h-20 animate-pulse rounded bg-gray-100" />
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <div className="mb-4 flex items-center gap-2">
        <Mail className="h-5 w-5 text-purple-600" />
        <h3 className="font-semibold text-base">Email Notifications</h3>
      </div>

      <div className="space-y-4">
        {/* Description */}
        <p className="text-muted-foreground text-sm">
          Receive daily puzzle reminders at 8 AM via email. We'll never spam you
          or share your email.
          {isAuthenticated && user?.email && (
            <span className="mt-1 block text-xs">
              Your account email ({user.email}) is pre-filled, but you can use a
              different email if you prefer.
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
                emailError && "border-red-500 focus-visible:ring-red-500"
              )}
              disabled={isSubmitting || isLoading}
              id="notification-email"
              inputMode="email"
              onChange={handleEmailChange}
              onKeyDown={(e) => {
                if (
                  e.key === "Enter" &&
                  !isSubmitting &&
                  email &&
                  validateEmail(email)
                ) {
                  void handleSubscribe();
                }
              }}
              placeholder="your-email@example.com"
              type="email"
              value={email}
            />
            {enabled && (
              <div className="flex items-center gap-1 px-2 text-green-600">
                <CheckCircle2 aria-hidden="true" className="h-5 w-5" />
                <span className="sr-only">Subscribed</span>
              </div>
            )}
          </div>

          {/* Error Message */}
          {(emailError || error) && (
            <Alert className="py-2" variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="text-sm">
                {emailError || error}
              </AlertDescription>
            </Alert>
          )}

          {/* Success Message */}
          {enabled && !emailError && !error && (
            <Alert className="border-green-200 bg-green-50 py-2">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800 text-sm">
                Email notifications are enabled. You'll receive daily reminders
                at 8 AM.
              </AlertDescription>
            </Alert>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2 pt-2">
          {enabled ? (
            <Button
              className="flex-1"
              disabled={isSubmitting || isLoading}
              onClick={handleUnsubscribe}
              variant="outline"
            >
              {isSubmitting || isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Disabling...
                </>
              ) : (
                <>
                  <Mail className="mr-2 h-4 w-4" />
                  Disable Notifications
                </>
              )}
            </Button>
          ) : (
            <Button
              className="flex-1 bg-purple-600 hover:bg-purple-700"
              disabled={
                !(email && validateEmail(email)) || isSubmitting || isLoading
              }
              onClick={handleSubscribe}
            >
              {isSubmitting || isLoading ? (
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
          )}
        </div>

        {/* Help Text */}
        {!enabled && (
          <p className="text-muted-foreground text-xs">
            Enter your email address above and click "Enable Notifications" to
            start receiving daily puzzle reminders.
          </p>
        )}
      </div>
    </Card>
  );
}
