# Contributing to Rebuzzle

Thanks for helping improve Rebuzzle. This guide keeps contributions consistent for an open-source monorepo.

## Ways to contribute

- Bug fixes and performance improvements
- Accessibility and UX polish
- Documentation corrections
- Tests for uncovered paths
- Thoughtful puzzle / content tooling improvements (discuss large generator changes in an issue first)

## Before you start

1. Open or find a [GitHub issue](https://github.com/byronwade/rebuzzle.byronwade.com/issues) describing the problem or idea.
2. For larger changes, outline the approach in the issue before coding.
3. Read the [Code of Conduct](CODE_OF_CONDUCT.md).

## Development setup

```bash
git clone https://github.com/byronwade/rebuzzle.byronwade.com.git
cd rebuzzle.byronwade.com
pnpm install
cp .env.example .env.local
```

Fill `.env.local` with at least:

- `NEXT_PUBLIC_APP_URL=http://localhost:3000`
- A MongoDB connection string (`REBUZZLE_MONGODB_URI`, `MONGODB_URI`, or `DATABASE_URL`)

Start the web app:

```bash
pnpm dev:web
```

## Branching and commits

- Branch from `main`: `git checkout -b feat/short-description` (or `fix/`, `docs/`, `chore/`)
- Prefer small, focused pull requests
- Write clear commit messages that explain *why* when it is not obvious

## Quality bar

From the repo root:

```bash
pnpm lint
pnpm typecheck
pnpm test
```

For web-only work:

```bash
pnpm --filter @rebuzzle/web lint
pnpm --filter @rebuzzle/web typecheck
pnpm --filter @rebuzzle/web test
```

Optional deeper checks:

```bash
pnpm doctor:web
```

Format web sources with Biome:

```bash
pnpm format
```

Do not commit secrets, `.env*` files (except `.env.example`), or build artifacts (`.next`, `dist`, `*.tsbuildinfo`).

## Pull requests

1. Ensure CI-equivalent checks pass locally.
2. Fill out the PR template.
3. Link related issues (`Fixes #123`).
4. Keep scope tight — avoid unrelated refactors in the same PR.
5. Update docs when behavior or setup steps change.

## Code guidelines

- Prefer TypeScript strictness; avoid `any`.
- Match existing patterns in the package you touch (`apps/web` vs shared packages).
- Keep shared logic in `packages/game-logic` / `packages/config` when it is cross-platform.
- Use indexes and validated env access for server/database code (see `apps/web/src/lib/env.ts`).
- Web UI agent rules (accessibility, interaction patterns): `apps/web/AGENTS.md`.

## Reporting bugs

Include:

- What you expected vs what happened
- Steps to reproduce
- Browser / OS (and app target if desktop/mobile)
- Relevant logs (redact secrets)

## Security

Do not file public issues for vulnerabilities. Follow [SECURITY.md](SECURITY.md).

## License

By contributing, you agree that your contributions are licensed under the [MIT License](LICENSE).
