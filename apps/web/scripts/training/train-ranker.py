#!/usr/bin/env python3
"""Train an offline pairwise logistic ranker from reviewed preferences (CPU, standard library)."""
import argparse
import hashlib
import json
import math
import pathlib


def probability(margin):
    return 1.0 / (1.0 + math.exp(-max(-40.0, min(40.0, margin))))


def dot(a, b):
    return sum(x * y for x, y in zip(a, b))


def train(rows, width, epochs=500, rate=0.15, l2=0.01):
    weights = [0.0] * width
    for _ in range(epochs):
        gradient = [0.0] * width
        for row in rows:
            diff = [a - b for a, b in zip(row["chosen"], row["rejected"])]
            residual = probability(dot(weights, diff)) - 1.0
            for index, value in enumerate(diff):
                gradient[index] += residual * value
        weights = [w - rate * (g / len(rows) + l2 * w) for w, g in zip(weights, gradient)]
    return weights


def metrics(weights, rows):
    margins = [dot(weights, [a - b for a, b in zip(row["chosen"], row["rejected"])]) for row in rows]
    # Ties receive half credit, not a free correct label.
    wins = sum(1 if m > 1e-10 else 0.5 if abs(m) <= 1e-10 else 0 for m in margins)
    n = len(rows)
    accuracy = wins / n if n else None
    return {"pairs": n, "accuracy": accuracy,
            "logLoss": sum(-math.log(max(1e-12, probability(m))) for m in margins) / n if n else None,
            "groups": len({row["group"] for row in rows})}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--dataset", required=True, type=pathlib.Path)
    parser.add_argument("--output", required=True, type=pathlib.Path)
    args = parser.parse_args()
    report = json.loads((args.dataset / "report.json").read_text())
    features = report["featureNames"]
    rows = {}
    for split in ("train", "validation", "test"):
        file = "ranker." + split + ".jsonl"
        raw = (args.dataset / file).read_bytes()
        if hashlib.sha256(raw).hexdigest() != report["fileSha256"][file]:
            raise ValueError("Dataset file digest mismatch: " + file)
        rows[split] = [json.loads(line) for line in raw.decode().splitlines() if line.strip()]
        for row in rows[split]:
            for key in ("chosen", "rejected"):
                if len(row[key]) != len(features) or any(not isinstance(x, (int, float)) or not math.isfinite(x) or x < 0 or x > 1 for x in row[key]):
                    raise ValueError("Invalid feature vector")
            if not isinstance(row.get("group"), str) or not row["group"]:
                raise ValueError("Missing group")
    groups = {split: {r["group"] for r in values} for split, values in rows.items()}
    if any(groups[a] & groups[b] for a, b in (("train", "validation"), ("train", "test"), ("validation", "test"))):
        raise ValueError("Group leakage across splits")
    blockers = []
    if len(rows["train"]) < 100:
        blockers.append("Need 100 human-reviewed training preference pairs")
    if len(groups["train"]) < 10:
        blockers.append("Need 10 independent training groups")
    if len(groups["validation"]) < 10 or len(groups["test"]) < 10:
        blockers.append("Need 10 independent validation and test groups each")
    if blockers:
        print(json.dumps({"status": "blocked", "blockers": blockers}, indent=2))
        return 2
    # Choose regularization on validation only. Evaluate test once after selection.
    candidates = [(train(rows["train"], len(features), l2=l2), l2) for l2 in (0.001, 0.01, 0.1)]
    weights, l2 = min(candidates, key=lambda item: metrics(item[0], rows["validation"])["logLoss"])
    result = {"schemaVersion": 1, "modelType": "pairwise-logistic-v1", "status": "offline-candidate",
              "features": features, "weights": weights, "l2": l2, "epochs": 500,
              "datasetDigest": report["datasetDigest"], "fileSha256": report["fileSha256"],
              "metrics": {split: metrics(weights, values) for split, values in rows.items()},
              "randomBaselineAccuracy": 0.5,
              "deploymentAllowed": False,
              "limitations": ["Predicts reviewed preferences from evaluator features, not human solve difficulty.",
                              "Needs prospective shadow evaluation and human review before tournament use.",
                              "Must never bypass publication, rights, rendered recognition or solvability gates."]}
    args.output.parent.mkdir(parents=True, exist_ok=True)
    with args.output.open("x") as out:
        json.dump(result, out, indent=2)
        out.write("\n")
    print(json.dumps(result, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
