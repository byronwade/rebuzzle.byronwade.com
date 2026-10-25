#!/usr/bin/env python3
"""Fetch pinned metadata, verify bytes, inventory evaluation references. No images or API keys."""
import argparse
import csv
import hashlib
import io
import json
import pathlib
import urllib.request
from collections import Counter

ROOT = pathlib.Path(__file__).resolve().parents[4]
MANIFEST = ROOT / "apps/web/docs/research/puzzle-datasets.json"
MAX_BYTES = 10 * 1024 * 1024


def load_metadata(dataset, output, offline=False):
    target = output / (dataset["id"] + ".metadata")
    if offline:
        data = target.read_bytes()
    else:
        url = dataset["metadataUrl"]
        if "/resolve/" + dataset["revision"] + "/" not in url:
            raise ValueError("Metadata URL must be pinned")
        with urllib.request.urlopen(url, timeout=40) as response:
            data = response.read(MAX_BYTES + 1)
    if len(data) > MAX_BYTES or hashlib.sha256(data).hexdigest() != dataset["metadataSha256"]:
        raise ValueError("Metadata size/digest mismatch for " + dataset["id"])
    target.write_bytes(data)
    return data.decode("utf-8-sig")


def references(dataset, text):
    fmt = dataset["format"]
    records = [json.loads(line) for line in text.splitlines() if line.strip()] if fmt == "columbus-jsonl" else list(csv.DictReader(io.StringIO(text)))
    for index, row in enumerate(records):
        if fmt == "columbus-jsonl":
            answer = row["options"][row["correct"]]
            aliases = []
            image = dataset["imageBase"] + row["file_name"]
            augmented = False
        elif fmt == "movva-csv":
            answer = row["solution"]
            aliases = json.loads(row["alternate_solutions"]) if row["alternate_solutions"].strip() else []
            image = dataset["imageBase"] + row["filename"]
            augmented = False
        else:
            answer = row["answer"]
            aliases = []
            image = row["img_url"]
            augmented = row.get("is_augmented", "").lower() in ("1", "1.0", "true", "yes")
        yield {"id": f'{dataset["id"]}:{index + 1}', "answer": answer, "aliases": aliases,
               "imageUrl": image, "augmented": augmented, "reviewStatus": "pending",
               "eligibleForTraining": False, "eligibleForEvaluation": False}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output", type=pathlib.Path, default=ROOT / "artifacts/puzzle-research")
    parser.add_argument("--offline", action="store_true")
    args = parser.parse_args()
    args.output.mkdir(parents=True, exist_ok=True)
    manifest = json.loads(MANIFEST.read_text())
    summaries, answers = [], set()
    for dataset in manifest["datasets"]:
        if "metadataUrl" not in dataset:
            summaries.append({"id": dataset["id"], "use": dataset["use"], "imported": False})
            continue
        rows = list(references(dataset, load_metadata(dataset, args.output, args.offline)))
        for row in rows:
            answers.update([row["answer"], *row["aliases"]])
        (args.output / (dataset["id"] + ".references.jsonl")).write_text("".join(json.dumps(row, ensure_ascii=False) + "\n" for row in rows))
        counts = Counter("augmented" if row["augmented"] else "original" for row in rows)
        summaries.append({"id": dataset["id"], "revision": dataset["revision"], "metadataSha256": dataset["metadataSha256"],
                          "rows": len(rows), "originals": counts["original"], "augmented": counts["augmented"],
                          "uniqueAnswers": len({row["answer"].lower() for row in rows}), "eligibleForTraining": 0,
                          "eligibleForEvaluation": 0, "reviewStatus": "pending", "imported": True})
    (args.output / "benchmark-answers.json").write_text(json.dumps(sorted(answers), ensure_ascii=False, indent=2) + "\n")
    report = {"checkedAt": manifest["checkedAt"], "datasets": summaries, "benchmarkAnswerStrings": len(answers),
              "imagesDownloaded": 0, "trainingExamplesApproved": 0}
    (args.output / "inventory.json").write_text(json.dumps(report, indent=2) + "\n")
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
