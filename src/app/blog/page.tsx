import type { Metadata } from "next";
import Layout from "@/components/Layout";
import BlogPost from "@/components/BlogPost";
import { fetchBlogPosts } from "../actions/blogActions";

export const metadata: Metadata = {
	title: "Rebuzzle Blog - Daily Puzzle Insights",
	description: "Explore the thought process behind our daily rebus puzzles and learn more about the Rebuzzle game.",
	keywords: ["rebus", "puzzle", "blog", "insights", "daily challenge"],
	openGraph: {
		title: "Rebuzzle Blog - Daily Puzzle Insights",
		description: "Explore the thought process behind our daily rebus puzzles and learn more about the Rebuzzle game.",
		url: "https://rebuzzle.com/blog",
		siteName: "Rebuzzle",
		images: [
			{
				url: "/og-image.jpg",
				width: 1200,
				height: 630,
			},
		],
		locale: "en_US",
		type: "website",
	},
	twitter: {
		card: "summary_large_image",
		title: "Rebuzzle Blog - Daily Puzzle Insights",
		description: "Explore the thought process behind our daily rebus puzzles and learn more about the Rebuzzle game.",
		images: ["/twitter-image.jpg"],
	},
	alternates: {
		canonical: "https://rebuzzle.com/blog",
	},
};

export default async function BlogPage() {
	try {
		console.log("Fetching blog posts for page...");
		const blogPosts = await fetchBlogPosts();
		console.log(`Received ${blogPosts?.length || 0} blog posts for page`);

		// Add more detailed logging for debugging
		if (blogPosts?.length > 0) {
			console.log(
				"Blog posts:",
				JSON.stringify(
					blogPosts.map((post) => ({
						title: post.title,
						date: post.date,
						slug: post.slug,
					})),
					null,
					2
				)
			);
		}

		if (!blogPosts || blogPosts.length === 0) {
			console.log("No blog posts available for rendering");
			return (
				<Layout>
					<div className="min-h-screen bg-slate-50 px-4 py-8">
						<div className="max-w-4xl mx-auto">
							{/* Header */}
							<div className="text-center mb-12">
								<h1 className="text-4xl font-bold text-gray-800 mb-4">Rebuzzle Blog</h1>
								<p className="text-lg text-gray-600">Daily puzzle insights and game tips</p>
							</div>

							{/* Empty state */}
							<div className="bg-white rounded-3xl shadow-lg border border-gray-100 p-12 text-center">
								<div className="w-20 h-20 mx-auto bg-gray-100 rounded-full flex items-center justify-center mb-6">
									<svg className="w-10 h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
									</svg>
								</div>
								<h2 className="text-2xl font-bold text-gray-800 mb-2">No Blog Posts Yet</h2>
								<p className="text-gray-600 mb-6">We're working on some great content for you!</p>
								<p className="text-sm text-gray-500">Check back soon for puzzle insights and tips.</p>

								{process.env.NODE_ENV === "development" && (
									<div className="mt-8 text-left bg-gray-50 p-4 rounded-xl border border-gray-200">
										<p className="text-sm font-medium text-gray-700 mb-2">Debug Info:</p>
										<pre className="text-xs text-gray-600 overflow-auto">{JSON.stringify({ blogPosts }, null, 2)}</pre>
									</div>
								)}
							</div>
						</div>
					</div>
				</Layout>
			);
		}

		return (
			<Layout>
				<div className="min-h-screen bg-slate-50 px-4 py-8">
					<div className="max-w-4xl mx-auto">
						{/* Header */}
						<div className="text-center mb-12">
							<h1 className="text-4xl font-bold text-gray-800 mb-4">Rebuzzle Blog</h1>
							<p className="text-lg text-gray-600">Daily puzzle insights and game tips</p>
						</div>

						{/* Blog posts grid */}
						<div className="space-y-8">
							{blogPosts.map((post) => (
								<BlogPost key={post.slug} post={post} />
							))}
						</div>

						{process.env.NODE_ENV === "development" && (
							<div className="mt-12 bg-white rounded-2xl p-6 border border-gray-200">
								<p className="text-sm font-medium text-gray-700 mb-2">Debug Info:</p>
								<pre className="text-xs text-gray-600 bg-gray-50 p-4 rounded-lg overflow-auto">{JSON.stringify({ postCount: blogPosts.length }, null, 2)}</pre>
							</div>
						)}
					</div>
				</div>
			</Layout>
		);
	} catch (error) {
		console.error("Error in BlogPage:", error);
		return (
			<Layout>
				<div className="min-h-screen bg-slate-50 px-4 py-8">
					<div className="max-w-4xl mx-auto">
						{/* Header */}
						<div className="text-center mb-12">
							<h1 className="text-4xl font-bold text-gray-800 mb-4">Rebuzzle Blog</h1>
							<p className="text-lg text-gray-600">Daily puzzle insights and game tips</p>
						</div>

						{/* Error state */}
						<div className="bg-white rounded-3xl shadow-lg border border-gray-100 p-12 text-center">
							<div className="w-20 h-20 mx-auto bg-red-100 rounded-full flex items-center justify-center mb-6">
								<svg className="w-10 h-10 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
								</svg>
							</div>
							<h2 className="text-2xl font-bold text-red-600 mb-2">Oops! Something went wrong</h2>
							<p className="text-gray-600 mb-6">We encountered an error loading the blog posts.</p>
							<a href="/blog" className="inline-block px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-semibold transition-colors duration-200">
								Try Again
							</a>

							{process.env.NODE_ENV === "development" && (
								<div className="mt-8 text-left bg-red-50 p-4 rounded-xl border border-red-200">
									<p className="text-sm font-medium text-red-700 mb-2">Error Details:</p>
									<pre className="text-xs text-red-600 overflow-auto">
										{error instanceof Error
											? JSON.stringify(
													{
														message: error.message,
														stack: error.stack,
													},
													null,
													2
												)
											: "Unknown error"}
									</pre>
								</div>
							)}
						</div>
					</div>
				</div>
			</Layout>
		);
	}
}
