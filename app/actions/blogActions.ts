"use server";

import prisma from "@/lib/prisma";
import { Difficulty } from "@/lib/gameSettings";

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

export async function fetchBlogPosts(): Promise<BlogPostResponse[]> {
	try {
		const posts = await prisma.blogPost.findMany({
			orderBy: {
				publishedAt: "desc",
			},
			include: {
				puzzle: {
					select: {
						rebusPuzzle: true,
						answer: true,
						explanation: true,
						metadata: true,
					},
				},
			},
		});

		return posts.map((post) => ({
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
		}));
	} catch (error) {
		console.error("Failed to fetch blog posts:", error);
		return [];
	}
}

export async function fetchBlogPost(slug: string): Promise<BlogPostResponse | null> {
	try {
		const post = await prisma.blogPost.findUnique({
			where: { slug },
			include: {
				puzzle: {
					select: {
						rebusPuzzle: true,
						answer: true,
						explanation: true,
						metadata: true,
					},
				},
			},
		});

		if (!post) return null;

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
	} catch (error) {
		console.error("Failed to fetch blog post:", error);
		return null;
	}
}

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
	post?: any;
}

export async function createBlogPost(post: CreateBlogPostInput): Promise<CreateBlogPostResponse> {
	try {
		const slug = post.title
			.toLowerCase()
			.replace(/[^a-z0-9]+/g, "-")
			.replace(/(^-|-$)/g, "");

		const systemUser = await prisma.user.findFirst({
			where: { email: "system@rebuzzle.com" },
		});

		if (!systemUser) {
			throw new Error("System user not found");
		}

		const newPost = await prisma.blogPost.create({
			data: {
				slug,
				title: post.title,
				content: post.content,
				excerpt: post.content.substring(0, 200) + "...",
				authorId: systemUser.id,
				publishedAt: new Date(),
				metadata: post.metadata || {},
				puzzle: {
					create: {
						rebusPuzzle: post.puzzle,
						answer: post.answer,
						explanation: post.explanation,
						difficulty: post.difficulty || "medium",
						scheduledFor: new Date(),
						metadata: {
							...(post.metadata || {}),
							hints: [`Think about ${post.metadata?.topic || post.answer}`, `Consider how the elements relate to ${post.metadata?.keyword || post.answer}`, `Look for connections to ${post.metadata?.category || post.answer}`],
						},
					},
				},
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
		console.error("Failed to create blog post:", error);
		return {
			success: false,
			error: error instanceof Error ? error.message : "Failed to create blog post",
		};
	}
}
