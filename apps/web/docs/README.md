# Web documentation

Internal and contributor-facing docs for `@rebuzzle/web`.

| Doc | Topic |
|-----|-------|
| [API_DOCUMENTATION.md](API_DOCUMENTATION.md) | HTTP / API surface |
| [TESTING.md](TESTING.md) | Unit and e2e testing |
| [PRODUCTION_DEPLOYMENT.md](PRODUCTION_DEPLOYMENT.md) | Deploy notes |
| [DIFFICULTY_AND_GENERATION.md](DIFFICULTY_AND_GENERATION.md) | Puzzle difficulty & generation |
| [PUZZLE_GENERATOR_V2.md](PUZZLE_GENERATOR_V2.md) | Generator architecture |
| [NOTIFICATIONS.md](NOTIFICATIONS.md) | Push / in-app notifications |
| [AI_BLOG_PULL_REQUESTS.md](AI_BLOG_PULL_REQUESTS.md) | Automated blog PRs |
| [THIRD_PARTY_PICTOGRAMS.md](THIRD_PARTY_PICTOGRAMS.md) | Vendored icon licensing |
| [HUMAN_ICON_RECOGNITION.md](HUMAN_ICON_RECOGNITION.md) | Icon recognition panel |
| [HUMAN_PUZZLE_PLAYTESTING.md](HUMAN_PUZZLE_PLAYTESTING.md) | Playtest workflow |

Environment variables are documented in the root [`.env.example`](../../../.env.example) and validated in `src/lib/env.ts`.

Some older summaries in this folder may lag the current tree (for example middleware vs `src/proxy.ts`). Prefer source and the root README when docs conflict.
