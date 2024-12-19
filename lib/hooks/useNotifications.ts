"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/components/AuthProvider";
import { useClerk } from "@clerk/nextjs";

// Helper function to convert base64 URL-safe to Uint8Array
function urlBase64ToUint8Array(base64String: string) {
	const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
	const base64 = (base64String + padding).replace(/\-/g, "+").replace(/_/g, "/");

	const rawData = window.atob(base64);
	const outputArray = new Uint8Array(rawData.length);

	for (let i = 0; i < rawData.length; ++i) {
		outputArray[i] = rawData.charCodeAt(i);
	}
	return outputArray;
}

const STORAGE_KEYS = {
	EMAIL: "notification_email",
	SUBSCRIPTION_STATE: "notification_subscription_state",
	SUBSCRIPTION_ENDPOINT: "notification_subscription_endpoint",
};

export function useNotifications() {
	const { isAuthenticated, userId } = useAuth();
	const { user } = useClerk();
	const [hasPermission, setHasPermission] = useState(false);
	const [serviceWorkerRegistration, setServiceWorkerRegistration] = useState<ServiceWorkerRegistration | null>(null);
	const [pushSubscription, setPushSubscription] = useState<PushSubscription | null>(null);
	const [showInstructions, setShowInstructions] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [isLoading, setIsLoading] = useState(false);
	const [subscriptionId, setSubscriptionId] = useState<string | null>(null);
	const [notificationsEnabled, setNotificationsEnabled] = useState(() => {
		if (typeof window !== "undefined") {
			return localStorage.getItem(STORAGE_KEYS.SUBSCRIPTION_STATE) === "true";
		}
		return false;
	});
	const [showEmailDialog, setShowEmailDialog] = useState(false);
	const [email, setEmail] = useState(() => {
		if (typeof window !== "undefined") {
			return localStorage.getItem(STORAGE_KEYS.EMAIL) || "";
		}
		return "";
	});

	// Combined subscription management logic
	const subscriptionManager = useCallback(
		async (options: { subscription?: PushSubscription | null; currentEmail?: string; mode: "verify" | "subscribe" }) => {
			const { subscription, currentEmail, mode } = options;

			if (mode === "subscribe" && !serviceWorkerRegistration) {
				console.error("[Notifications] No service worker registration available");
				throw new Error("Service worker not registered");
			}

			try {
				setError(null);
				setIsLoading(true);

				if (mode === "subscribe") {
					// Get the VAPID public key
					const response = await fetch("/api/notifications/vapid-public-key");
					if (!response.ok) {
						throw new Error("Failed to get VAPID public key");
					}

					const { vapidPublicKey } = await response.json();
					if (!vapidPublicKey) {
						throw new Error("VAPID public key not found");
					}

					// Convert the VAPID key to Uint8Array
					const applicationServerKey = urlBase64ToUint8Array(vapidPublicKey);

					// Subscribe to push notifications
					const newSubscription = await serviceWorkerRegistration!.pushManager.subscribe({
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
						throw new Error(errorData.error || errorData.details || "Failed to save subscription");
					}

					const saveData = await saveResponse.json();
					if (!saveData.success) {
						throw new Error(saveData.error || saveData.details || "Failed to save subscription");
					}

					setPushSubscription(newSubscription);
					if (saveData.subscriptionId) {
						setSubscriptionId(saveData.subscriptionId);
						return saveData.subscriptionId;
					}
					throw new Error("No subscription ID returned from server");
				} else if (mode === "verify" && subscription) {
					// Verify existing subscription
					const response = await fetch("/api/notifications/verify", {
						method: "POST",
						headers: {
							"Content-Type": "application/json",
						},
						body: JSON.stringify({
							subscription,
							email: !isAuthenticated ? email : undefined,
							userId: isAuthenticated ? userId : undefined,
						}),
					});

					const data = await response.json();
					console.log("[Notifications] Verify response:", { status: response.status, data });

					if (!response.ok) {
						if (response.status === 503) {
							console.error("[Notifications] Push notification service not configured");
							throw new Error("Push notification service is not configured. Please try again later.");
						}

						if (response.status === 410) {
							console.log("[Notifications] Subscription expired, attempting to resubscribe");
							await subscription.unsubscribe();
							return subscriptionManager({ currentEmail: email, mode: "subscribe" });
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
				localStorage.removeItem(STORAGE_KEYS.SUBSCRIPTION_STATE);
				localStorage.removeItem(STORAGE_KEYS.SUBSCRIPTION_ENDPOINT);
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
					const registration = await navigator.serviceWorker.getRegistration("/");

					if (!registration) {
						const newRegistration = await navigator.serviceWorker.register("/sw.js", {
							scope: "/",
							updateViaCache: "none",
						});
						await navigator.serviceWorker.ready;
						setServiceWorkerRegistration(newRegistration);

						const subscription = await newRegistration.pushManager.getSubscription();
						if (subscription) {
							await subscriptionManager({ subscription, mode: "verify" });
						}
					} else {
						setServiceWorkerRegistration(registration);
						const subscription = await registration.pushManager.getSubscription();
						if (subscription) {
							await subscriptionManager({ subscription, mode: "verify" });
						}
					}
				} catch (error) {
					console.error("[Notifications] Service Worker registration failed:", error);
					setError("Failed to register service worker. Please try refreshing the page.");
					setNotificationsEnabled(false);
					setPushSubscription(null);
					localStorage.removeItem(STORAGE_KEYS.SUBSCRIPTION_STATE);
					localStorage.removeItem(STORAGE_KEYS.SUBSCRIPTION_ENDPOINT);
				}
			}
		};

		void initializeNotifications();
	}, [subscriptionManager]);

	// Save notification state to localStorage
	useEffect(() => {
		if (notificationsEnabled) {
			localStorage.setItem(STORAGE_KEYS.SUBSCRIPTION_STATE, "true");
			if (pushSubscription?.endpoint) {
				localStorage.setItem(STORAGE_KEYS.SUBSCRIPTION_ENDPOINT, pushSubscription.endpoint);
			}
		} else {
			localStorage.removeItem(STORAGE_KEYS.SUBSCRIPTION_STATE);
			localStorage.removeItem(STORAGE_KEYS.SUBSCRIPTION_ENDPOINT);
		}
	}, [notificationsEnabled, pushSubscription]);

	// Save email to localStorage when it changes
	useEffect(() => {
		if (email) {
			localStorage.setItem(STORAGE_KEYS.EMAIL, email);
		} else {
			localStorage.removeItem(STORAGE_KEYS.EMAIL);
		}
	}, [email]);

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
						email: !isAuthenticated ? email : undefined,
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
			localStorage.removeItem(STORAGE_KEYS.SUBSCRIPTION_STATE);
			localStorage.removeItem(STORAGE_KEYS.SUBSCRIPTION_ENDPOINT);
			localStorage.removeItem(STORAGE_KEYS.EMAIL);
		} catch (error) {
			console.error("[Notifications] Error unsubscribing:", error);
			setError(error instanceof Error ? error.message : "Failed to unsubscribe from notifications");
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
				// Get the email first
				let currentEmail = isAuthenticated && user ? user.primaryEmailAddress?.emailAddress : email;

				if (!currentEmail) {
					setShowEmailDialog(true);
					return;
				}

				// First request notification permission if needed
				if (Notification.permission !== "granted") {
					const permission = await Notification.requestPermission();
					if (permission !== "granted") {
						throw new Error("Notification permission denied");
					}
					setHasPermission(true);
				}

				// Subscribe to push notifications and get the subscription ID
				const newSubscriptionId = await subscriptionManager({ currentEmail, mode: "subscribe" });
				setNotificationsEnabled(true);

				// Wait a moment for state to update
				await new Promise((resolve) => setTimeout(resolve, 100));

				// Send a test notification using the new subscription ID
				if (newSubscriptionId) {
					await handleTest(newSubscriptionId);
				}
			}
		} catch (error) {
			console.error("[Notifications] Error toggling notifications:", error);
			setError(error instanceof Error ? error.message : "Failed to toggle notifications");
			setNotificationsEnabled(false);
			setPushSubscription(null);
			localStorage.removeItem(STORAGE_KEYS.SUBSCRIPTION_STATE);
			localStorage.removeItem(STORAGE_KEYS.SUBSCRIPTION_ENDPOINT);
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
					email: !isAuthenticated ? email : undefined,
					userId: isAuthenticated ? userId : undefined,
				}),
			});

			const data = await response.json();
			if (!response.ok || !data.success) {
				throw new Error(data.error || data.details || "Failed to send test notification");
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
		setShowEmailDialog,
		setShowInstructions,
		handleToggleNotifications,
		unsubscribeFromPushNotifications,
	};
}
