import { runJourneyProgressBackfill } from "../src/db/daily-progress-backfill";

try {
  const result = await runJourneyProgressBackfill({
    onProgress: ({ userId, status, processed, inserted, skipped, errors }) => {
      console.info(
        JSON.stringify({ userId, status, processed, inserted, skipped, errors })
      );
    },
  });
  console.info(JSON.stringify({ status: "complete", ...result }));
} catch (error) {
  console.error("Journey progress backfill stopped; rerun to resume from its last completed batch.", error);
  process.exitCode = 1;
}
