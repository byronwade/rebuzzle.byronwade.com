"use server";

import { getBlogPosts, getBlogPost } from "@/lib/fakeBlogData";
import type { BlogPostData } from "@/lib/fakeBlogData";
import { unstable_cache } from "next/cache";

// Type alias for consistency with the existing interface
export type BlogPostResponse = BlogPostData;

// Cache blog posts list
export const fetchBlogPosts = unstable_cache(
	async (): Promise<BlogPostResponse[]> => {
		console.log("Fetching blog posts from fake data...");

		const posts = getBlogPosts();
		console.log(`Found ${posts.length} blog posts in fake data`);

		return posts;
	},
	["blog-posts-list"],
	{
		revalidate: 3600,
		tags: ["blog-posts"],
	}
);

// Cache individual blog posts
export const fetchBlogPost = unstable_cache(
	async (slug: string): Promise<BlogPostResponse | null> => {
		if (!slug) {
			console.error("No slug provided to fetchBlogPost");
			return null;
		}

		console.log(`Fetching blog post with slug: ${slug}`);

		const post = getBlogPost(slug);

		if (!post) {
			console.log(`No blog post found with slug: ${slug}`);
			return null;
		}

		return post;
	},
	["blog-post"],
	{
		revalidate: 3600,
		tags: ["blog-post"],
	}
);

// Demo function for creating blog posts (not functional in demo mode)
export async function createBlogPost(post: any): Promise<{ success: boolean; message: string; error?: string }> {
	console.log("createBlogPost called in demo mode");
	return {
		success: false,
		message: "Blog post creation is disabled in demo mode",
		error: "This is a demo version - database operations are not available",
	};
}
