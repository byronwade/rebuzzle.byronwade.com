// lib/gtag.js
export const GA_TRACKING_ID = "G-FX184YC75H";

// Track custom events
export const trackEvent = ({ action, category, label, value }) => {
	if (window.gtag) {
		window.gtag("event", action, {
			event_category: category,
			event_label: label,
			value: value,
		});
	}
};
