export interface BlogPost {
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

export interface BlogPostWithPuzzle extends BlogPost {
	puzzle: {
		rebusPuzzle: string;
		answer: string;
		explanation: string;
		metadata?: {
			hints?: string[];
			topic?: string;
			keyword?: string;
			category?: string;
			relevanceScore?: number;
			generatedAt?: string;
			version?: string;
		};
	};
}

// This is a mock implementation. In a real app, this would fetch from a database
export async function getBlogPosts(): Promise<BlogPost[]> {
	return [
		{
			slug: "welcome-to-rebuzzle",
			date: "2024-01-01",
			title: "Welcome to Rebuzzle!",
			puzzle: "M + 🧠 = ?",
			answer: "MIND",
			explanation: "M + BRAIN = MIND",
			content: "Welcome to Rebuzzle, your daily dose of brain-teasing rebus puzzles!",
			excerpt: "Get started with your first Rebuzzle puzzle and learn how to play.",
		},
		// Add more blog posts here
	];
}

export async function getBlogPost(slug: string): Promise<BlogPost | null> {
	const posts = await getBlogPosts();
	return posts.find((post) => post.slug === slug) || null;
}

export async function createBlogPost(post: Omit<BlogPost, "slug" | "date">): Promise<BlogPost> {
	const slug = post.title
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/(^-|-$)/g, "");

	return {
		...post,
		slug,
		date: new Date().toISOString().split("T")[0],
	};
}
