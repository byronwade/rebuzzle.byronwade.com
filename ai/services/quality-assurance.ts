/**
 * Quality Assurance Pipeline
 *
 * Multi-stage validation system for ensuring high-quality puzzles
 */

import { z } from "zod"
import { generateAIObject, withRetry } from "../client"
import { AI_CONFIG } from "../config"

// ============================================================================
// QUALITY METRICS
// ============================================================================

export interface QualityMetrics {
  overall: number               // 0-100: Overall quality score
  clarity: number               // 0-100: How clear is the puzzle?
  creativity: number            // 0-100: How creative is it?
  solvability: number           // 0-100: Is it reasonably solvable?
  appropriateness: number       // 0-100: Family-friendly?
  visualAppeal: number          // 0-100: Visually engaging?
  educationalValue: number      // 0-100: Does it teach something?
  funFactor: number             // 0-100: Is it enjoyable?
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
    verdict: z.enum(["excellent", "good", "acceptable", "needs_work", "reject"]),
  }),
  detailedFeedback: z.string(),
})

/**
 * Comprehensive quality analysis
 */
export async function analyzeQuality(puzzle: {
  rebusPuzzle: string
  answer: string
  explanation: string
  difficulty: number
  hints: string[]
}): Promise<z.infer<typeof QualityAnalysisSchema>> {
  const system = `You are a puzzle quality expert with high standards.

Evaluate puzzles across multiple dimensions:
- CLARITY: Is it understandable? No ambiguity?
- CREATIVITY: Is it clever and original?
- SOLVABILITY: Can it be solved with hints?
- APPROPRIATENESS: Family-friendly content?
- VISUAL APPEAL: Engaging and well-designed?
- EDUCATIONAL VALUE: Does it teach something?
- FUN FACTOR: Is it enjoyable to solve?

Be critical but fair. High scores (90+) should be rare.`

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

Be thorough and honest. This puzzle will be seen by thousands.`

  return await withRetry(async () => {
    return await generateAIObject({
      prompt,
      system,
      schema: QualityAnalysisSchema,
      temperature: AI_CONFIG.generation.temperature.factual,
      modelType: "smart",
    })
  })
}

// ============================================================================
// ADVERSARIAL TESTING
// ============================================================================

const AdversarialTestSchema = z.object({
  attacks: z.array(z.object({
    attackType: z.string(),
    issue: z.string(),
    severity: z.enum(["critical", "major", "minor"]),
    suggestion: z.string(),
  })),
  overallRobustness: z.number().min(0).max(100),
  passesAdversarialTest: z.boolean(),
})

/**
 * Adversarial testing - AI tries to find flaws
 */
export async function adversarialTest(puzzle: {
  rebusPuzzle: string
  answer: string
  explanation: string
}): Promise<z.infer<typeof AdversarialTestSchema>> {
  const system = `You are a puzzle critic. Your job is to find FLAWS and ISSUES.

Try to break the puzzle:
- Find ambiguities
- Identify alternative interpretations
- Look for cultural bias
- Check for offensive elements
- Find logical inconsistencies
- Test if explanation makes sense

Be adversarial but constructive.`

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

Then give overall robustness score and pass/fail.`

  return await withRetry(async () => {
    return await generateAIObject({
      prompt,
      system,
      schema: AdversarialTestSchema,
      temperature: AI_CONFIG.generation.temperature.factual,
      modelType: "smart",
    })
  })
}

// ============================================================================
// QUALITY PIPELINE
// ============================================================================

/**
 * Run complete quality assurance pipeline
 */
export async function runQualityPipeline(puzzle: {
  rebusPuzzle: string
  answer: string
  explanation: string
  difficulty: number
  hints: string[]
}): Promise<{
  passed: boolean
  qualityMetrics: z.infer<typeof QualityAnalysisSchema>
  adversarialResults: z.infer<typeof AdversarialTestSchema>
  finalScore: number
  verdict: "publish" | "revise" | "reject"
  actionItems: string[]
}> {
  // Stage 1: Quality analysis
  const qualityAnalysis = await analyzeQuality(puzzle)

  // Stage 2: Adversarial testing
  const adversarial = await adversarialTest(puzzle)

  // Stage 3: Calculate final score
  const finalScore = Math.round(
    qualityAnalysis.scores.overall * 0.7 +
    adversarial.overallRobustness * 0.3
  )

  // Stage 4: Determine verdict
  let verdict: "publish" | "revise" | "reject"
  const actionItems: string[] = []

  if (finalScore >= 85 && adversarial.passesAdversarialTest) {
    verdict = "publish"
  } else if (finalScore >= 70 && adversarial.attacks.filter(a => a.severity === "critical").length === 0) {
    verdict = "revise"
    actionItems.push(...qualityAnalysis.analysis.improvements)
    actionItems.push(...adversarial.attacks.filter(a => a.severity !== "minor").map(a => a.suggestion))
  } else {
    verdict = "reject"
    actionItems.push("Quality below acceptable threshold. Generate new puzzle.")
  }

  return {
    passed: verdict === "publish",
    qualityMetrics: qualityAnalysis,
    adversarialResults: adversarial,
    finalScore,
    verdict,
    actionItems,
  }
}

/**
 * Batch quality check for multiple puzzles
 */
export async function batchQualityCheck(
  puzzles: Array<{ rebusPuzzle: string; answer: string; explanation: string; difficulty: number; hints: string[] }>
): Promise<Array<{ puzzle: any; qualityScore: number; passed: boolean }>> {
  const results = await Promise.all(
    puzzles.map(async (puzzle) => {
      const qa = await runQualityPipeline(puzzle)
      return {
        puzzle,
        qualityScore: qa.finalScore,
        passed: qa.passed,
      }
    })
  )

  // Sort by quality
  return results.sort((a, b) => b.qualityScore - a.qualityScore)
}
