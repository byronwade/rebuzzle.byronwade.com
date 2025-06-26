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
				<div className="max-w-4xl mx-auto px-4 py-8">
					<div className="text-center text-red-600 dark:text-red-400">
						<h1 className="text-3xl font-bold mb-4">Error Loading Blog Post</h1>
						<p>Sorry, we encountered an error loading this blog post.</p>
						{process.env.NODE_ENV === "development" && <pre className="mt-4 text-left bg-gray-100 dark:bg-gray-800 p-4 rounded mx-auto max-w-2xl overflow-auto text-sm">{JSON.stringify(error, null, 2)}</pre>}
					</div>
				</div>
			</Layout>
		);
	}
}
