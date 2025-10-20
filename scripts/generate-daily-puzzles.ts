/**
 * Daily Puzzle Generation Script
 * 
 * Generates and stores puzzles for the next day
 * Run this nightly via Vercel Cron
 */

import { config } from 'dotenv';
import { generateMasterPuzzle } from '../src/ai/advanced';
import { db } from '../src/db';
import { checkDatabaseHealth } from '../src/db/mongodb';

// Load environment variables
config({ path: '.env.local' });

/**
 * Generate a puzzle for a specific date
 */
async function generatePuzzleForDate(date: Date): Promise<void> {
  console.log(`🧩 Generating puzzle for ${date.toISOString().split('T')[0]}...`);

  try {
    // Check if puzzle already exists for this date
    const existingPuzzle = await db.puzzleOps.findTodaysPuzzle();
    if (existingPuzzle) {
      console.log(`✅ Puzzle already exists for ${date.toISOString().split('T')[0]}`);
      return;
    }

    // Generate new puzzle using AI
    console.log('🤖 Generating puzzle with AI...');
    const result = await generateMasterPuzzle();

    if (!result.success) {
      throw new Error(`AI generation failed: ${result.error}`);
    }

    // Create puzzle document
    const puzzle = {
      id: crypto.randomUUID(),
      rebusPuzzle: result.puzzle.rebusPuzzle,
      answer: result.puzzle.answer,
      difficulty: result.puzzle.difficulty as 'easy' | 'medium' | 'hard',
      category: result.puzzle.category || 'general',
      explanation: result.puzzle.explanation,
      hints: result.puzzle.hints || [],
      publishedAt: date,
      createdAt: new Date(),
      active: true,
      metadata: {
        topic: result.puzzle.category,
        keyword: result.puzzle.answer.replace(/\s+/g, ''),
        category: result.puzzle.category,
        seoMetadata: result.puzzle.seoMetadata || {},
        aiGenerated: true,
        qualityScore: result.metadata.qualityMetrics?.scores?.overall || 0,
        uniquenessScore: result.metadata.uniquenessScore || 0,
        generatedAt: new Date().toISOString(),
      },
    };

    // Store in database
    console.log('💾 Storing puzzle in database...');
    await db.puzzleOps.create(puzzle);

    console.log(`✅ Puzzle generated and stored successfully!`);
    console.log(`📝 Puzzle: ${puzzle.rebusPuzzle}`);
    console.log(`🎯 Answer: ${puzzle.answer}`);
    console.log(`📊 Difficulty: ${puzzle.difficulty}`);
    console.log(`🏷️ Category: ${puzzle.category}`);

  } catch (error) {
    console.error(`❌ Error generating puzzle for ${date.toISOString().split('T')[0]}:`, error);
    throw error;
  }
}

/**
 * Generate puzzles for multiple dates
 */
async function generatePuzzlesForDates(dates: Date[]): Promise<void> {
  console.log(`📅 Generating puzzles for ${dates.length} dates...`);

  for (const date of dates) {
    try {
      await generatePuzzleForDate(date);
    } catch (error) {
      console.error(`❌ Failed to generate puzzle for ${date.toISOString().split('T')[0]}:`, error);
      // Continue with other dates even if one fails
    }
  }

  console.log('🎉 Puzzle generation completed!');
}

/**
 * Main function
 */
async function main(): Promise<void> {
  console.log('🚀 Starting daily puzzle generation...');

  try {
    // Check database health
    console.log('🔍 Checking database health...');
    const health = await checkDatabaseHealth();
    if (!health.healthy) {
      throw new Error(`Database health check failed: ${health.error}`);
    }
    console.log(`✅ Database healthy (${health.latency}ms)`);

    // Parse command line arguments
    const args = process.argv.slice(2);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (args.includes('--today')) {
      // Generate puzzle for today
      await generatePuzzleForDate(today);
    } else if (args.includes('--tomorrow')) {
      // Generate puzzle for tomorrow
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      await generatePuzzleForDate(tomorrow);
    } else if (args.includes('--week')) {
      // Generate puzzles for the next 7 days
      const dates: Date[] = [];
      for (let i = 1; i <= 7; i++) {
        const date = new Date(today);
        date.setDate(date.getDate() + i);
        dates.push(date);
      }
      await generatePuzzlesForDates(dates);
    } else {
      // Default: generate puzzle for tomorrow
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      await generatePuzzleForDate(tomorrow);
    }

    console.log('🎉 Daily puzzle generation completed successfully!');

  } catch (error) {
    console.error('❌ Daily puzzle generation failed:', error);
    process.exit(1);
  } finally {
    // Close database connection
    await db.closeConnection();
  }
}

// Run the script
if (require.main === module) {
  main().catch((error) => {
    console.error('❌ Script failed:', error);
    process.exit(1);
  });
}
