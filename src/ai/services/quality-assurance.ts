/**
 * Quality Assurance Pipeline
 *
 * Multi-stage validation system for ensuring high-quality puzzles
 */

import { z } from "zod";
import { generateAIObject, withRetry } from "../client";
import { AI_CONFIG } from "../config";

// ============================================================================
// QUALITY METRICS
// ============================================================================

export interface QualityMetrics {
  overall: number; // 0-100: Overall quality score
  clarity: number; // 0-100: How clear is the puzzle?
  creativity: number; // 0-100: How creative is it?
  solvability: number; // 0-100: Is it reasonably solvable?
  appropriateness: number; // 0-100: Family-friendly?
  visualAppeal: number; // 0-100: Visually engaging?
  educationalValue: number; // 0-100: Does it teach something?
  funFactor: number; // 0-100: Is it enjoyable?
}

const QualityAnalysisSchema = z.object({
  scores: z.object({
    clarity: z.number().min(0).max(100),
    creativity: z.number().min(0).max(100),
    solvability: z.number().min(0).max(100),
    appropriateness: z.number().min(0).max(100),
    visualAppeal: z.number().min(0).max(100),
    educationalValue: z.number().min(0).max(100),
    funFactor: z.number().min(0).max(100),
    overall: z.number().min(0).max(100),
  }),
  analysis: z.object({
    strengths: z.array(z.string()),
    weaknesses: z.array(z.string()),
    improvements: z.array(z.string()),
    verdict: z.enum([
      "excellent",
      "good",
      "acceptable",
      "needs_work",
      "reject",
    ]),
  }),
  detailedFeedback: z.string(),
});

/**
 * Comprehensive quality analysis
 */
export async function analyzeQuality(puzzle: {
  rebusPuzzle: string;
  answer: string;
  explanation: string;
  difficulty: number;
  hints: string[];
}): Promise<z.infer<typeof QualityAnalysisSchema>> {
  const system = `You are a puzzle quality expert with balanced, realistic standards.

Evaluate puzzles across multiple dimensions:
- CLARITY: Is it understandable? No major ambiguity?
- CREATIVITY: Is it clever and original?
- SOLVABILITY: Can it be solved with hints?
- APPROPRIATENESS: Family-friendly content?
- VISUAL APPEAL: Engaging and well-designed?
- EDUCATIONAL VALUE: Does it teach something?
- FUN FACTOR: Is it enjoyable to solve?

SCORING GUIDELINES:
- 80-100: Exceptional puzzles (rare, truly outstanding)
- 70-79: High quality puzzles (good, publishable)
- 60-69: Acceptable puzzles (decent, may need minor improvements)
- 50-59: Needs work (significant issues)
- Below 50: Poor quality (major problems)

Be fair and balanced. A puzzle that is solvable, clear, creative, and fun should score 70+. Only mark down for real issues, not perfectionism.`;

  const prompt = `Analyze this rebus puzzle comprehensively:

Puzzle: "${puzzle.rebusPuzzle}"
Answer: "${puzzle.answer}"
Explanation: "${puzzle.explanation}"
Difficulty: ${puzzle.difficulty}/10
Hints: ${puzzle.hints.join(", ")}

Provide:
1. Score each dimension (0-100)
2. Calculate overall score
3. List strengths
4. List weaknesses
5. Suggest improvements
6. Give verdict: excellent/good/acceptable/needs_work/reject

Be thorough and honest. This puzzle will be seen by thousands.`;

  return await withRetry(
    async () =>
      await generateAIObject({
        prompt,
        system,
        schema: QualityAnalysisSchema,
        temperature: AI_CONFIG.generation.temperature.factual,
        modelType: "smart",
      })
  );
}

// ============================================================================
// ADVERSARIAL TESTING
// ============================================================================

const AdversarialTestSchema = z.object({
  attacks: z.array(
    z.object({
      attackType: z.string(),
      issue: z.string(),
      severity: z.enum(["critical", "major", "minor"]),
      suggestion: z.string(),
    })
  ),
  overallRobustness: z.number().min(0).max(100),
  passesAdversarialTest: z.boolean(),
});

/**
 * Adversarial testing - AI tries to find flaws
 */
