#!/usr/bin/env python3
"""Run a bounded LoRA pilot on reviewed blueprint data; never publishes or changes production routing."""
import argparse
import hashlib
import json
import pathlib
import re


def preflight(dataset):
    report = json.loads((dataset / "report.json").read_text())
    counts = report["sft"]
    blockers = []
    if counts["train"] < 100 or counts["validation"] < 20 or counts["test"] < 20:
        blockers.append("Need at least 100/20/20 reviewed SFT train/validation/test examples")
    for split in ("train", "validation", "test"):
        name = f"sft.{split}.jsonl"
        raw = (dataset / name).read_bytes()
        if hashlib.sha256(raw).hexdigest() != report["fileSha256"][name]:
            raise ValueError("Dataset digest mismatch: " + name)
        rows = [json.loads(line) for line in raw.decode().splitlines() if line.strip()]
        if len(rows) != counts[split]:
            raise ValueError("Dataset row count mismatch")
    return report, blockers


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--dataset", required=True, type=pathlib.Path)
    parser.add_argument("--model", help="License-reviewed causal instruction model repository")
    parser.add_argument("--revision", help="Immutable model commit SHA")
    parser.add_argument("--output", type=pathlib.Path)
    parser.add_argument("--max-steps", type=int, default=100)
    parser.add_argument("--preflight", action="store_true")
    args = parser.parse_args()
    report, blockers = preflight(args.dataset)
    if args.preflight or blockers:
        print(json.dumps({"status": "blocked" if blockers else "data-ready", "blockers": blockers,
                          "datasetDigest": report["datasetDigest"], "trained": False}, indent=2))
        return 2 if blockers else 0
    if not args.model or not args.revision or not args.output:
        parser.error("Training requires --model, --revision and --output")
    if not re.fullmatch(r"[0-9a-f]{40}", args.revision):
        parser.error("Use an immutable 40-character model commit SHA")
    if not 1 <= args.max_steps <= 1000:
        parser.error("Pilot max steps must be between 1 and 1000")
    if args.output.exists():
        raise ValueError("Output already exists; use a new experiment directory")
    # Heavy dependencies are intentionally optional and never installed in the web app.
    import torch
    from datasets import Dataset
    from peft import LoraConfig
    from transformers import AutoModelForCausalLM, AutoTokenizer
    from trl import SFTConfig, SFTTrainer

    if not torch.cuda.is_available():
        raise ValueError("No CUDA GPU available; run this pilot on an explicitly provisioned GPU")
    tokenizer = AutoTokenizer.from_pretrained(args.model, revision=args.revision, trust_remote_code=False)
    if not tokenizer.chat_template:
        raise ValueError("Model needs a reviewed chat template")
    if tokenizer.pad_token is None:
        tokenizer.pad_token = tokenizer.eos_token
    model = AutoModelForCausalLM.from_pretrained(args.model, revision=args.revision, trust_remote_code=False,
                                               dtype=torch.bfloat16 if torch.cuda.is_bf16_supported() else torch.float16)
    def load(split):
        rows = [json.loads(line) for line in (args.dataset / f"sft.{split}.jsonl").read_text().splitlines() if line.strip()]
        # Avoid silently truncating the JSON blueprint. Train on the completion only.
        for row in rows:
            if len(tokenizer.apply_chat_template(row["messages"], tokenize=True)) > 4096:
                raise ValueError("Example exceeds 4096 tokens; revise the example rather than truncate JSON")
        return Dataset.from_list([{"prompt": row["messages"][:-1], "completion": row["messages"][-1:]} for row in rows])
    train_data, validation_data = load("train"), load("validation")
    trainer = SFTTrainer(
        model=model, processing_class=tokenizer,
        args=SFTConfig(output_dir=str(args.output), max_steps=args.max_steps, max_length=4096,
                       learning_rate=1e-4, per_device_train_batch_size=1, per_device_eval_batch_size=1,
                       gradient_accumulation_steps=8, eval_strategy="steps", eval_steps=25,
                       save_steps=25, save_total_limit=2, seed=42, report_to="none", push_to_hub=False,
                       bf16=torch.cuda.is_bf16_supported(), fp16=not torch.cuda.is_bf16_supported(),
                       completion_only_loss=True),
        train_dataset=train_data, eval_dataset=validation_data,
        peft_config=LoraConfig(r=16, lora_alpha=32, lora_dropout=0.05,
                               target_modules="all-linear", task_type="CAUSAL_LM"),
    )
    trainer.train()
    trainer.save_model(str(args.output / "adapter"))
    tokenizer.save_pretrained(str(args.output / "adapter"))
    metrics = trainer.evaluate()
    (args.output / "experiment.json").write_text(json.dumps({
        "baseModel": args.model, "baseRevision": args.revision, "datasetDigest": report["datasetDigest"],
        "maxSteps": args.max_steps, "validationMetrics": metrics, "testUsedForSelection": False,
        "deploymentAllowed": False, "status": "offline-pilot-needs-blind-generation-evaluation",
    }, indent=2) + "\n")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
