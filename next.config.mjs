/** @type {import('next').NextConfig} */
const nextConfig = {
	reactStrictMode: true,
	swcMinify: true,
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
