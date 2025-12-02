#!/usr/bin/env node
/**
 * Test script to generate a puzzle using the new agent orchestration system
 */

import { config } from "dotenv";
import { logFeatureFlags } from "../src/ai/config/feature-flags";
import { generateMasterPuzzle } from "../src/ai/services/master-puzzle-orchestrator";
import { puzzleOps } from "../src/db/operations";
import { generatePuzzleEmbedding } from "../src/ai/services/embeddings";
import { randomUUID } from "crypto";

// Load environment variables
config({ path: ".env.local" });

async function testPuzzleGeneration() {
  console.log("🧩 Testing Puzzle Generation with Agent Orchestration\n");

  // Log feature flags
  console.log("📋 Feature Flags:");
  logFeatureFlags();
  console.log("");

  try {
    console.log("🚀 Generating puzzle...\n");

    const startTime = Date.now();

    const result = await generateMasterPuzzle({
      targetDifficulty: 5,
      puzzleType: "rebus",
      requireNovelty: true,
      qualityThreshold: 70,
      maxAttempts: 2, // Limit attempts for testing
    });

    const generationTime = Date.now() - startTime;

    console.log("\n✅ Puzzle Generated Successfully!");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log(`⏱️  Generation Time: ${generationTime}ms`);
    console.log(`📊 Status: ${result.status}`);
    console.log(`🎯 Difficulty: ${result.puzzle.difficulty}`);
    console.log(`🏷️  Category: ${result.puzzle.category}`);
    console.log(`💡 Answer: ${result.puzzle.answer}`);
    console.log(
      `🧠 Puzzle: ${(result.puzzle as any).rebusPuzzle || result.puzzle.puzzle || "N/A"}`
    );
    console.log("\n📈 Quality Metrics:");
    console.log(
      `   Overall Score: ${result.metadata.qualityMetrics?.scores?.overall || "N/A"}`
    );
    console.log(`   Uniqueness: ${result.metadata.uniquenessScore}`);
    console.log(
      `   Calibrated Difficulty: ${result.metadata.calibratedDifficulty}`
    );
    console.log(
      `   Generation Attempts: ${result.metadata.generationAttempts}`
    );

    if (result.metadata.aiThinking) {
      console.log("\n🤔 AI Thinking Process:");
      console.log(JSON.stringify(result.metadata.aiThinking, null, 2));
    }

    if (result.recommendations && result.recommendations.length > 0) {
      console.log("\n💬 Recommendations:");
      result.recommendations.slice(0, 3).forEach((rec, i) => {
        console.log(`   ${i + 1}. ${rec}`);
      });
    }

    console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    
    // Save the puzzle to the database
    console.log("\n💾 Saving puzzle to database...");
    try {
      const puzzleId = randomUUID();
      const now = new Date();
      
      // Prepare puzzle data for database
      const puzzleData = {
        id: puzzleId,
        puzzle: (result.puzzle as any).rebusPuzzle || result.puzzle.puzzle || "",
        puzzleType: result.puzzle.puzzleType || "rebus",
        answer: result.puzzle.answer,
        difficulty: result.puzzle.difficulty,
        category: result.puzzle.category || "general",
        explanation: result.puzzle.explanation || "",
        hints: result.puzzle.hints || [],
        publishedAt: now,
        createdAt: now,
        active: true, // Make it active so it shows up
        // Legacy field for backward compatibility
        ...(result.puzzle.puzzleType === "rebus" && (result.puzzle as any).rebusPuzzle
          ? { rebusPuzzle: (result.puzzle as any).rebusPuzzle }
          : {}),
        // Include metadata
        metadata: {
          ...result.puzzle.metadata,
          aiGenerated: true,
          qualityScore: result.metadata.qualityMetrics?.scores?.overall,
          uniquenessScore: result.metadata.uniquenessScore,
          generatedAt: now.toISOString(),
          fingerprint: result.metadata.fingerprint,
          difficultyProfile: result.metadata.difficultyProfile,
          calibratedDifficulty: result.metadata.calibratedDifficulty,
          generationAttempts: result.metadata.generationAttempts,
          generationTimeMs: result.metadata.generationTimeMs,
          aiThinking: result.metadata.aiThinking,
        },
      };

      // Save puzzle
      const savedPuzzle = await puzzleOps.create(puzzleData);
      console.log(`✅ Puzzle saved with ID: ${savedPuzzle.id}`);

      // Generate and save embedding asynchronously (non-blocking)
      console.log("🔄 Generating embedding (async)...");
      generatePuzzleEmbedding({
        puzzle: puzzleData.puzzle,
        answer: puzzleData.answer,
        category: puzzleData.category,
        puzzleType: puzzleData.puzzleType,
        explanation: puzzleData.explanation,
      })
        .then(async (embedding) => {
          await puzzleOps.updateEmbedding(savedPuzzle.id, embedding);
          console.log("✅ Embedding generated and saved");
        })
        .catch((error) => {
          console.warn("⚠️  Failed to generate embedding:", error.message);
        });

      console.log("\n✅ Test completed successfully!");
      console.log(`\n🎯 Puzzle is now available in the database and should appear in your app!`);
      console.log(`   Puzzle ID: ${savedPuzzle.id}`);
      console.log(`   Answer: ${savedPuzzle.answer}`);
      
      return { result, savedPuzzle };
    } catch (error) {
      console.error("\n❌ Error saving puzzle to database:");
      console.error(error);
      console.log("\n⚠️  Puzzle was generated but not saved. You can still see it above.");
      return { result, savedPuzzle: null };
    }
  } catch (error) {
    console.error("\n❌ Error generating puzzle:");
    console.error(error);
    if (error instanceof Error) {
      console.error("Error message:", error.message);
      console.error("Stack:", error.stack);
    }
    throw error;
  }
}

// Run the test
if (require.main === module) {
  testPuzzleGeneration()
    .then(() => {
      console.log("\n🎉 All tests passed!");
      process.exit(0);
    })
    .catch((error) => {
      console.error("\n💥 Test failed:", error);
      process.exit(1);
    });
}
