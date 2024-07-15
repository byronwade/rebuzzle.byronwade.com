// components/Notification.js

import { useEffect } from "react";

const Notification = () => {
	useEffect(() => {
		if (Notification.permission !== "granted") {
			Notification.requestPermission();
		}
	}, []);

	const sendNotification = () => {
		if (Notification.permission === "granted") {
			new Notification("Daily Rebuzzle Reminder", {
				body: "Don't forget to solve today's rebus puzzle on Rebuzzle!",
			});
		}
	};

	return <button onClick={sendNotification}>Enable Daily Notifications</button>;
};

export default Notification;
