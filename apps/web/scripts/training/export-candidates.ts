import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { getCollection, closeConnection } from "../../src/db/mongodb";
import { CandidateRecordSchema } from "../../src/ai/training/candidate-record";

const arg = (name: string) => process.argv.find((a) => a.startsWith(`--${name}=`))?.slice(name.length + 3);
async function main() {
  const output = path.resolve(arg("output") ?? "../../artifacts/puzzle-training/candidates.jsonl");
  const limit = Number(arg("limit") ?? 10000);
  if (!Number.isInteger(limit) || limit < 1 || limit > 100000) throw new Error("Limit must be an integer between 1 and 100000");
  const docs = await getCollection("puzzleTrainingCandidates").find({ schemaVersion: 1 }).sort({ capturedAt: -1 }).limit(limit).toArray();
  const records = docs.map((doc) => CandidateRecordSchema.parse(doc));
  await mkdir(path.dirname(output), { recursive: true });
  await writeFile(output, records.map((r) => JSON.stringify(r)).join("\n") + (records.length ? "\n" : ""), { flag: "wx" });
  console.log(`Exported ${records.length} candidate records to ${output}`);
}
void main().catch((error) => { console.error(error instanceof Error ? error.message : String(error)); process.exitCode = 1; }).finally(() => closeConnection());
