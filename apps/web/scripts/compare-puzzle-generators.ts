import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { compareGenerators } from "../src/ai/puzzle-agent/benchmark/generation-comparison";
const arg = (name: string) => process.argv.find((a) => a.startsWith(`--${name}=`))?.slice(name.length + 3);
async function jsonl(file: string | undefined): Promise<unknown[]> {
  if (!file) return [];
  return (await readFile(path.resolve(file), "utf8")).split(/\r?\n/).filter((line) => line.trim()).map((line) => JSON.parse(line));
}
async function main() {
  const observations = arg("observations"); const output = arg("output");
  if (!observations || !output) throw new Error("Use --observations=RUNS.jsonl --output=REPORT.json [--reviews=REVIEWS.jsonl] [--require-qualified]");
  const report = compareGenerators({ observations: await jsonl(observations), reviews: await jsonl(arg("reviews")) });
  await mkdir(path.dirname(path.resolve(output)), { recursive: true });
  await writeFile(path.resolve(output), JSON.stringify(report, null, 2) + "\n", { flag: "wx" });
  console.log(JSON.stringify(report, null, 2));
  if (process.argv.includes("--require-qualified") && report.decision !== "candidate-for-release-review") process.exitCode = 1;
}
void main().catch((error) => { console.error(error instanceof Error ? error.message : String(error)); process.exitCode = 1; });
