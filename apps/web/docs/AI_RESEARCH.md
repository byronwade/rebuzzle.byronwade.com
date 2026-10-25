# AI research layer

Rebuzzle's AI now researches before it writes. Puzzle answers and blog history
are grounded in live web sources, and the host (not the model) decides which
claims count as verified.

## Pipeline (`src/ai/research/`)

1. **Search** (`web-research.ts`): a short tool loop drives AI Gateway's
   provider-executed web search (`perplexitySearch` by default, or `exaSearch` /
   `parallelSearch`). The researcher batches queries and runs one follow-up
   search for gaps or conflicts.
2. **Rank** (`source-quality.ts`): every retrieved page is deduped and ranked by
   its registrable domain. Dictionaries, etymology references, and encyclopedias
   rank highest. Forums, social posts, and puzzle-answer sites rank lowest and
   can never verify a fact on their own. At most two pages per domain survive.
3. **Synthesize**: a structured pass turns the numbered sources (`S1`, `S2`, …)
   into claims that must cite those ids.
4. **Corroborate** (`corroboration.ts`): the host drops citations to pages that
   were never retrieved, marks a claim `verified` only when it has a reference
   source or two independent trusted domains, rejects any year or figure that is
   not in the cited text, and downgrades claims whose wording is absent from
   their sources. Only `verified` and `single-source` claims reach writers.

Research is advisory. Any failure returns a `failed` dossier and generation
continues without it; only hard AI budget errors propagate. Results are cached
per subject for a week (failures for ten minutes).

## Where it is used

- **Apex answer screening** (`puzzle-agent/apex/answer-research.ts`): every
  reserved answer seed is researched in parallel before generation, within a
  35-second deadline. Seeds whose evidence says *avoid* (obscure, or a
  corroborated sensitivity issue) are swapped for the next fresh seed, up to
  three times. The rest carry a cited answer brief (meaning, familiarity,
  wordings players may type, documented origin) into generation, critique, and
  critique repair.
- **Puzzle records**: the winning answer's research is stored on
  `metadata.answerResearch` with its cited sources.
- **Blog posts** (`research/blog-research.ts`): the writer gets numbered facts.
  Format-history facts feed the History section; answer facts are spoilers and
  go only in the Solution. Stored answer research is reused, so only the
  format history is searched. Any year the draft states without a supporting
  fact triggers a rewrite; anything that survives the last attempt is listed as
  an unverified claim in the review PR, next to every fact and its source links.

## Configuration

| Variable | Default | Effect |
| --- | --- | --- |
| `REBUZZLE_RESEARCH` | on (off under Jest) | `0` disables all research; `1` forces it on |
| `REBUZZLE_RESEARCH_PROVIDER` | `perplexity` | `exa` or `parallel` switch the gateway search tool |
| `REBUZZLE_RESEARCH_MAX_STEPS` | `3` | Search loop steps (1–6) |
| `REBUZZLE_RESEARCH_SEED_GATE` | on | `0` keeps research briefs but never swaps seeds |

Search tools are billed through the same AI Gateway credentials as the models.
