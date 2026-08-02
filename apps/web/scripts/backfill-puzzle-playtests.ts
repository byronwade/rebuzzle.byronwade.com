import { config } from "dotenv";
import { closeConnection } from "@/db/mongodb";
import { createMongoPuzzlePlaytestBackfillSource } from "@/ai/puzzle-agent/review/mongo-puzzle-playtest-backfill-source";
import { createMongoPuzzlePlaytestRepository } from "@/ai/puzzle-agent/review/mongo-puzzle-playtest-repository";
import { createPuzzlePlaytestBackfillService } from "@/ai/puzzle-agent/review/puzzle-playtest-backfill";
import { createPuzzlePlaytestService } from "@/ai/puzzle-agent/review/puzzle-playtest-service";

config({ path: ".env.local", quiet: true });
// A read-only dry run must not trigger the application's background index writer.
process.env.REBUZZLE_SKIP_AUTO_INDEXES = "1";

function numericArgument(name: string): number | undefined {
  const prefix = `--${name}=`;
  const raw = process.argv.find((argument) => argument.startsWith(prefix))?.slice(prefix.length);
  if (!raw) return undefined;
  const value = Number(raw);
  if (!Number.isFinite(value)) throw new Error(`Invalid ${name} value`);
  return value;
}

async function main() {
  const apply = process.argv.includes("--apply");
  const registry = createPuzzlePlaytestService(createMongoPuzzlePlaytestRepository());
  const backfill = createPuzzlePlaytestBackfillService(
    createMongoPuzzlePlaytestBackfillSource(),
    (input) => registry.submitCandidate(input)
  );
  const report = await backfill.run({ dryRun: !apply, limit: numericArgument("limit") });
  console.log(JSON.stringify(report, null, 2));
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  })
  .finally(async () => {
    await closeConnection();
  });
