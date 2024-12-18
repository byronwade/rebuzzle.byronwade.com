"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Bell, BellOff, Send } from "lucide-react";
import { requestNotificationPermission } from "@/lib/notifications";

export function NotificationButton() {
	const [notificationsEnabled, setNotificationsEnabled] = useState<boolean>(false);

	useEffect(() => {
		async function initializeNotifications() {
			try {
				// Check if notifications are already enabled
				if ("Notification" in window) {
					setNotificationsEnabled(Notification.permission === "granted");
				}

				// Register service worker
				if ("serviceWorker" in navigator) {
					const registration = await navigator.serviceWorker.register("/sw.js", {
						scope: "/",
					});
					console.log("Service Worker registered:", registration.scope);
				}
			} catch (error) {
				console.error("Error initializing notifications:", error);
			}
		}

		void initializeNotifications();
	}, []);

	const handleClick = async () => {
		try {
			const granted = await requestNotificationPermission();
			setNotificationsEnabled(granted);

			if (granted) {
				// Show a native notification instead of toast
				new Notification("Notifications enabled", {
					body: "You'll receive a notification at 8am when a new puzzle is available.",
					icon: "/icon-192x192.png",
				});
			}
		} catch (error) {
			console.error("Error enabling notifications:", error);
			// Show error as native notification
			new Notification("Error", {
				body: "There was a problem enabling notifications. Please try again.",
				icon: "/icon-192x192.png",
			});
		}
	};

	const handleTest = async () => {
		try {
			const response = await fetch("/api/notifications/test", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
			});

			const data = await response.json();

			if (!data.success) {
				// Show error as native notification
				new Notification("Error", {
					body: data.error || "Please try again.",
					icon: "/icon-192x192.png",
				});
			}
		} catch (error) {
			console.error("Error testing notifications:", error);
			// Show error as native notification
			new Notification("Error", {
				body: "There was a problem sending the test notification.",
				icon: "/icon-192x192.png",
			});
		}
	};

	return (
		<div className="flex gap-2">
			<Button variant="ghost" size="icon" onClick={handleClick} title={notificationsEnabled ? "Notifications enabled" : "Enable notifications"}>
				{notificationsEnabled ? <Bell className="h-5 w-5" /> : <BellOff className="h-5 w-5" />}
			</Button>
			{notificationsEnabled && (
				<Button variant="ghost" size="icon" onClick={handleTest} title="Send test notification">
					<Send className="h-5 w-5" />
				</Button>
			)}
		</div>
	);
}