export async function adversarialTest(puzzle: {
  rebusPuzzle: string;
  answer: string;
  explanation: string;
}): Promise<z.infer<typeof AdversarialTestSchema>> {
  const system = `You are a puzzle reviewer. Your job is to find REAL FLAWS and ISSUES, not nitpick.

Focus on finding:
- Major ambiguities (not minor edge cases)
- Serious alternative interpretations (not theoretical possibilities)
- Actual cultural bias or offensive elements
- Real logical inconsistencies
- Problems with the explanation

Be constructive and fair. Only flag issues that would actually confuse or offend real players. Don't be overly critical - minor imperfections are acceptable.`;

  const prompt = `Attack this rebus puzzle - find all flaws:

Puzzle: "${puzzle.rebusPuzzle}"
Answer: "${puzzle.answer}"
Explanation: "${puzzle.explanation}"

Try these attacks:
1. AMBIGUITY: Could symbols mean something else?
2. ALTERNATIVE ANSWERS: Are there other valid answers?
3. CLARITY: Is any part confusing?
4. BIAS: Any cultural/regional bias?
5. LOGIC: Does explanation hold up?
6. APPROPRIATENESS: Any potential issues?

For each issue found:
- Type of attack
- What's the issue
- Severity (critical/major/minor)
- How to fix it

Then give overall robustness score and pass/fail.`;

  return await withRetry(
    async () =>
      await generateAIObject({
        prompt,
        system,
        schema: AdversarialTestSchema,
        temperature: AI_CONFIG.generation.temperature.factual,
        modelType: "smart",
      })
  );
}

// ============================================================================
// QUALITY PIPELINE
// ============================================================================

/**
 * Run complete quality assurance pipeline
 */
export async function runQualityPipeline(
  puzzle: {
    rebusPuzzle: string;
    answer: string;
    explanation: string;
    difficulty: number;
    hints: string[];
  },
  options?: {
    skipAdversarial?: boolean; // Skip adversarial test to reduce API calls
  }
): Promise<{
  passed: boolean;
  qualityMetrics: z.infer<typeof QualityAnalysisSchema>;
  adversarialResults: z.infer<typeof AdversarialTestSchema> | null;
  finalScore: number;
  verdict: "publish" | "revise" | "reject";
  actionItems: string[];
}> {
  // Stage 1: Quality analysis
  const qualityAnalysis = await analyzeQuality(puzzle);

  // Stage 2: Adversarial testing (optional - can be skipped to reduce API calls)
  let adversarial: z.infer<typeof AdversarialTestSchema> | null = null;
  let robustnessScore = 70; // Default robustness if skipped (assume decent quality)

  if (options?.skipAdversarial) {
    if (process.env.NODE_ENV === "development") {
      console.log("[Quality] Skipping adversarial test to reduce API calls");
    }
  } else {
    adversarial = await adversarialTest(puzzle);

    // Fix robustness score bug: if AI returns decimal (0.4), multiply by 100 to get 0-100 scale
    robustnessScore = adversarial.overallRobustness;
    if (robustnessScore < 1 && robustnessScore > 0) {
      // Likely a decimal (0.4 = 40%), multiply by 100
      robustnessScore = robustnessScore * 100;
      if (process.env.NODE_ENV === "development") {
        console.warn(
          `[Quality] Fixed robustness score: ${adversarial.overallRobustness} -> ${robustnessScore}`
        );
      }
    }
    // Ensure robustness is in 0-100 range
    robustnessScore = Math.max(0, Math.min(100, robustnessScore));
  }

  // Stage 3: Calculate final score
  // If overall quality is high (>= 75), use it more heavily; otherwise use robustness
  const finalScore = adversarial
    ? Math.round(qualityAnalysis.scores.overall * 0.7 + robustnessScore * 0.3)
    : qualityAnalysis.scores.overall; // If adversarial skipped, use overall score directly

  // Stage 4: Determine verdict
  let verdict: "publish" | "revise" | "reject";
  const actionItems: string[] = [];

  // More lenient thresholds - focus on real quality, not perfection
  // If overall quality is high (>= 70), accept even without adversarial test
  if (
    qualityAnalysis.scores.overall >= 70 &&
    (!adversarial || adversarial.passesAdversarialTest)
  ) {
    verdict = "publish";
  } else if (
    finalScore >= 60 &&
    (!adversarial ||
      adversarial.attacks.filter((a) => a.severity === "critical").length === 0)
  ) {
    verdict = "revise";
    actionItems.push(...qualityAnalysis.analysis.improvements);
    if (adversarial) {
      actionItems.push(
        ...adversarial.attacks
          .filter((a) => a.severity !== "minor")
          .map((a) => a.suggestion)
      );
    }
  } else {
    verdict = "reject";
    actionItems.push(
      "Quality below acceptable threshold. Generate new puzzle."
    );
  }

  return {
    passed: verdict === "publish",
    qualityMetrics: qualityAnalysis,
    adversarialResults: adversarial,
    finalScore,
    verdict,
    actionItems,
  };
}

/**
 * Batch quality check for multiple puzzles
 */
export async function batchQualityCheck(
  puzzles: Array<{
    rebusPuzzle: string;
    answer: string;
    explanation: string;
    difficulty: number;
    hints: string[];
  }>
): Promise<Array<{ puzzle: any; qualityScore: number; passed: boolean }>> {
  const results = await Promise.all(
    puzzles.map(async (puzzle) => {
      const qa = await runQualityPipeline(puzzle);
      return {
        puzzle,
        qualityScore: qa.finalScore,
        passed: qa.passed,
      };
    })
  );

  // Sort by quality
  return results.sort((a, b) => b.qualityScore - a.qualityScore);
}
