import { config } from "dotenv";
import { closeConnection } from "@/db/mongodb";
import {
  CANONICAL_BOARD_BACKFILL_DEFAULT_LIMIT,
  createCanonicalBoardBackfill,
} from "@/lib/game/canonical-board-backfill";
import { createMongoCanonicalBoardBackfillSource } from "@/lib/game/mongo-canonical-board-backfill-source";

config({ path: ".env.local", quiet: true });
// A one-off maintenance run must not trigger the application's background index writer.
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
  const dryRun = process.argv.includes("--dry-run");
  const backfill = createCanonicalBoardBackfill(createMongoCanonicalBoardBackfillSource());
  const report = await backfill.run({
    dryRun,
    limit: numericArgument("limit") ?? CANONICAL_BOARD_BACKFILL_DEFAULT_LIMIT,
  });
  console.log(JSON.stringify(report, null, 2));
  // Failures were left unchanged; a non-zero exit makes them impossible to miss in CI or a shell.
  if (report.failed > 0) process.exitCode = 1;
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  })
  .finally(async () => {
    await closeConnection();
  });
