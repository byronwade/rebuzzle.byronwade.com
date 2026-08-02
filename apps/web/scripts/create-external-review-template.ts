import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type {
  ExternalCorpusArtifact,
  ExternalPuzzleReviewFile,
} from "../src/ai/puzzle-agent/benchmark/external-corpus";
import { assertExternalCorpusArtifact } from "../src/ai/puzzle-agent/benchmark/external-corpus";

const REPOSITORY_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");

function arg(name: string): string | undefined {
  return process.argv.find((value) => value.startsWith(`--${name}=`))?.slice(name.length + 3);
}

async function main(): Promise<void> {
  const corpusPath = path.resolve(
    arg("corpus") ??
      path.join(
        REPOSITORY_ROOT,
        "artifacts",
        "puzzle-generator",
        "external",
        "re-bus-hf-v1.json"
      )
  );
  const outputPath = path.resolve(
    arg("output") ?? corpusPath.replace(/\.json$/i, ".reviews.json")
  );
  const raw: unknown = JSON.parse(await readFile(corpusPath, "utf8"));
  assertExternalCorpusArtifact(raw);
  const reviews = Object.fromEntries(
    raw.rows
      .filter((entry) => !entry.isAugmented)
      .map((entry) => [
        entry.id,
        {
          rights: "pending" as const,
          answer: "pending" as const,
          note: `${entry.difficulty} | ${entry.sourceUrl} | ${entry.answer}`,
        },
      ])
  );
  const reviewFile: ExternalPuzzleReviewFile = {
    schemaVersion: 1,
    datasetId: raw.dataset.id,
    revision: raw.dataset.revision,
    reviews,
  };
  await mkdir(path.dirname(outputPath), { recursive: true });
  await writeFile(outputPath, `${JSON.stringify(reviewFile, null, 2)}\n`, {
    encoding: "utf8",
    flag: "wx",
  });
  console.log(`[external-review] originals=${Object.keys(reviews).length}`);
  console.log(`[external-review] template=${outputPath}`);
  console.log(
    "[external-review] Set both decisions to approved and add reviewer/reviewedAt only after checking source rights, image quality, and the answer. Rejected or pending rows cannot run."
  );
}

void main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
