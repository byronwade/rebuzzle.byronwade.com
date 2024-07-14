// components/NotificationButton.js

import { supabase } from "shared-utils";

async function requestNotificationPermission() {
	const permission = await Notification.requestPermission();
	if (permission === "granted") {
		const registration = await navigator.serviceWorker.ready;
		const subscription = await registration.pushManager.subscribe({
			userVisibleOnly: true,
			applicationServerKey: "YOUR_PUBLIC_VAPID_KEY",
		});
		await saveSubscriptionToServer(subscription);
	}
}

async function saveSubscriptionToServer(subscription) {
	const response = await fetch("/api/save-subscription", {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
		},
		body: JSON.stringify(subscription),
	});
	if (!response.ok) {
		throw new Error("Failed to save subscription");
	}
}

export default function NotificationButton() {
	return <button onClick={requestNotificationPermission}>Enable Notifications</button>;
}
