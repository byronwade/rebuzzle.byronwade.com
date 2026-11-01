/**
 * Compile missing canonical boards for published puzzles and queued daily candidates.
 *
 * Usage (from apps/web):
 *   pnpm db:backfill-canonical-boards                  dry run (default): compile and report, write nothing
 *   pnpm db:backfill-canonical-boards --dry-run        same, explicitly
 *   pnpm db:backfill-canonical-boards --apply          write the boards
 *   ... --limit=N                                      rows per collection (default 500, max 5000)
 *
 * The mode line goes to stderr so stdout stays a single JSON report. Exits non-zero when any
 * row failed to compile (those rows are left unchanged) or when the flags are invalid.
 */
import { config } from "dotenv";
import { closeConnection } from "@/db/mongodb";
import {
  createCanonicalBoardBackfill,
  parseCanonicalBoardBackfillArgs,
} from "@/lib/game/canonical-board-backfill";
import { createMongoCanonicalBoardBackfillSource } from "@/lib/game/mongo-canonical-board-backfill-source";

config({ path: ".env.local", quiet: true });
// A one-off maintenance run must not trigger the application's background index writer.
process.env.REBUZZLE_SKIP_AUTO_INDEXES = "1";

async function main() {
  const args = parseCanonicalBoardBackfillArgs(process.argv.slice(2));
  console.error(
    args.dryRun
      ? "Mode: DRY RUN (no writes). Pass --apply to write boards."
      : "Mode: APPLY (writing canonical boards)."
  );
  const backfill = createCanonicalBoardBackfill(createMongoCanonicalBoardBackfillSource());
  const report = await backfill.run(args);
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
