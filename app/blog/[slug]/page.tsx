import type { Metadata } from "next";
import Layout from "@/components/Layout";
import { fetchBlogPost } from "../../actions/blogActions";
import { notFound } from "next/navigation";
import BlogPostContent from "@/components/BlogPostContent";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
	try {
		const { slug } = await params;
		const post = await fetchBlogPost(slug);
		if (!post) {
			return {
				title: "Not Found - Rebuzzle Blog",
				description: "The requested blog post could not be found.",
			};
		}

		const metadata = {
			title: `${post.title} - Rebuzzle Blog`,
			description: post.excerpt || post.explanation,
			openGraph: {
				title: `${post.title} - Rebuzzle Blog`,
				description: post.excerpt || post.explanation,
				url: `https://rebuzzle.com/blog/${post.slug}`,
				siteName: "Rebuzzle",
				images: [
					{
						url: "/og-image.jpg",
						width: 1200,
						height: 630,
					},
				],
				locale: "en_US",
				type: "article",
			},
			twitter: {
				card: "summary_large_image",
				title: `${post.title} - Rebuzzle Blog`,
				description: post.excerpt || post.explanation,
				images: ["/twitter-image.jpg"],
			},
			alternates: {
				canonical: `https://rebuzzle.com/blog/${post.slug}`,
			},
		} satisfies Metadata;

		return metadata;
	} catch (error) {
		console.error("Error generating metadata:", error);
		return {
			title: "Error - Rebuzzle Blog",
			description: "An error occurred while loading the blog post.",
		};
	}
}

export default async function BlogPostPage({ params }: { params: Promise<{ slug: string }> }) {
	const { slug } = await params;

	try {
		const post = await fetchBlogPost(slug);

		if (!post) {
			notFound();
		}

		return (
			<Layout>
				<BlogPostContent post={post} />
			</Layout>
		);
	} catch (error) {
		console.error("Error in BlogPostPage:", error);
		return (
			<Layout>
				<div className="min-h-screen bg-slate-50 px-4 py-8">
					<div className="max-w-4xl mx-auto">
						{/* Error state */}
						<div className="bg-white rounded-3xl shadow-lg border border-gray-100 p-12 text-center">
							<div className="w-20 h-20 mx-auto bg-red-100 rounded-full flex items-center justify-center mb-6">
								<svg className="w-10 h-10 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
								</svg>
							</div>
							<h1 className="text-3xl font-bold text-red-600 mb-4">Error Loading Blog Post</h1>
							<p className="text-gray-600 mb-6">Sorry, we encountered an error loading this blog post.</p>
							<div className="flex flex-col sm:flex-row gap-4 justify-center">
								<a href="/blog" className="px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-semibold transition-colors duration-200">
									Back to Blog
								</a>
								<a href="/" className="px-6 py-3 bg-white hover:bg-gray-50 text-gray-700 border border-gray-300 rounded-xl font-semibold transition-colors duration-200">
									Play Today's Puzzle
								</a>
							</div>

							{process.env.NODE_ENV === "development" && (
								<div className="mt-8 text-left bg-red-50 p-4 rounded-xl border border-red-200">
									<p className="text-sm font-medium text-red-700 mb-2">Error Details:</p>
									<pre className="text-xs text-red-600 overflow-auto">{JSON.stringify(error, null, 2)}</pre>
								</div>
							)}
						</div>
					</div>
				</div>
			</Layout>
		);
	}
}
