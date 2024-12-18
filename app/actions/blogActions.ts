"use server";

import { prisma } from "@/lib/prisma";
import { Difficulty } from "@/lib/gameSettings";
import { unstable_cache } from "next/cache";
import { Prisma, BlogPost, Puzzle, User } from "@prisma/client";

// Define the difficulty values with their numeric equivalents
const DIFFICULTY_VALUES = {
	EASY: 3,
	MEDIUM: 6,
	HARD: 9,
} as const;

type DifficultyValue = (typeof DIFFICULTY_VALUES)[keyof typeof DIFFICULTY_VALUES];

// Helper function to convert difficulty to number
function getDifficultyValue(difficulty: Difficulty | undefined): DifficultyValue {
	switch (difficulty) {
		case "easy":
			return DIFFICULTY_VALUES.EASY;
		case "hard":
			return DIFFICULTY_VALUES.HARD;
		case "medium":
		default:
			return DIFFICULTY_VALUES.MEDIUM;
	}
}

interface BlogPostResponse {
	slug: string;
	date: string;
	title: string;
	puzzle: string;
	answer: string;
	explanation: string;
	content: string;
	excerpt: string;
	metadata?: {
		topic?: string;
		keyword?: string;
		category?: string;
		seoMetadata?: {
			keywords: string[];
			description: string;
			ogTitle: string;
			ogDescription: string;
		};
	};
}

type BlogPostWithPuzzle = BlogPost & {
	puzzle: Puzzle;
};

// Helper function to get today's date key
const getTodayKey = () => new Date().toISOString().split("T")[0];

// Helper function to format blog post data
function formatBlogPost(post: BlogPostWithPuzzle): BlogPostResponse {
	if (!post.puzzle) {
		throw new Error("Blog post has no associated puzzle");
	}

	return {
		slug: post.slug,
		date: post.publishedAt.toISOString().split("T")[0],
		title: post.title,
		puzzle: post.puzzle.rebusPuzzle,
		answer: post.puzzle.answer,
		explanation: post.puzzle.explanation,
		content: post.content,
		excerpt: post.excerpt,
		metadata: {
			...(post.metadata as Record<string, unknown>),
			...(post.puzzle.metadata as Record<string, unknown>),
		},
	};
}

// Helper function to handle database errors
function handleDatabaseError(error: unknown, context: string): never {
	console.error(`Database error in ${context}:`, error);
	if (error instanceof Prisma.PrismaClientKnownRequestError) {
		throw new Error(`Database error: ${error.message} (Code: ${error.code})`);
	} else if (error instanceof Error) {
		throw new Error(`Database error: ${error.message}`);
	} else {
		throw new Error("Unknown database error");
	}
}

// Cache blog posts list
export const fetchBlogPosts = unstable_cache(
	async (): Promise<BlogPostResponse[]> => {
		console.log("Fetching blog posts from database...");
		try {
			const posts = await prisma.blogPost.findMany({
				orderBy: {
					publishedAt: "desc",
				},
				include: {
					puzzle: true,
				},
				take: 50, // Limit to 50 posts for performance
			});

			if (!posts || posts.length === 0) {
				console.log("No blog posts found in database");
				return [];
			}

			console.log(`Found ${posts.length} blog posts in database`);

			return posts
				.map((post) => {
					try {
						return formatBlogPost(post as BlogPostWithPuzzle);
					} catch (error) {
						console.error(`Error formatting blog post ${post.id}:`, error);
						return null;
					}
				})
				.filter((post): post is BlogPostResponse => post !== null);
		} catch (error) {
			handleDatabaseError(error, "fetchBlogPosts");
		}
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
		try {
			const post = await prisma.blogPost.findUnique({
				where: {
					slug,
				},
				include: {
					puzzle: true,
				},
			});

			if (!post) {
				console.log(`No blog post found with slug: ${slug}`);
				return null;
			}

			try {
				return formatBlogPost(post as BlogPostWithPuzzle);
			} catch (error) {
				console.error(`Error formatting blog post ${post.id}:`, error);
				return null;
			}
		} catch (error) {
			handleDatabaseError(error, `fetchBlogPost(${slug})`);
		}
	},
	["blog-post"],
	{
		revalidate: 3600,
		tags: ["blog-posts"],
	}
);

