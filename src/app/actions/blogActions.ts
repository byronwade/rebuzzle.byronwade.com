"use server";

import { getBlogPosts, getBlogPost } from "@/lib/fakeBlogData";
import type { BlogPostData } from "@/lib/fakeBlogData";
import { unstable_cache } from "next/cache";
import { getCollection } from "@/db/mongodb-client";

// Type alias for consistency with the existing interface
export type BlogPostResponse = BlogPostData;

// Cache blog posts list
export const fetchBlogPosts = unstable_cache(
	async (): Promise<BlogPostResponse[]> => {
		try {
			// eslint-disable-next-line no-console
			console.log("Fetching blog posts from database...");

			// Try to fetch from database first
			const blogPostsCollection = getCollection('blogPosts');
			const usersCollection = getCollection('users');
			const puzzlesCollection = getCollection('puzzles');

			const dbPosts = await blogPostsCollection
				.aggregate([
					{
						$lookup: {
							from: 'users',
							localField: 'authorId',
							foreignField: 'id',
							as: 'author'
						}
					},
					{
						$lookup: {
							from: 'puzzles',
							localField: 'puzzleId',
							foreignField: 'id',
							as: 'puzzle'
						}
					},
					{
						$unwind: '$author'
					},
					{
						$unwind: '$puzzle'
					},
					{
						$sort: { publishedAt: -1 }
					},
					{
						$limit: 10
					}
				])
				.toArray();

			if (dbPosts.length > 0) {
				// eslint-disable-next-line no-console
				console.log(`Found ${dbPosts.length} blog posts in database`);
				
				return dbPosts.map(post => ({
					slug: post.slug,
					date: post.publishedAt.toISOString().split('T')[0],
					title: post.title,
					puzzle: post.puzzle.rebusPuzzle,
					answer: post.puzzle.answer,
					explanation: post.puzzle.explanation || "No explanation available",
					content: post.content,
					excerpt: post.excerpt,
					metadata: {
						topic: post.puzzle.difficulty,
						keyword: post.puzzle.answer.replace(/\s+/g, ""),
						category: post.puzzle.difficulty,
					}
				}));
			}
		} catch (error) {
			// eslint-disable-next-line no-console
			console.warn("Database fetch failed, falling back to fake data:", error);
		}

		// Fallback to fake data
		// eslint-disable-next-line no-console
		console.log("Fetching blog posts from fake data...");
		const posts = getBlogPosts();
		// eslint-disable-next-line no-console
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
			// eslint-disable-next-line no-console
			console.error("No slug provided to fetchBlogPost");
			return null;
		}

		// eslint-disable-next-line no-console
		console.log(`Fetching blog post with slug: ${slug}`);

		try {
			// Try to fetch from database first
			const blogPostsCollection = getCollection('blogPosts');

			const [dbPost] = await blogPostsCollection
				.aggregate([
					{
						$match: { slug }
					},
					{
						$lookup: {
							from: 'users',
							localField: 'authorId',
							foreignField: 'id',
							as: 'author'
						}
					},
					{
						$lookup: {
							from: 'puzzles',
							localField: 'puzzleId',
							foreignField: 'id',
							as: 'puzzle'
						}
					},
					{
						$unwind: '$author'
					},
					{
						$unwind: '$puzzle'
					},
					{
						$limit: 1
					}
				])
				.toArray();

			if (dbPost) {
				// eslint-disable-next-line no-console
				console.log(`Found blog post in database: ${dbPost.title}`);
				
				return {
					slug: dbPost.slug,
					date: dbPost.publishedAt.toISOString().split('T')[0],
					title: dbPost.title,
					puzzle: dbPost.puzzle.rebusPuzzle,
					answer: dbPost.puzzle.answer,
					explanation: dbPost.puzzle.explanation || "No explanation available",
					content: dbPost.content,
					excerpt: dbPost.excerpt,
					metadata: {
						topic: dbPost.puzzle.difficulty,
						keyword: dbPost.puzzle.answer.replace(/\s+/g, ""),
						category: dbPost.puzzle.difficulty,
					}
				};
			}
		} catch (error) {
			// eslint-disable-next-line no-console
			console.warn("Database fetch failed, falling back to fake data:", error);
		}

		// Fallback to fake data
		const post = getBlogPost(slug);

		if (!post) {
			// eslint-disable-next-line no-console
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

// Function for creating blog posts with database integration
export async function createBlogPost(postData: {
	title: string;
	content: string;
	excerpt: string;
	slug: string;
	authorId: string;
	puzzleId: string;
	publishedAt: Date;
}): Promise<{ success: boolean; message: string; error?: string; postId?: string }> {
		try {
			// eslint-disable-next-line no-console
			console.log("createBlogPost called with data:", postData);

			// Create blog post in database
			const blogPostsCollection = getCollection('blogPosts');
			
			const newPost = await blogPostsCollection.insertOne({
				title: postData.title,
				content: postData.content,
				excerpt: postData.excerpt,
				slug: postData.slug,
				authorId: postData.authorId,
				puzzleId: postData.puzzleId,
				publishedAt: postData.publishedAt,
				createdAt: new Date(),
				updatedAt: new Date(),
			});

			if (!newPost.insertedId) {
				return {
					success: false,
					message: "Failed to create blog post",
					error: "Database insert failed",
				};
			}

			// eslint-disable-next-line no-console
			console.log("Blog post created successfully:", newPost.insertedId);

			return {
				success: true,
				message: "Blog post created successfully",
				postId: newPost.insertedId.toString(),
			};
		} catch (error) {
			// eslint-disable-next-line no-console
			console.error("Error creating blog post:", error);
			return {
				success: false,
				message: "Failed to create blog post",
				error: error instanceof Error ? error.message : "Unknown error",
			};
		}
}
