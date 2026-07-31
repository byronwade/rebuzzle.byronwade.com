/**
 * Blog Generation Configuration
 *
 * Settings and prompts for generating comprehensive, SEO-optimized blog posts
 * from puzzles. Each post is a unique, well-structured analysis with sections
 * for solving strategies, puzzle history, and FAQs.
 */

import { getPuzzleTypeName } from "@/lib/puzzleUtils";
import { GLOBAL_CONTEXT } from "./global";
import { getPuzzleTypeConfig, hasPuzzleType } from "./puzzle-types";

export const BLOG_CONFIG = {
  // General settings - Updated for SEO optimization
  targetLength: "long", // short (300-500 words), medium (600-900 words), long (1200-2000 words)
  tone: "engaging, educational, and SEO-optimized - celebrates the puzzle experience",
  minWordCount: 1200,
  maxWordCount: 2000,

  // Section word targets for structured content
  sectionTargets: {
    introduction: { min: 150, max: 200 },
    puzzleAnalysis: { min: 200, max: 300 },
    solvingStrategy: { min: 300, max: 400 },
    puzzleHistory: { min: 150, max: 200 },
    faq: { min: 200, max: 300 }, // 3-5 Q&As
  },

  // Prompts
  prompts: {
    system: `You are an expert puzzle analyst and engaging storyteller creating comprehensive, SEO-optimized blog posts for Rebuzzle, a daily puzzle platform.

Your expertise includes:
- Puzzle solving strategies and game design
- Making complex topics accessible and engaging
- SEO-optimized content structure
- Educational content that entertains
- Creating content that builds expertise and trust (E-E-A-T)

WRITING STYLE:
- Engaging, educational tone that celebrates puzzles
- Focus on the puzzle-solving experience
- Structured content with clear sections for SEO
- Accessible language for all skill levels
- Varied paragraph lengths for readability
- Only use emojis if the puzzle itself contains emojis (like rebus puzzles)
- Celebrate the "aha!" moments
- Include practical solving strategies
- Natural keyword integration throughout

SEO REQUIREMENTS:
- Use clear H2 and H3 headings for structure
- Include the puzzle answer naturally 5-8 times (NOT in title)
- Target 1200-2000 words for comprehensive coverage
- Include FAQ section for featured snippets
- Focus keyword in first 100 words
- Use related keywords throughout (puzzle, solve, challenge, strategy, tips)

${GLOBAL_CONTEXT.brandVoice.guidelines.map((g) => `- ${g}`).join("\n")}

Each blog post should be a comprehensive exploration of the puzzle that:
1. Helps users understand how to approach similar puzzles
2. Provides historical or cultural context when relevant
3. Includes practical solving strategies
4. Answers common questions about the puzzle type
5. Encourages readers to try more puzzles`,

    // eslint-disable-next-line complexity
    generatePost: (puzzle: {
      puzzleType?: string;
      rebusPuzzle?: string;
      puzzle?: string;
      answer: string;
      category?: string;
      difficulty: number;
      explanation?: string;
      complexityScore?: unknown;
      hints?: unknown[];
      origin?: string;
      isCustom?: boolean;
      inspiration?: string;
      reason?: string;
      history?: string;
      whyChosen?: string;
    }) => {
      const puzzleType = puzzle.puzzleType || "rebus";
      const puzzleTypeName = hasPuzzleType(puzzleType) ? getPuzzleTypeName(puzzleType) : "Puzzle";
      const puzzleDisplay = puzzle.rebusPuzzle || puzzle.puzzle || "N/A";

      // Get puzzle type config for additional context
      let puzzleTypeContext = "";
      if (hasPuzzleType(puzzleType)) {
        try {
          const config = getPuzzleTypeConfig(puzzleType);
          puzzleTypeContext = `\n**Puzzle Type Details:**
- Type: ${config.name}
- Description: ${config.description}
- Category: ${puzzle.category || "General"}`;
        } catch {
          // Ignore if config not found
        }
      }

      // Build puzzle origin information
      const originInfo: string[] = [];
      if (puzzle.origin) {
        originInfo.push(`- **Puzzle Origin:** ${puzzle.origin}`);
      }
      if (puzzle.isCustom) {
        originInfo.push("- **Custom Puzzle:** Yes");
      }
      if (puzzle.inspiration) {
        originInfo.push(`- **Inspiration/Reason:** ${puzzle.inspiration}`);
      }
      if (puzzle.reason) {
        originInfo.push(`- **Creation Reason:** ${puzzle.reason}`);
      }
      if (puzzle.history) {
        originInfo.push(`- **History:** ${puzzle.history}`);
      }
      if (puzzle.whyChosen) {
        originInfo.push(`- **Why We Chose It:** ${puzzle.whyChosen}`);
      }
      const originInfoText = originInfo.length > 0 ? `\n${originInfo.join("\n")}` : "";

      // Check if we have origin story information
      const hasOriginStory = !!(
        puzzle.origin ||
        puzzle.inspiration ||
        puzzle.reason ||
        puzzle.history ||
        puzzle.whyChosen
      );

      return `Create a comprehensive, SEO-optimized blog post about this ${puzzleTypeName.toLowerCase()} puzzle. This should be an in-depth piece (1200-2000 words) with structured sections that helps readers understand and solve this type of puzzle.

**RESPONSE FORMAT - CRITICAL:**
Your response MUST be valid JSON with this exact structure:
\`\`\`json
{
  "title": "Your SEO-Optimized Title (40-60 chars, NO answer)",
  "metaDescription": "150-160 character description for search results",
  "focusKeyword": "primary keyword phrase",
  "secondaryKeywords": ["keyword1", "keyword2", "keyword3"],
  "sections": {
    "introduction": "150-200 word engaging introduction...",
    "puzzleAnalysis": "200-300 word analysis of the puzzle...",
    "solvingStrategy": "300-400 word step-by-step strategy...",
    "puzzleHistory": "150-200 word history/origin content...",
    "solution": "100-150 word solution explanation...",
    "callToAction": "50-80 word CTA..."
  },
  "faq": [
    {"question": "FAQ question 1?", "answer": "Answer 1..."},
    {"question": "FAQ question 2?", "answer": "Answer 2..."},
    {"question": "FAQ question 3?", "answer": "Answer 3..."}
  ],
  "fullContent": "The complete markdown blog post content (1200-2000 words)..."
}
\`\`\`

**TITLE REQUIREMENTS:**
- 40-60 characters, 4-8 words
- SEO-friendly but engaging
- **NEVER include the puzzle answer "${puzzle.answer}"** - this spoils it!
- Good examples: "Mastering Today's ${puzzleTypeName} Challenge", "Your Guide to Solving ${puzzleTypeName} Puzzles"

**Puzzle Information:**
- **Puzzle Type:** ${puzzleTypeName}
- **Puzzle Content:** ${puzzleDisplay}
- **Answer:** ${puzzle.answer}
- **Category:** ${puzzle.category || "General"}
- **Difficulty:** ${puzzle.difficulty}/10
- **Explanation:** ${puzzle.explanation}
${puzzleTypeContext}
${puzzle.complexityScore ? `- **Complexity Analysis:** ${JSON.stringify(puzzle.complexityScore, null, 2)}` : ""}
${puzzle.hints ? `- **Hints Provided:** ${puzzle.hints.length} progressive hints` : ""}
${originInfoText}

**SECTION REQUIREMENTS:**

## 1. INTRODUCTION (150-200 words)
- Hook readers immediately with an engaging opening
- Introduce the puzzle type and today's challenge
- Include focus keyword in first 100 words
- Mention the answer "${puzzle.answer}" naturally for SEO
- Set expectations for what readers will learn

## 2. PUZZLE ANALYSIS (200-300 words)
- Describe what makes this puzzle interesting
- Analyze the visual/textual elements without spoiling
- Discuss the cognitive skills required
- Explain the difficulty level (${puzzle.difficulty}/10)
- Include puzzle type keywords naturally

## 3. SOLVING STRATEGY (300-400 words)
- Provide step-by-step approach to solving
- Include 3-5 numbered or bulleted steps
- Explain general tips for this puzzle type
- Discuss common mistakes to avoid
- Offer hints without immediate spoilers

## 4. PUZZLE HISTORY & ORIGIN (150-200 words)
${
  hasOriginStory
    ? `Use provided info: ${originInfoText}`
    : `- Discuss the history of ${puzzleTypeName.toLowerCase()} puzzles in general
- Cultural context and evolution
- Why this puzzle type is engaging
- Any interesting facts about the format`
}

## 5. THE SOLUTION (100-150 words)
- Reveal the answer: "${puzzle.answer}"
- Walk through the logic step-by-step
- Explain the "aha" moment
- Connect back to the strategy section

## 6. FAQ SECTION (3-5 Q&As)
Create relevant FAQs such as:
- "How do I solve ${puzzleTypeName.toLowerCase()} puzzles?"
- "What makes this puzzle challenging?"
- "How can I improve at ${puzzleTypeName.toLowerCase()} puzzles?"
- "Where can I find more puzzles like this?"

## 7. CALL TO ACTION (50-80 words)
- Encourage readers to try today's puzzle
- Mention related puzzle types
- Invite them to explore more content

**SEO REQUIREMENTS:**
- Include "${puzzle.answer}" naturally 5-8 times (NOT in title)
- Use "${puzzleTypeName.toLowerCase()} puzzle" 3-5 times
- Include related keywords: solve, strategy, tips, challenge, brain teaser
- Proper H2/H3 heading structure
- Target 1200-2000 words total
- Focus keyword in meta description

**WRITING STYLE:**
- Engaging and educational tone
- Varied paragraph lengths (2-4 sentences)
- Use Markdown formatting (headers, lists, bold, etc.)
- NO emojis unless puzzle contains them
- Accessible to all skill levels
- Build expertise and trust (E-E-A-T)

Return ONLY valid JSON. No additional text before or after the JSON.`;
    },
  },
} as const;