interface CreateBlogPostInput {
	title: string;
	content: string;
	puzzle: string;
	answer: string;
	explanation: string;
	difficulty?: Difficulty;
	metadata?: {
		topic?: string;
		keyword?: string;
		category?: string;
		seoMetadata?: {
			keywords: string[];
			description: string;
			ogTitle: string;
			ogDescription: string;
		};
	};
}

interface CreateBlogPostResponse {
	success: boolean;
	message: string;
	error?: string;
	post?: BlogPostWithPuzzle;
}

// Helper function to validate blog post input
function validateBlogPostInput(post: CreateBlogPostInput): void {
	if (!post.title?.trim()) throw new Error("Title is required");
	if (!post.content?.trim()) throw new Error("Content is required");
	if (!post.puzzle?.trim()) throw new Error("Puzzle is required");
	if (!post.answer?.trim()) throw new Error("Answer is required");
	if (!post.explanation?.trim()) throw new Error("Explanation is required");
}

// Helper function to create a blog post with retries
async function createBlogPostWithRetry(post: CreateBlogPostInput, maxRetries = 3): Promise<CreateBlogPostResponse> {
	let retryCount = 0;
	let lastError: Error | null = null;

	// Validate input before attempting database operations
	try {
		validateBlogPostInput(post);
	} catch (error) {
		return {
			success: false,
			message: "Invalid input",
			error: error instanceof Error ? error.message : "Unknown validation error",
		};
	}

	while (retryCount < maxRetries) {
		try {
			const slug = post.title
				.toLowerCase()
				.replace(/[^a-z0-9]+/g, "-")
				.replace(/(^-|-$)/g, "");

			// Check if slug already exists
			const existingPost = await prisma.blogPost.findUnique({
				where: { slug },
			});

			if (existingPost) {
				throw new Error(`Blog post with slug "${slug}" already exists`);
			}

			// First create the puzzle without transaction
			const puzzle = await prisma.puzzle.create({
				data: {
					rebusPuzzle: post.puzzle,
					answer: post.answer,
					explanation: post.explanation,
					difficulty: getDifficultyValue(post.difficulty),
					scheduledFor: new Date(),
					metadata: {
						...(post.metadata || {}),
						hints: [`Think about ${post.metadata?.topic || post.answer}`, `Consider how the elements relate to ${post.metadata?.keyword || post.answer}`, `Look for connections to ${post.metadata?.category || post.answer}`],
					},
				},
			});

			// Then find or create the system user
			const systemUser = await prisma.user.findFirst({
				where: { email: "system@rebuzzle.com" },
			});

			if (!systemUser) {
				throw new Error("System user not found");
			}

			// Finally create the blog post
			const newPost = await prisma.blogPost.create({
				data: {
					slug,
					title: post.title.trim(),
					content: post.content.trim(),
					excerpt: post.content.substring(0, 200).trim() + "...",
					authorId: systemUser.id,
					publishedAt: new Date(),
					metadata: post.metadata || {},
					puzzleId: puzzle.id,
				},
				include: {
					puzzle: true,
				},
			});

			return {
				success: true,
				message: "Blog post created successfully",
				post: newPost,
			};
		} catch (error) {
			lastError = error instanceof Error ? error : new Error("Unknown error");
			console.error(`Failed to create blog post (attempt ${retryCount + 1}/${maxRetries}):`, error);
			retryCount++;

			// Wait before retrying (exponential backoff)
			if (retryCount < maxRetries) {
				await new Promise((resolve) => setTimeout(resolve, Math.pow(2, retryCount) * 1000));
			}
		}
	}

	return {
		success: false,
		message: "Failed to create blog post after multiple attempts",
		error: lastError?.message || "Unknown error",
	};
}

export async function createBlogPost(post: CreateBlogPostInput): Promise<CreateBlogPostResponse> {
	return createBlogPostWithRetry(post);
}
