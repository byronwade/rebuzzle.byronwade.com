"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { useToast } from "@/hooks/use-toast";

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
      try {
        setError(null);
        setIsLoading(true);

        // For authenticated users, use their account email if no email provided
        // For unauthenticated users, email is required
        let userEmail = email;

        if (!userEmail && isAuthenticated && user?.email) {
          userEmail = user.email;
        }

        if (!(userEmail || userId)) {
          throw new Error("Email address is required");
        }

        const response = await fetch("/api/notifications/email/subscribe", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: userEmail,
            userId,
          }),
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || "Failed to enable email notifications");
        }

        setEnabled(true);

        // Store email in localStorage for guests so we can unsubscribe later
        if (!isAuthenticated && userEmail) {
          localStorage.setItem("notification_email", userEmail.toLowerCase().trim());
        }

        toast({
          title: "✅ Email Notifications Enabled!",
          description: "You'll receive daily puzzle reminders at 8 AM via email.",
          duration: 5000,
        });

        return data.subscriptionId;
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "Failed to enable notifications";
        setError(errorMessage);
        toast({
          title: "Error",
          description: errorMessage,
          variant: "destructive",
        });
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [isAuthenticated, userId, user, toast]
  );

  const unsubscribe = useCallback(async () => {
    try {
      setError(null);
      setIsLoading(true);

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

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to disable email notifications");
      }

      setEnabled(false);

      // Clear stored email for guests
      if (!isAuthenticated) {
        localStorage.removeItem("notification_email");
      }

      toast({
        title: "Email Notifications Disabled",
        description: "You won't receive daily puzzle reminders anymore.",
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
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated, userId, user?.email, toast]);

  const toggle = useCallback(
    async (email?: string) => {
      if (enabled) {
        await unsubscribe();
      } else {
        // For authenticated users, we can use their account email
        // For unauthenticated users, email must be provided
        if (!(isAuthenticated || userId || email)) {
          throw new Error("Email address is required to enable notifications");
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
