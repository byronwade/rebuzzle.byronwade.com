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
					<h1 className="text-3xl font-bold mb-8 text-center">Rebuzzle Blog</h1>
					<div className="text-center text-gray-600">
						<p>No blog posts available at the moment.</p>
						<p>Please check back later!</p>
						{process.env.NODE_ENV === "development" && (
							<div className="mt-4 text-sm text-left bg-gray-100 p-4 rounded">
								<p>Debug Info:</p>
								<pre>{JSON.stringify({ blogPosts }, null, 2)}</pre>
							</div>
						)}
					</div>
				</Layout>
			);
		}

		return (
			<Layout>
				<h1 className="text-3xl font-bold mb-8 text-center">Rebuzzle Blog</h1>
				<div className="space-y-8">
					{blogPosts.map((post) => (
						<BlogPost key={post.slug} post={post} />
					))}
				</div>
				{process.env.NODE_ENV === "development" && (
					<div className="mt-8 text-sm text-gray-600">
						<p>Debug Info:</p>
						<pre className="bg-gray-100 p-4 rounded">{JSON.stringify({ postCount: blogPosts.length }, null, 2)}</pre>
					</div>
				)}
			</Layout>
		);
	} catch (error) {
		console.error("Error in BlogPage:", error);
		return (
			<Layout>
				<h1 className="text-3xl font-bold mb-8 text-center">Rebuzzle Blog</h1>
				<div className="text-center text-red-600">
					<p>Sorry, we encountered an error loading the blog posts.</p>
					<p>Please try again later.</p>
					{process.env.NODE_ENV === "development" && (
						<div className="mt-4 text-sm">
							<p>Error Details:</p>
							<pre className="bg-gray-100 p-4 rounded text-left">
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
			</Layout>
		);
	}
}
