"use server";

import { xai } from "@ai-sdk/xai";
import { generateObject } from "ai";
import { z } from "zod";
import prisma from "@/lib/prisma";

// Define schemas for our structured data
const TrendingTopicSchema = z.object({
	topic: z.string().describe("A topic that would make a good puzzle"),
	keyword: z.string().describe("A word or phrase that would make a good rebus puzzle"),
	category: z.string().describe("The category this puzzle belongs to"),
	relevanceScore: z.number().min(1).max(10).describe("How engaging this topic is on a scale of 1-10"),
});

const PuzzleSchema = z.object({
	rebusPuzzle: z.string().describe("A rebus puzzle using any combination of emojis, text, symbols, or shapes. Can be as simple or complex as needed while remaining solvable."),
	difficulty: z.number().min(1).max(10).describe("Estimated difficulty level of the puzzle (1-10, where 1 is very easy and 10 is very challenging)"),
});

const AnswerSchema = z.object({
	answer: z.string().describe("The solution to the rebus puzzle - must match the keyword exactly"),
	explanation: z.string().describe("A clear explanation of how the puzzle elements combine to form the answer"),
	hints: z.array(z.string()).describe("Three progressive hints to help solve the puzzle"),
});

const BlogPostSchema = z.object({
	title: z.string().describe("An engaging title that describes the puzzle"),
	content: z.string().describe("A blog post that discusses the puzzle solution in an entertaining way"),
	excerpt: z.string().describe("A brief, engaging summary of the puzzle and its solution"),
	seoMetadata: z.object({
		keywords: z.array(z.string()).describe("SEO keywords related to the puzzle and its theme"),
		description: z.string().describe("SEO meta description for the blog post"),
		ogTitle: z.string().describe("Open Graph title for social sharing"),
		ogDescription: z.string().describe("Open Graph description for social sharing"),
	}),
});

