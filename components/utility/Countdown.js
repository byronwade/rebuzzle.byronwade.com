"use client";
import { useState, useEffect } from "react";

import { Badge } from "@/components/ui/badge";

const Countdown = () => {
	const [countdown, setCountdown] = useState("00:00:00");

	useEffect(() => {
		const interval = setInterval(() => {
			const now = new Date();
			const midnight = new Date(now);
			midnight.setHours(24, 0, 0, 0);
			const diff = midnight - now;
			const hours = Math.floor(diff / (1000 * 60 * 60));
			const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
			const seconds = Math.floor((diff % (1000 * 60)) / 1000);
			setCountdown(`${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`);
		}, 1000);

		return () => clearInterval(interval);
	}, []);

	return (
		<div className="text-center">
			<Badge variant="outline" className="mb-4">
				Next puzzle available in: {countdown}
			</Badge>
		</div>
	);
};

export default Countdown;
