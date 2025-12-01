"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { useToast } from "@/hooks/use-toast";

// Helper function to convert base64 URL-safe to Uint8Array
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  if (
    !base64String ||
    typeof base64String !== "string" ||
    base64String.trim().length === 0
  ) {
    throw new Error("VAPID public key is required");
  }

  try {
    const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding)
      .replace(/-/g, "+")
      .replace(/_/g, "/");

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  } catch (error) {
    console.error("Failed to decode base64 string:", error);
    throw new Error(
      "Invalid VAPID public key format. Please check your server configuration."
    );
  }
}

const STORAGE_KEYS = {
  EMAIL: "notification_email",
  SUBSCRIPTION_STATE: "notification_subscription_state",
  SUBSCRIPTION_ENDPOINT: "notification_subscription_endpoint",
};

export function useNotifications() {
  const { isAuthenticated, userId } = useAuth();
  const { toast } = useToast();
  const [hasPermission, setHasPermission] = useState(false);
  const [serviceWorkerRegistration, setServiceWorkerRegistration] =
    useState<ServiceWorkerRegistration | null>(null);
  const [pushSubscription, setPushSubscription] =
    useState<PushSubscription | null>(null);
  const [showInstructions, setShowInstructions] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [subscriptionId, setSubscriptionId] = useState<string | null>(null);
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [showEmailDialog, setShowEmailDialog] = useState(false);
  const [email, setEmail] = useState("");

  // Combined subscription management logic
  const subscriptionManager = useCallback(
    async (options: {
      subscription?: PushSubscription | null;
      currentEmail?: string;
      mode: "verify" | "subscribe";
    }) => {
      const { subscription, currentEmail, mode } = options;

      if (mode === "subscribe" && !serviceWorkerRegistration) {
        console.error(
          "[Notifications] No service worker registration available"
        );
        throw new Error("Service worker not registered");
      }

      try {
        setError(null);
        setIsLoading(true);

        if (mode === "subscribe") {
          // Get the VAPID public key
          const response = await fetch("/api/notifications/vapid-public-key");
          if (!response.ok) {
            throw new Error(
              "Failed to get VAPID public key. Push notifications may not be configured."
            );
          }

          const data = await response.json();
          const vapidPublicKey = data?.vapidPublicKey;

          if (
            !vapidPublicKey ||
            typeof vapidPublicKey !== "string" ||
            vapidPublicKey.trim().length === 0
          ) {
            throw new Error(
              "VAPID public key not configured. Please contact support."
            );
          }

          // Convert the VAPID key to Uint8Array
          let applicationServerKey: BufferSource;
          try {
            const keyArray = urlBase64ToUint8Array(vapidPublicKey);
            // Type assertion needed due to strict TypeScript checking of ArrayBuffer types
            applicationServerKey = keyArray as unknown as BufferSource;
          } catch (keyError) {
            throw new Error(
              "Invalid VAPID public key format. Please check server configuration."
            );
          }

          // Subscribe to push notifications
          const newSubscription =
            await serviceWorkerRegistration!.pushManager.subscribe({
              userVisibleOnly: true,
              applicationServerKey,
            });

          // Save the subscription on the server
          const saveResponse = await fetch("/api/notifications/subscribe", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              subscription: newSubscription.toJSON(),
              email: currentEmail,
              userId: isAuthenticated ? userId : undefined,
              sendWelcomeEmail: true,
            }),
          });

          if (!saveResponse.ok) {
            const errorData = await saveResponse.json();
            throw new Error(
              errorData.error ||
                errorData.details ||
                "Failed to save subscription"
            );
          }

          const saveData = await saveResponse.json();
          if (!saveData.success) {
            throw new Error(
              saveData.error ||
                saveData.details ||
                "Failed to save subscription"
            );
          }

          setPushSubscription(newSubscription);
          if (saveData.subscriptionId) {
            setSubscriptionId(saveData.subscriptionId);
            return saveData.subscriptionId;
          }
          throw new Error("No subscription ID returned from server");
        }
        if (mode === "verify" && subscription) {
          // Verify existing subscription
          const response = await fetch("/api/notifications/verify", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              subscription,
              email: isAuthenticated ? undefined : email,
              userId: isAuthenticated ? userId : undefined,
            }),
          });

          const data = await response.json();
          console.log("[Notifications] Verify response:", {
            status: response.status,
            data,
          });

          if (!response.ok) {
            if (response.status === 503) {
              console.error(
                "[Notifications] Push notification service not configured"
              );
              throw new Error(
                "Push notification service is not configured. Please try again later."
              );
            }

            if (response.status === 410) {
              console.log(
                "[Notifications] Subscription expired, attempting to resubscribe"
              );
              await subscription.unsubscribe();
              return subscriptionManager({
                currentEmail: email,
                mode: "subscribe",
              });
            }

            throw new Error("Failed to verify subscription");
          }

          setPushSubscription(subscription);
          setNotificationsEnabled(true);
          if (data.subscriptionId) {
            setSubscriptionId(data.subscriptionId);
            return data.subscriptionId;
          }
        }
      } catch (error) {
        console.error("[Notifications] Subscription error:", error);
        setPushSubscription(null);
        setNotificationsEnabled(false);
        // Subscription state is now managed in database
        throw error;
      } finally {
        setIsLoading(false);
      }
    },
    [serviceWorkerRegistration, isAuthenticated, userId, email]
  );

  // Initialize notifications
  useEffect(() => {
    const initializeNotifications = async () => {
      if (!("Notification" in window)) return;

      setHasPermission(Notification.permission === "granted");

      if ("serviceWorker" in navigator) {
        try {
          const registration =
            await navigator.serviceWorker.getRegistration("/");

          if (registration) {
            setServiceWorkerRegistration(registration);
            const subscription =
              await registration.pushManager.getSubscription();
            if (subscription) {
              await subscriptionManager({ subscription, mode: "verify" });
            }
          } else {
            const newRegistration = await navigator.serviceWorker.register(
              "/sw.js",
              {
                scope: "/",
                updateViaCache: "none",
              }
            );
            await navigator.serviceWorker.ready;
            setServiceWorkerRegistration(newRegistration);

            const subscription =
              await newRegistration.pushManager.getSubscription();
            if (subscription) {
              await subscriptionManager({ subscription, mode: "verify" });
            }
          }
        } catch (error) {
          console.error(
            "[Notifications] Service Worker registration failed:",
            error
          );
          setError(
            "Failed to register service worker. Please try refreshing the page."
          );
          setNotificationsEnabled(false);
          setPushSubscription(null);
          // Subscription state is now managed in database
        }
      }
    };

    void initializeNotifications();
  }, [subscriptionManager]);

  // Notification state is now managed in database
  // No localStorage needed

  const unsubscribeFromPushNotifications = async () => {
    try {
      setError(null);
      setIsLoading(true);

      if (pushSubscription) {
        await pushSubscription.unsubscribe();

        // Notify the server
        const response = await fetch("/api/notifications/unsubscribe", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            subscriptionId,
            userId: isAuthenticated ? userId : undefined,
            email: isAuthenticated ? undefined : email,
          }),
        });

        if (!response.ok) {
          throw new Error("Failed to unsubscribe on server");
        }
      }

      setPushSubscription(null);
      setSubscriptionId(null);
      setNotificationsEnabled(false);
      setEmail("");
      // Subscription state is now managed in database

      // Show success toast
      toast({
        title: "🔕 Notifications Disabled",
        description:
          "You won't receive daily puzzle reminders anymore. You can re-enable them anytime!",
        duration: 5000,
      });
    } catch (error) {
      console.error("[Notifications] Error unsubscribing:", error);
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Failed to unsubscribe from notifications";
      setError(errorMessage);

      // Show error toast
      toast({
        title: "❌ Error",
        description: errorMessage,
        variant: "destructive",
        duration: 5000,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleNotifications = async () => {
    try {
      setError(null);
      setIsLoading(true);

      if (notificationsEnabled) {
        await unsubscribeFromPushNotifications();
      } else {
        // Get the email first if not authenticated
        const currentEmail = email;

        if (!(isAuthenticated || currentEmail)) {
          setShowEmailDialog(true);
          setIsLoading(false);
          return;
        }

        // First request notification permission if needed
        if (Notification.permission !== "granted") {
          const permission = await Notification.requestPermission();
          if (permission !== "granted") {
            if (permission === "denied") {
              setShowInstructions(true);
              toast({
                title: "🔔 Permission Needed",
                description:
                  "Please allow notifications in your browser settings to receive daily puzzle reminders.",
                duration: 7000,
              });
            }
            throw new Error("Notification permission denied");
          }
          setHasPermission(true);
        }

        // Subscribe to push notifications and get the subscription ID
        const newSubscriptionId = await subscriptionManager({
          currentEmail,
          mode: "subscribe",
        });
        setNotificationsEnabled(true);

        // Show success toast
        toast({
          title: "🔔 Notifications Enabled!",
          description:
            "You'll receive daily reminders at 8 AM to play new puzzles. We're sending you a test notification now!",
          duration: 6000,
        });

        // Wait a moment for state to update
        await new Promise((resolve) => setTimeout(resolve, 500));

        // Send a test notification using the new subscription ID
        if (newSubscriptionId) {
          try {
            await handleTest(newSubscriptionId);
          } catch (testError) {
            console.warn(
              "[Notifications] Test notification failed:",
              testError
            );
            // Don't throw here - subscription is still successful
          }
        }
      }
    } catch (error) {
      console.error("[Notifications] Error toggling notifications:", error);
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Failed to toggle notifications";
      setError(errorMessage);
      setNotificationsEnabled(false);
      setPushSubscription(null);
      // Subscription state is now managed in database

      // Show error toast
      toast({
        title: "❌ Error",
        description: errorMessage,
        variant: "destructive",
        duration: 5000,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleTest = async (overrideSubscriptionId?: string) => {
    try {
      const activeSubscriptionId = overrideSubscriptionId || subscriptionId;
      if (!activeSubscriptionId) {
        throw new Error("No active subscription");
      }

      const response = await fetch("/api/notifications/test", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          subscriptionId: activeSubscriptionId,
          email: isAuthenticated ? undefined : email,
          userId: isAuthenticated ? userId : undefined,
        }),
      });

      const data = await response.json();
      if (!(response.ok && data.success)) {
        throw new Error(
          data.error || data.details || "Failed to send test notification"
        );
      }
    } catch (error) {
      console.error("[Notifications] Error testing notifications:", error);
      throw error;
    }
  };

  return {
    hasPermission,
    notificationsEnabled,
    isLoading,
    error,
    showInstructions,
    showEmailDialog,
    email,
    setEmail,
    setError,
    setShowEmailDialog,
    setShowInstructions,
    handleToggleNotifications,
    unsubscribeFromPushNotifications,
  };
}