async function generatePuzzleAndBlogPost(scheduledDate: Date) {
	const MAX_RETRIES = 3;
	let retryCount = 0;

	while (retryCount < MAX_RETRIES) {
		try {
			console.log(`Attempt ${retryCount + 1} of ${MAX_RETRIES} to generate unique puzzle...`);

			// Generate a topic
			const trendingResult = await generateObject({
				model: xai("grok-2-1212"),
				system: "You are a puzzle creator who specializes in rebus puzzles. Focus on creating puzzles that are clever yet solvable.",
				prompt: `Create a topic for a rebus puzzle.

REQUIREMENTS:
1. Must be recognizable
2. Must be clear and understandable
3. Must be representable with puzzle elements
4. Must be engaging and interesting
5. Can be from any category or theme

The keyword should be:
- Clear and specific
- Representable with puzzle elements
- Something people can understand
- Interesting to solve
- Satisfying to figure out
- Can be simple or complex

Examples of GOOD keywords:
✅ Any clear concept (simple or complex)
✅ Recognizable phrases
✅ Common expressions
✅ Interesting combinations
✅ Creative word plays
✅ Technical terms (if widely known)
✅ Modern concepts
✅ Cultural references

Examples of BAD keywords:
❌ Extremely obscure terms
❌ Overly abstract concepts
❌ Unclear meanings
❌ Highly specialized jargon

${retryCount > 0 ? "IMPORTANT: Choose a completely different topic than previously suggested." : ""}`,
				schema: TrendingTopicSchema,
				temperature: 0.9 + retryCount * 0.1,
				maxTokens: 200,
			});

			console.log("Topic generated:", trendingResult);

			if (!trendingResult?.object?.topic || !trendingResult?.object?.keyword) {
				throw new Error("Failed to generate topic");
			}

			const { topic, keyword, category, relevanceScore } = trendingResult.object;

			// Check for existing puzzles with the same answer
			const existingPuzzle = await prisma.puzzle.findFirst({
				where: {
					answer: {
						equals: keyword,
						mode: "insensitive",
					},
				},
			});

			if (existingPuzzle) {
				console.log(`Found duplicate answer: ${keyword}. Retrying...`);
				retryCount++;
				continue;
			}

			// Generate the puzzle based on the keyword
			const puzzleResult = await generateObject({
				model: xai("grok-2-1212"),
				system: "You are a puzzle creator specializing in rebus puzzles. Create puzzles that are clever yet solvable.",
				prompt: `Create a rebus puzzle for "${keyword}".

GUIDELINES:
1. Use any creative combination of:
   - Emojis (any number)
   - Text words
   - Basic operators (+ - = × ÷)
   - Numbers
   - Letters
   - Symbols
   - Special characters
2. Keep it clear and logical
3. Make it solvable
4. Use recognizable elements
5. Be creative with combinations

EXAMPLES OF GOOD PUZZLES:
✅ Complex combinations:
   '🌍 + 🔥 + 🌡️ + ⚠️' (multiple elements)
   '🎮 + 👾 + 🕹️ + PLAY' (mixed elements)
   '💻 + 🏠 + REMOTE' (text and emojis)

✅ Creative formats:
   '(🌧️ × 🎀) + 🌈' (using operators)
   '🎵 + 123 + 🎼' (numbers and symbols)
   'BOOK + 📚 + 📖 + READ' (multiple combinations)

Make your puzzle:
1. As simple or complex as needed
2. Clear to understand
3. Logical to solve
4. Satisfying to figure out
5. Using any combination of elements that works best`,
				schema: PuzzleSchema,
				temperature: 0.7 + retryCount * 0.1,
				maxTokens: 200,
			});

			console.log("Puzzle generated:", puzzleResult);

			if (!puzzleResult?.object?.rebusPuzzle) {
				throw new Error("Failed to generate puzzle");
			}

			const { rebusPuzzle, difficulty } = puzzleResult.object;

			// Generate answer and hints
			const answerResult = await generateObject({
				model: xai("grok-2-1212"),
				system: "You are an expert at creating puzzle hints that guide players to discovery. Your hints should be engaging and helpful.",
				prompt: `For the rebus puzzle "${rebusPuzzle}" (answer: "${keyword}"), provide:

1. The exact answer (must match "${keyword}")

2. A clear explanation of how the puzzle works:
   - How do the elements combine?
   - Why does this combination work?
   - How do the parts create meaning?
   - What makes it clever or interesting?

3. Three progressive hints:
   - First: A general clue about the concept or theme
   - Second: A hint about how the elements relate
   - Third: A more direct hint about the solution

Make your hints:
1. Progressively more helpful
2. Clear but not obvious
3. Engaging to read
4. Leading to understanding
5. Appropriate for the puzzle's difficulty level`,
				schema: AnswerSchema,
				temperature: 0.7 + retryCount * 0.1,
				maxTokens: 300,
			});

			console.log("Answer generated:", answerResult);

			if (!answerResult?.object?.answer || !answerResult?.object?.explanation || !answerResult?.object?.hints) {
				throw new Error("Failed to generate answer");
			}

			const { answer, explanation, hints } = answerResult.object;

			// Generate the blog post
			const blogResult = await generateObject({
				model: xai("grok-2-1212"),
				system: "You are a creative writer who specializes in making puzzles engaging and interesting. Your posts should be informative and entertaining.",
				prompt: `Write a blog post about the rebus puzzle "${rebusPuzzle}" (answer: "${answer}"). The post should:

1. Start with an engaging introduction
2. Explain what makes this puzzle interesting
3. Connect it to broader concepts
4. Include relevant examples
5. Be engaging for puzzle enthusiasts
6. Include SEO-friendly content
7. End with an invitation to explore more puzzles

Make the content engaging and informative!`,
				schema: BlogPostSchema,
				temperature: 0.7 + retryCount * 0.1,
				maxTokens: 1000,
			});

			console.log("Blog post generated:", blogResult);

			if (!blogResult?.object?.title || !blogResult?.object?.content || !blogResult?.object?.excerpt || !blogResult?.object?.seoMetadata) {
				throw new Error("Failed to generate blog post");
			}

			const { title, content, excerpt, seoMetadata } = blogResult.object;

			// Get or create a system user for automated posts
			const systemUser = await prisma.user.upsert({
				where: {
					email: "system@rebuzzle.com",
				},
				create: {
					email: "system@rebuzzle.com",
					username: "system",
					passwordHash: "not-used",
				},
				update: {},
			});

			console.log("System user:", systemUser);

			// Store in database
			const puzzle = await prisma.puzzle.create({
				data: {
					rebusPuzzle,
					answer,
					explanation,
					difficulty,
					scheduledFor: scheduledDate,
					metadata: {
						topic,
						keyword,
						category,
						relevanceScore,
						hints,
						generatedAt: new Date().toISOString(),
						version: "1.0",
					},
				},
			});

			console.log("Puzzle stored:", puzzle);

			await prisma.blogPost.create({
				data: {
					slug: title
						.toLowerCase()
						.replace(/[^a-z0-9]+/g, "-")
						.replace(/(^-|-$)+/g, ""),
					title,
					content,
					excerpt,
					authorId: systemUser.id,
					publishedAt: scheduledDate,
					puzzleId: puzzle.id,
					metadata: {
						topic,
						keyword,
						category,
						relevanceScore,
						seoMetadata,
						generatedAt: new Date().toISOString(),
						version: "1.0",
					},
				},
			});

			console.log("Blog post stored successfully");
			return;
		} catch (error) {
			console.error(`Error in attempt ${retryCount + 1}:`, error);
			retryCount++;

			if (retryCount >= MAX_RETRIES) {
				throw new Error(`Failed to generate unique puzzle after ${MAX_RETRIES} attempts`);
			}
		}
	}
}

export async function generateNextPuzzle(targetDate?: Date) {
	try {
		// If no date is provided, use tomorrow at midnight UTC
		const scheduledDate =
			targetDate ||
			(() => {
				const tomorrow = new Date();
				tomorrow.setDate(tomorrow.getDate() + 1);
				tomorrow.setUTCHours(0, 0, 0, 0);
				return tomorrow;
			})();

		// Check if a puzzle already exists for this date
		const existingPuzzle = await prisma.puzzle.findFirst({
			where: {
				scheduledFor: {
					gte: new Date(scheduledDate.setUTCHours(0, 0, 0, 0)),
					lt: new Date(scheduledDate.setUTCHours(23, 59, 59, 999)),
				},
			},
		});

		if (existingPuzzle) {
			console.log(`Puzzle already exists for ${scheduledDate.toDateString()}`);
			return { success: true, message: `Puzzle already exists for ${scheduledDate.toDateString()}` };
		}

		console.log(`Generating puzzle for ${scheduledDate.toISOString()}`);
		await generatePuzzleAndBlogPost(scheduledDate);
		return { success: true, message: `Successfully generated puzzle for ${scheduledDate.toDateString()}` };
	} catch (error) {
		console.error("Failed to generate puzzle:", error);
		throw error;
	}
}

// ... rest of the existing code ...
