import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { buildPuzzleSolveBenchmarkCorpus } from "../../src/ai/puzzle-agent/benchmark/puzzle-corpus";
import { prepareTrainingDataset } from "../../src/ai/training/prepare-dataset";

const arg = (name: string) => process.argv.find((a) => a.startsWith(`--${name}=`))?.slice(name.length + 3);
async function readJsonl(file: string | undefined): Promise<unknown[]> {
  if (!file) return [];
  return (await readFile(path.resolve(file), "utf8")).split(/\r?\n/).filter((line) => line.trim()).map((line) => JSON.parse(line));
}
async function main() {
  const output = path.resolve(arg("output") ?? "../../artifacts/puzzle-training/prepared");
  // Refuse accidental reuse of an old export containing stale training files.
  await mkdir(output, { recursive: false });
  const benchmarkPath = arg("benchmark-answers") ?? path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../../../artifacts/puzzle-research/benchmark-answers.json");
  // Research metadata must be available before creating trainable exports.
  const external: unknown = JSON.parse(await readFile(benchmarkPath, "utf8"));
  if (!Array.isArray(external) || external.some((a) => typeof a !== "string")) throw new Error("Benchmark answers must be a JSON string array");
  const data = prepareTrainingDataset({
    candidates: await readJsonl(arg("candidates")),
    reviews: await readJsonl(arg("reviews")),
    preferences: await readJsonl(arg("preferences")),
    benchmarkAnswers: [...buildPuzzleSolveBenchmarkCorpus().map((p) => p.answer), ...external],
  });
  const fileSha256: Record<string, string> = {};
  for (const format of ["sft", "dpo", "ranker"] as const) {
    for (const split of ["train", "validation", "test"] as const) {
      const filename = `${format}.${split}.jsonl`;
      const content = data[format][split].map((row) => JSON.stringify(row)).join("\n") + (data[format][split].length ? "\n" : "");
      fileSha256[filename] = createHash("sha256").update(content).digest("hex");
      await writeFile(path.join(output, filename), content);
    }
  }
  await writeFile(path.join(output, "report.json"), JSON.stringify({ ...data.report, fileSha256 }, null, 2) + "\n");
  console.log(JSON.stringify({ ...data.report, splitManifest: undefined }, null, 2));
  if (process.argv.includes("--require-ready") && !data.report.readyForTraining) process.exitCode = 1;
}
void main().catch((error) => { console.error(error instanceof Error ? error.message : String(error)); process.exitCode = 1; });
