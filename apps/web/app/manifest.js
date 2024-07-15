export default function manifest() {
	return {
		name: "Rebuzzle - Daily Rebus Puzzle Game",
		short_name: "Rebuzzle",
		description: "Play Rebuzzle, the daily rebus puzzle game. Unravel the picture, reveal the phrase, and challenge your mind with a new puzzle every day!",
		start_url: "/",
		display: "standalone",
		background_color: "#ffffff",
		theme_color: "#007BFF", // Assuming your theme color is blue, update if different
		icons: [
			{
				src: "/favicon-32x32.png",
				sizes: "32x32",
				type: "image/png",
			},
			{
				src: "/favicon-16x16.png",
				sizes: "16x16",
				type: "image/png",
			},
			{
				src: "/apple-touch-icon.png",
				sizes: "180x180",
				type: "image/png",
			},
			{
				src: "/favicon.ico",
				sizes: "any",
				type: "image/x-icon",
			},
		],
	};
}
