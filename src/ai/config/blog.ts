/**
 * Blog Generation Configuration
 *
 * Settings and prompts for generating comprehensive, whitepaper-style blog posts
 * from puzzles. Each post is a unique, elaborate, well-structured analysis.
 */

import { getPuzzleTypeName } from "@/lib/puzzleUtils";
import { GLOBAL_CONTEXT } from "./global";
import { getPuzzleTypeConfig, hasPuzzleType } from "./puzzle-types";

export const BLOG_CONFIG = {
  // General settings
  targetLength: "short", // short (300-500 words), medium (600-900 words), long (1200-2000 words)
  tone: "playful, fun, and engaging - focused on the puzzle itself",
  minWordCount: 300,
  maxWordCount: 500,

  // Prompts
  prompts: {
    system: `You are a playful puzzle enthusiast and engaging storyteller creating fun, accessible blog posts for Rebuzzle, a daily puzzle platform.

Your expertise includes:
- Puzzle solving and game design
- Making complex topics fun and accessible
- Engaging storytelling
- SEO optimization for puzzle content
- Creating content that celebrates the joy of puzzles

WRITING STYLE:
- Playful, fun, and enthusiastic tone
- Focus on the puzzle itself as the star
- Engaging storytelling that draws readers in
- Accessible language that anyone can enjoy
- Short, punchy sentences and paragraphs
- Only use emojis if the puzzle itself contains emojis (like rebus puzzles)
- Celebrate the "aha!" moments
- Make readers excited about puzzles
- SEO-friendly with natural keyword integration

${GLOBAL_CONTEXT.brandVoice.guidelines.map((g) => `- ${g}`).join("\n")}

Each blog post should be a fun, engaging exploration of the puzzle that makes readers want to solve more puzzles. Focus on the puzzle itself, the solving experience, and the joy of discovery.`,

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
      const puzzleTypeName = hasPuzzleType(puzzleType)
        ? getPuzzleTypeName(puzzleType)
        : "Puzzle";
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
      const originInfoText =
        originInfo.length > 0 ? `\n${originInfo.join("\n")}` : "";

      // Check if we have origin story information
      const hasOriginStory = !!(
        puzzle.origin ||
        puzzle.inspiration ||
        puzzle.reason ||
        puzzle.history ||
        puzzle.whyChosen
      );

      return `Create a fun, engaging blog post about this ${puzzleTypeName.toLowerCase()} puzzle. This should be a concise, playful piece (300-500 words) optimized for SEO that celebrates the puzzle and makes readers excited to solve it.

**CRITICAL: BE CREATIVE AND VARIED!**
- Each blog post should feel unique and different from others
- Vary your approach, structure, and writing style
- Don't follow a rigid template - be creative!
- Mix up section orders, titles, and content organization
- Use different hooks, angles, and storytelling approaches
- Make each post feel fresh and original

**TITLE REQUIREMENTS (CRITICAL):**
- Title must be SHORT (40-60 characters max, ideally 4-8 words)
- Title should be playful, fun, and puzzle-focused
- **DO NOT include the puzzle answer in the title** - this spoils the puzzle for readers!
- Title should be catchy, relevant to the puzzle type, and always unique
- VARY your title style - don't use the same format every time!
- Examples of good title styles (without revealing answers):
  * "Solving Today's Logic Grid Challenge"
  * "A Tricky Rebus Puzzle Breakdown"
  * "Cracking the Cryptic Crossword"
  * "Today's Number Sequence Mystery"
  * "Behind the Pattern Recognition Puzzle"
  * "A Challenging Caesar Cipher"
  * "Today's Trivia Brain Teaser"
  * "Unlocking the Logic Grid"
  * "Breaking Down the Rebus"
- BAD titles (reveal answer or too academic):
  * "Cracking the '${puzzle.answer}' Puzzle" ❌ (reveals answer!)
  * "How to Solve '${puzzle.answer}' Like a Pro" ❌ (reveals answer!)
  * "Solving the Puzzle: A Deep Dive into Cognitive Challenge" ❌ (too academic)

**IMPORTANT: Start your response with a SHORT, PLAYFUL H1 title on the first line (NO EMOJIS unless the puzzle itself uses emojis). Make it unique and creative, but NEVER include the puzzle answer!**

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

**FLEXIBLE STRUCTURE - BE CREATIVE! (Keep it concise and SEO-focused! NO EMOJIS in headers unless the puzzle itself uses emojis):**

**IMPORTANT: Vary your structure! Don't use the same format every time. Here are some creative approaches you can mix and match:**

**Approach 1: Story-Driven**
- Start with an engaging narrative or scenario
- Weave the puzzle into a story
- Reveal the solution through the narrative

**Approach 2: Problem-Solution Focus**
- Lead with the challenge
- Build suspense about the difficulty
- Reveal the solution step-by-step

**Approach 3: Behind-the-Scenes**
- Start with puzzle creation/selection story (if available)
- Explain what makes it special
- Then show how to solve it

**Approach 4: Quick Guide Style**
- Get straight to the point
- Focus on practical solving tips
- Keep it punchy and direct

**Approach 5: Puzzle Deep Dive**
- Start with what makes this puzzle unique
- Explore interesting aspects
- Then provide solution guidance

**REQUIRED CONTENT (but organize it creatively - 300-500 words total):**
- Engaging introduction that includes "${puzzle.answer}" naturally for SEO (50-100 words)
- Solution explanation or solving approach (100-200 words) - vary how you present this!
- What makes this puzzle interesting/unique (50-100 words)
${hasOriginStory ? "- Puzzle origin/inspiration/history story (50-80 words) - weave this in creatively!" : ""}
- Call to action encouraging more puzzles (30-50 words)

**VARIETY REQUIREMENTS:**
- Use different section headings - don't always use "How to Solve", "The Puzzle", etc.
- Vary paragraph lengths and structure
- Mix up your writing style - sometimes conversational, sometimes direct, sometimes storytelling
- Change the order of information - sometimes start with solution, sometimes with story, sometimes with challenge
- Use different hooks - questions, statements, scenarios, facts
- Vary your tone slightly - some posts can be more playful, others more informative

---

**WRITING REQUIREMENTS:**
- Use proper Markdown formatting with headers, subheaders, lists, and emphasis
- Keep paragraphs short (2-3 sentences max) - but vary paragraph structure
- Use a playful, enthusiastic tone - but vary the specific style
- Focus on the puzzle itself - it's the star!
- Make it fun and engaging, not academic
- DO NOT use emojis in the blog post unless the puzzle itself contains emojis (like rebus puzzles)
- Target 300-500 words total - be concise!
- Ensure SEO-friendly structure with proper headings
- Make readers excited about puzzles!
- **CRITICAL: Make this post feel different from other blog posts - be creative with structure, style, and approach!**

**SEO REQUIREMENTS (CRITICAL):**
- Include the puzzle answer "${puzzle.answer}" naturally 3-5 times throughout the content (but NOT in the title!)
- Use puzzle-related keywords naturally (solve, puzzle, challenge, answer, how to solve, puzzle solution, etc.)
- Include "${puzzleTypeName.toLowerCase()} puzzle" naturally in the content
- Structure with clear H2/H3 headings for SEO
- Make the title SEO-friendly but still fun (focus on puzzle type, difficulty, or solving approach - NOT the answer)
- First paragraph should include the answer and key keywords (but title should not!)

**PUZZLE ORIGIN STORY (if available):**
${
  hasOriginStory
    ? `- Include information about the puzzle's origin, inspiration, or history if provided above
- If it's a custom puzzle, explain why it was created and what inspired it
- If it's an existing puzzle, explain why we chose it
- Share any interesting history or background about the puzzle
- Make this part engaging and add to the puzzle's story`
    : "- No origin/inspiration/history information provided - skip this section"
}

**QUALITY STANDARDS:**
- Keep it playful and fun - celebrate the puzzle!
- Focus on the solving experience
- Make it accessible to all puzzle skill levels
- Create content that makes readers want to solve more puzzles
- Be concise - every word counts for SEO!

Format as clean Markdown. Do not include the puzzle image itself, just text descriptions.`;
    },
  },
} as const;
