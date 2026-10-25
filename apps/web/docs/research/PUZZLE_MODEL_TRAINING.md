# Rebuzzle dataset research and model training

Research checked 2026-10-25. This is a reproducible data and training pipeline, not a claim that a better model has already been trained. The current environment has no configured database/AI credentials, no reviewed first-party training examples, and no provisioned training GPU. Production generation continues to use its existing models and hard gates.

## What the research found

The machine-readable [dataset registry](puzzle-datasets.json) records primary sources, license evidence, immutable revisions, metadata hashes, restrictions, and intended use. The [executed inventory](dataset-inventory-2026-10-25.json) contains counts computed from downloaded metadata, rather than estimates from papers.

| Source | Downloaded metadata | Decision |
| --- | --- | --- |
| [COLUMBUS](https://huggingface.co/datasets/koen-47/COLUMBUS) | 1,005 rows; 636 case-insensitive answer strings | MIT declared. Study its graph/rule approach; retain external puzzles for evaluation. Icon/text variants are not independent cases. |
| [Reasoning Riddles](https://huggingface.co/datasets/pmovva/rebus-puzzles) | 221 rows; alternate answers and mechanism annotations | CC-BY-4.0 declared. Attribution and image provenance review required. |
| [RE-BUS](https://huggingface.co/datasets/TrishanuDas/rebus-dataset) | 1,354 rows: 743 originals, 611 augmented | Apache-2.0 declared; dataset card cautions about commercial use. Existing strict importer and row reviews remain authoritative. |
| [REBUS](https://huggingface.co/datasets/cavendishlabs/rebus) | No content imported | No license found in inspected card/repository API. |
| [Puzzled by Puzzles](https://github.com/Kyunnilee/visual_puzzles) | No content imported | Paper mentions MIT but repository license is unresolved. |
| [PuzzleWorld](https://huggingface.co/datasets/hzli1202/PuzzleWorld) | Literature only | CC-BY-NC-SA-4.0. Excluded from commercial training. |
| [RebusBench](https://huggingface.co/datasets/amirkasaei/rebusbench) | No content imported | No license found in inspected card/repository API. |

A declared dataset license is evidence about the release, not proof that every externally sourced image has a commercial training grant. None of these datasets is automatically promoted to an evaluation suite or used to populate the game. The downloaded rows remain pending review. No images are downloaded or redistributed by the research tool.

Primary research:

- [COLUMBUS paper](https://arxiv.org/abs/2409.04053) and [generation implementation](https://github.com/koen-47/COLUMBUS): explicit rule/graph representations support predictable puzzle construction. Its multiple-choice solver results are not equivalent to Rebuzzle's open-ended answer task.
- [REBUS paper](https://arxiv.org/abs/2401.05604): solving and explaining the complete mapping are distinct capabilities. Evaluate both.
- [Puzzled by Puzzles](https://visual-puzzles.github.io/): visual-linguistic integration and hint use deserve separate tests.
- [PuzzleWorld paper](https://arxiv.org/abs/2506.06211): its solver experiment supports investigating supervision richer than final answers. It does not establish a quality gain for a rebus generator.
- [TRL SFT](https://huggingface.co/docs/trl/sft_trainer), [PEFT LoRA](https://huggingface.co/docs/peft/package_reference/lora), [TRL DPO](https://huggingface.co/docs/trl/dpo_trainer): implementation references for an eventual bounded adapter experiment and preference training.

## Architecture decision

Keep the existing answer-first composition engine, reviewed pictograms, cheap structural gates, independent rendered blind solves, editorial review, and tournament. Train a small preference ranker first; test a LoRA blueprint generator second. A solver dataset is not automatically a designer dataset. Do not train on unreviewed AI winners or equate low solve rate with quality.

The new code captures every candidate in the completed Apex selection result, including rejected candidates and no-winner tournaments, into `puzzleTrainingCandidates`. It does not capture malformed drafts that fail before becoming candidates. Captured fields include a portable blueprint, versioned payload digest, mechanism family, publication outcome, rejection reasons, and selected evaluation measurements. It excludes player records, arbitrary metadata, image bytes/URLs, and SVG. Capture is best-effort and cannot turn a failed publication candidate into a winner. Capture failures log a warning and do not fail puzzle publication.

Run `pnpm --filter @rebuzzle/web exec tsx scripts/create-indexes.ts` against the intended database when installing this release to create the candidate id and capture-time indexes. No database migration has been run from this environment.

Portable blueprints are training targets for a future designer adapter, not complete renderable runtime puzzles. The host must resolve and independently recognize assets, restore runtime style fields, validate the runtime schema, and rerun all existing gates. No adapter is connected to production inference in this change.

## Reproduce the research

From the repository root:

```sh
python3 apps/web/scripts/training/research-datasets.py
# Replay from local metadata with identical hashes:
python3 apps/web/scripts/training/research-datasets.py --offline
```

Artifacts go under ignored `artifacts/puzzle-research/`. The answer exclusion file contains 1,583 distinct raw answer/alias strings from all three imported sources; normalization reduces some duplicates. It is an exclusion list, not a generation phrase bank. Answers may appear in source filenames; future blind evaluation must pass anonymized pixel bytes and no answer-bearing filename or metadata.

For actual RE-BUS evaluation, continue using `benchmark:puzzles:external:import`, `benchmark:puzzles:external:review-template`, and `benchmark:puzzles:external:solve`. Their pinned fixture checks and human rights/answer gates are unchanged. COLUMBUS and Reasoning Riddles imports here are research references, not adapters into the strict production evaluation runner.

## Collect and review first-party data

Export from the intended configured database, from `apps/web`:

```sh
pnpm training:export --output=/absolute/private/candidates.jsonl
```

The file is created exclusively and will not overwrite an older export. Reviewers inspect the original rendered board, complete explanation, clue coverage, alternative answers, and each hint before deciding. Original composition and catalog/provider asset rights need explicit evidence. A public community submission is not automatically consent for training.

Each completed review is a JSONL row in a separate `reviews.jsonl`:

```json
{"candidateId":"EXACT_CAPTURED_ID","digest":"EXACT_64_CHARACTER_PAYLOAD_DIGEST","decision":"approve","rights":"approved","rightsEvidence":"Original composition; catalog assets and generation provider terms checked","reviewer":"editor-id","reviewedAt":"2026-10-25T12:00:00.000Z","aliases":[]}
```

`decision` is `approve` or `reject`; `rights` is `approved`, `pending`, or `rejected`. Omit incomplete reviews. Approving rights is separate from approving puzzle quality. Updating a blueprint requires a new digest and a fresh review. The exported prompt/completion files omit reviewer identities and source database identifiers.

Explicit human preference comparisons go into `preferences.jsonl`:

```json
{"chosenId":"PREFERRED_CAPTURED_ID","rejectedId":"OTHER_CAPTURED_ID","chosenDigest":"EXACT_64_CHARACTER_DIGEST","rejectedDigest":"EXACT_64_CHARACTER_DIGEST","reviewer":"editor-id","reviewedAt":"2026-10-25T12:00:00.000Z","reason":"The preferred board supports every deduction and has a clearer hint progression"}
```

These are schema examples, not completed reviews. No reviews or preference labels were fabricated in this work. A tournament winner is never automatically a human preference label.

## Prepare frozen train/validation/test artifacts

Create the parent output directory first. Each preparation needs a new export directory:

```sh
mkdir -p /absolute/private/training
pnpm training:prepare \
  --candidates=/absolute/private/candidates.jsonl \
  --reviews=/absolute/private/reviews.jsonl \
  --preferences=/absolute/private/preferences.jsonl \
  --benchmark-answers=/workspace/rebuzzle/artifacts/puzzle-research/benchmark-answers.json \
  --output=/absolute/private/training/experiment-001 \
  --require-ready
```

The built-in frozen solve-benchmark answers are always excluded. The CLI loads the research exclusion list by default and fails if it is absent; an explicit path can select a frozen exclusion artifact. Related answers, reviewer-supplied aliases, identical boards, and mechanism families form transitive groups. Entire groups receive an 80/10/10 hash split. A benchmark overlap excludes its whole group. Exact duplicate targets are removed. Human-approved, rights-approved, machine-publishable candidates without rejection reasons and with at least two required blind top-answer votes can become SFT targets. The generator prompt includes the intended answer seed, so the adapter learns answer-first composition. Both sides of preference pairs need rights approval; preferred candidates also need quality approval. Cross-split pairs are skipped; contradictory or stale reviews fail.

DPO pairs additionally require identical generation requests (answer seed, category, difficulty, technique). Ranker examples contain bounded numeric measurements and explicit preference labels, with neither selection outcome nor review decision as an input feature. There are nine JSONL outputs (SFT/DPO/ranker × three splits), a split manifest, file digests, and a readiness report.

Split assignment is deterministic for a fixed corpus. **Freeze and retain an experiment directory:** adding new connected records can move groups. Never compare experiments against a regenerated holdout, and never reuse the test set for model or prompt selection. Mechanism-family grouping is deliberately strict; many rows from a few templates do not create independent evaluation evidence.

The combined readiness report requires at least 100/20/20 SFT examples, 100 training preference pairs, and 10 train/validation/test preference groups each. These are pilot floors, not a statistically justified guarantee of model quality. No data is present in the current local first-party export; the executed readiness report correctly blocks training.

## Train a CPU ranker

```sh
pnpm training:ranker \
  --dataset=/absolute/private/training/experiment-001 \
  --output=/absolute/private/training/ranker-001.json
```

This is a dependency-free pairwise logistic model, not an LLM. It learns weights over evaluator features using human preferences. It verifies file hashes, bounded features, at least 100 training pairs, 10 independent training groups and 10 independent validation/test groups each. Regularization is selected with validation log loss; test metrics are computed afterward. Ties receive half credit. The output records weights, features, data hashes, held-out metrics, and limitations. It cannot deploy itself or change tournament rankings.

The optimizer tests use deliberately synthetic vectors solely to verify that the math learns a known signal. Those vectors are not puzzle examples and do not establish a quality improvement.

## Train a bounded generator adapter

Use a separate GPU worker, not the Next.js application environment. Install a worker-compatible PyTorch/CUDA build and `scripts/training/requirements-gpu.txt`. The optional GPU packages are pinned to versions verified on PyPI during research; their compatibility has not been GPU-tested here.

First run the dependency-free data preflight:

```sh
python3 scripts/training/finetune-generator.py \
  --dataset=/absolute/private/training/experiment-001 --preflight
```

Once that passes, choose a license-reviewed causal instruction model that fits the allocated GPU; pin its immutable model revision. No model choice is assumed to be best without measurement:

```sh
python3 scripts/training/finetune-generator.py \
  --dataset=/absolute/private/training/experiment-001 \
  --model=MODEL_REPOSITORY --revision=MODEL_COMMIT_SHA \
  --output=/absolute/private/training/adapter-001 --max-steps=100
```

This creates a rank-16 LoRA adapter, trains only completion tokens, rejects examples that would truncate the JSON output, uses validation during a bounded pilot, and does not load test targets for selection. It requires CUDA, disables remote model code, logging uploads and Hub publishing, and never provisions billable infrastructure. Validation loss alone cannot justify deploying the adapter. The actual GPU training path remains unexecuted until data and compute are available.

DPO export is included for a later experiment; no DPO optimizer or production DPO job has been launched. Start with the ranker and an SFT baseline before adding that expense.

See [the quality standard and paired comparison protocol](PUZZLE_SYSTEM_STANDARD.md) for executable baseline/challenger reporting.

## Promotion experiment

Compare the current generator and candidate adapter on the same frozen unseen briefs, equal candidate/call budgets, and independent rendered evaluators. Report schema validity, publishable yield, complete clue coverage, ambiguity/false-accept rate, mechanism diversity, human preference win rate, median and p95 generation latency, tokens, and **cost per accepted puzzle** (including rejected candidates and retries). Stratify by tier and mechanism. Use enough independent puzzle families and a confidence interval for human comparisons; do not promote on a tiny majority or model self-scores.

A ranker first runs in shadow mode. A generator first creates review-only candidates. Neither may bypass answer uniqueness, asset recognition, hint fairness, blind solve consensus, novelty, or human calibration circuit breakers. Keep the existing model as fallback. No claim of lower cost, higher quality or better difficulty calibration is established by this implementation alone.
