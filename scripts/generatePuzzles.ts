import fs from "fs";
import path from "path";
import { generateSinglePuzzleForOfflineUse } from "../app/actions/puzzleGenerationActions";

interface Puzzle {
  rebusPuzzle: string;
  difficulty: number;
  answer: string;
  explanation: string;
  hints: string[];
  topic: string;
  keyword: string;
  category: string;
  relevanceScore: number;
}

const NUM_PUZZLES_TO_GENERATE = 100;
const OUTPUT_FILE = path.join(process.cwd(), "public", "puzzles.json");

async function generate() {
  const allPuzzles: Puzzle[] = [];
  const existingKeywords = new Set<string>();
  console.log(`Starting generation of ${NUM_PUZZLES_TO_GENERATE} puzzles...`);

  // Read existing puzzles to avoid duplicates
  if (fs.existsSync(OUTPUT_FILE)) {
    const existingPuzzles: Puzzle[] = JSON.parse(
      fs.readFileSync(OUTPUT_FILE, "utf-8")
    );
    existingPuzzles.forEach((p: Puzzle) =>
      existingKeywords.add(p.keyword.toLowerCase())
    );
    console.log(
      `Loaded ${existingKeywords.size} existing keywords to avoid duplicates.`
    );
    allPuzzles.push(...existingPuzzles);
  }

  while (allPuzzles.length < NUM_PUZZLES_TO_GENERATE) {
    console.log(
      `Generated ${allPuzzles.length} of ${NUM_PUZZLES_TO_GENERATE} puzzles.`
    );
    try {
      const puzzleData = await generateSinglePuzzleForOfflineUse(
        Array.from(existingKeywords)
      );

      if (
        puzzleData &&
        !existingKeywords.has(puzzleData.keyword.toLowerCase())
      ) {
        allPuzzles.push(puzzleData);
        existingKeywords.add(puzzleData.keyword.toLowerCase());
        fs.writeFileSync(OUTPUT_FILE, JSON.stringify(allPuzzles, null, 2));
      } else if (puzzleData) {
        console.log(`Skipping duplicate keyword: ${puzzleData.keyword}`);
      }
    } catch (error) {
      console.error("Failed to generate puzzle:", error);
    }
  }

  console.log(
    `Successfully generated puzzles. Total count: ${allPuzzles.length}. Saved to ${OUTPUT_FILE}`
  );
}

generate();
