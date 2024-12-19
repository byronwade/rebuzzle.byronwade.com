/** @type {import('next').NextConfig} */
const nextConfig = {
	env: {
		CLERK_DEBUG: "false",
		CLERK_LOGGING_ENABLED: "false",
		CLERK_LOGGING: "false",
	},
	clerk: {
		debug: false,
		logging: false,
	},
	// ... other config options
};

module.exports = nextConfig;
