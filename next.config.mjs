import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
	reactStrictMode: true,
	images: {
		remotePatterns: [
			{
				protocol: "https",
				hostname: "**",
			},
		],
	},
	experimental: {
		serverActions: true,
		typedRoutes: true,
		serverComponentsExternalPackages: ["sharp"],
		optimizePackageImports: ["@radix-ui/react-icons", "lucide-react", "recharts", "@emotion/react", "framer-motion"],
		ppr: true,
		taint: true,
		webVitalsAttribution: ["CLS", "LCP", "FCP", "FID", "TTFB", "INP"],
	},
	logging: {
		fetches: {
			fullUrl: true,
		},
	},
	typescript: {
		ignoreBuildErrors: false,
	},
	webpack: (config) => {
		config.optimization.moduleIds = "deterministic";
		config.optimization.runtimeChunk = "single";
		config.optimization.splitChunks = {
			chunks: "all",
			maxInitialRequests: 25,
			minSize: 20000,
		};
		return config;
	},
	httpAgentOptions: {
		keepAlive: true,
	},
	compress: true,
	poweredByHeader: false,
	generateEtags: true,
};

export default nextConfig;
