import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { auditStaticPuzzleCorpus } from "../src/ai/puzzle-agent/benchmark/static-audit";

function arg(name: string, fallback: string): string {
  return process.argv.find((value) => value.startsWith(`--${name}=`))?.slice(name.length + 3) ?? fallback;
}

async function main(): Promise<void> {
  const output = path.resolve(arg("output", "artifacts/puzzle-generator/static-audit.json"));
  const report = await auditStaticPuzzleCorpus();
  await mkdir(path.dirname(output), { recursive: true });
  await writeFile(
    output,
    `${JSON.stringify({ generatedAt: new Date().toISOString(), report }, null, 2)}\n`,
    "utf8"
  );

  console.log(
    `[static-audit] promotion=${report.promotion.passed} puzzles=${report.puzzlePassCount}/${report.puzzleCount} profiles=${report.renderedProfileCount}/${report.expectedRenderedProfileCount} assets=${report.assetPassCount}/${report.assetCount}`
  );
  console.log(`[static-audit] report: ${output}`);
  if (!report.promotion.passed) {
    report.promotion.failures.forEach((failure) => console.error(`[static-audit] ${failure}`));
    process.exitCode = 1;
  }
}

void main().catch((error) => {
  console.error(error instanceof Error ? error.stack ?? error.message : String(error));
  process.exitCode = 1;
});
