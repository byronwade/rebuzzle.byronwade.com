"use client";
import { useEffect } from "react";
import { useRouter } from "next/router";

const GA_TRACKING_ID = "G-FX184YC75H";

export const useGoogleAnalytics = () => {
	const router = useRouter();

	useEffect(() => {
		const handleRouteChange = (url) => {
			window.gtag("config", GA_TRACKING_ID, {
				page_path: url,
			});
		};
		router.events.on("routeChangeComplete", handleRouteChange);
		return () => {
			router.events.off("routeChangeComplete", handleRouteChange);
		};
	}, [router.events]);
};
