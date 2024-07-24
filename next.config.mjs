import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
	reactStrictMode: true,
	experimental: {
		//ppr: "incremental",
		turbo: {
			resolveAlias: {
				"@components": path.resolve(__dirname, "src/components"),
				"@utils": path.resolve(__dirname, "src/lib/utils"),
				"@lib": path.resolve(__dirname, "src/lib"),
				"@styles": path.resolve(__dirname, "src/styles"),
				"@context": path.resolve(__dirname, "src/context"),
				"@hooks": path.resolve(__dirname, "src/hooks"),
				"@emails": path.resolve(__dirname, "src/emails"),
				"@stores": path.resolve(__dirname, "src/stores"),
			},
			resolveExtensions: [".js", ".jsx", ".ts", ".tsx", ".json"],
		},
	},
	env: {
		NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
		NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
		SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
		SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
	},
	images: {
		remotePatterns: [
			{
				protocol: "https",
				hostname: "rebuzzle.vercel.app",
				port: "",
				pathname: "**",
			},
			{
				protocol: "https",
				hostname: "wdiuscbddaxckemvrvva.supabase.co",
				port: "",
				pathname: "**",
			},
			{
				protocol: "https",
				hostname: "example.com",
				port: "",
				pathname: "**",
			},
		],
	},
};

export default nextConfig;
