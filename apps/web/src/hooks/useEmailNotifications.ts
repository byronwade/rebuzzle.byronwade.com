"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { useToast } from "@/hooks/use-toast";
import { fail } from "@/lib/fail";
import { withLoadingFlag } from "@/lib/with-loading-flag";

export function useEmailNotifications() {
  const { isAuthenticated, userId, user } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [enabled, setEnabled] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const checkStatus = useCallback(async () => {
    // Check localStorage for email-based subscription (for unauthenticated users)
    if (!(isAuthenticated || userId)) {
      const storedEmail = localStorage.getItem("notification_email");
      if (storedEmail) {
        // Check API with email
        try {
          const response = await fetch(
            `/api/notifications/email/status?${new URLSearchParams({
              email: storedEmail,
            })}`
          );
          if (response.ok) {
            const data = await response.json();
            setEnabled(data.enabled);
            return;
          }
        } catch (err) {
          console.error("[Notifications] Status check failed:", err);
        }
      }
      setEnabled(false);
      return;
    }

    try {
      // Check subscription status via API
      const response = await fetch(
        `/api/notifications/email/status?${new URLSearchParams({
          ...(userId ? { userId } : {}),
        })}`
      );

      if (response.ok) {
        const data = await response.json();
        setEnabled(data.enabled);
      }
    } catch (err) {
      console.error("[Notifications] Status check failed:", err);
    }
  }, [isAuthenticated, userId]);

  // Check status on mount and when auth state changes
  useEffect(() => {
    checkStatus().catch(() => {
      // Error already logged in checkStatus
    });
  }, [checkStatus]);

  const subscribe = useCallback(
    async (email?: string) => {
      setError(null);

      return await withLoadingFlag(setIsLoading, async () => {
        try {
          // For authenticated users, use their account email if no email provided
          // For unauthenticated users, email is required
          let userEmail = email;

          if (!userEmail && isAuthenticated && user?.email) {
            userEmail = user.email;
          }

          if (!(userEmail || userId)) {
            fail("Email address is required");
          }

          const response = await fetch("/api/notifications/email/subscribe", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              email: userEmail,
              userId,
            }),
          });

          if (!response.ok) {
            fail("Failed to enable email notifications");
          } else {
            const data = await response.json();

            setEnabled(true);

            // Store email in localStorage for guests so we can unsubscribe later
            if (!isAuthenticated && userEmail) {
              localStorage.setItem("notification_email", userEmail.toLowerCase().trim());
            }

            toast({
              title: "Email reminders on",
              description: "Daily puzzle email around 4 PM UTC.",
              duration: 4000,
            });

            return data.subscriptionId as string | undefined;
          }
        } catch (err) {
          const errorMessage =
            err instanceof Error ? err.message : "Failed to enable notifications";
          setError(errorMessage);
          toast({
            title: "Error",
            description: errorMessage,
            variant: "destructive",
          });
          fail(err instanceof Error ? err.message : "Failed to enable notifications");
        }
      });
    },
    [isAuthenticated, userId, user, toast]
  );

  const unsubscribe = useCallback(async () => {
    await withLoadingFlag(setIsLoading, async () => {
      try {
        setError(null);

        // For guests, get email from localStorage
        // For authenticated users, use userId
        const storedEmail = !isAuthenticated ? localStorage.getItem("notification_email") : null;

        const response = await fetch("/api/notifications/email/unsubscribe", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userId,
            email: storedEmail || (isAuthenticated && user?.email ? user.email : undefined),
          }),
        });

        if (!response.ok) {
          fail("Failed to disable email notifications");
        }

        setEnabled(false);

        // Clear stored email for guests
        if (!isAuthenticated) {
          localStorage.removeItem("notification_email");
        }

        toast({
          title: "Email reminders off",
          description: "No more daily puzzle emails.",
          duration: 3000,
        });
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "Failed to disable notifications";
        setError(errorMessage);
        toast({
          title: "Error",
          description: errorMessage,
          variant: "destructive",
        });
      }
    });
  }, [isAuthenticated, userId, user, toast]);

  const toggle = useCallback(
    async (email?: string) => {
      if (enabled) {
        await unsubscribe();
      } else {
        // For authenticated users, we can use their account email
        // For unauthenticated users, email must be provided
        if (!(isAuthenticated || userId || email)) {
          fail("Email address is required to enable notifications");
        }
        await subscribe(email);
      }
    },
    [enabled, subscribe, unsubscribe, isAuthenticated, userId]
  );

  return {
    enabled,
    isLoading,
    error,
    subscribe,
    unsubscribe,
    toggle,
    checkStatus,
  };
}
