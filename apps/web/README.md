# `@rebuzzle/web`

Next.js App Router application for Rebuzzle — the primary web product in this monorepo.

For monorepo setup, contributing, and license, start at the [repository root README](../../README.md).

## Stack

- Next.js (App Router) + React 19 + TypeScript
- Tailwind CSS + Radix / shadcn-style UI
- MongoDB for persistence
- Biome for lint/format
- Jest (unit) and Playwright (e2e)

## Develop

From the **repository root**:

```bash
pnpm install
cp .env.example .env.local
pnpm dev:web
```

App URL defaults to `http://localhost:3000` (`NEXT_PUBLIC_APP_URL`).

## Scripts

Run via `pnpm --filter @rebuzzle/web <script>` or from this directory with `pnpm <script>`:

| Script | Purpose |
|--------|---------|
| `dev` | Next.js dev server |
| `build` / `start` | Production build and serve |
| `lint` / `lint:fix` / `format` | Biome |
| `typecheck` | `tsc --noEmit` |
| `test` / `test:e2e` | Jest / Playwright |
| `db:setup` / `db:create-indexes` | Mongo helpers |
| `generate:today` / `generate:puzzles` | Puzzle generation |
| `doctor:all` | Lint + shadscan + vercel-doctor + react-doctor |

## Layout

```
apps/web/
├── src/
│   ├── app/           # Routes, layouts, API routes
│   ├── components/    # UI and game surfaces
│   ├── lib/           # Env, hooks, server utilities
│   ├── db/            # Mongo access
│   ├── ai/            # Generation and AI services
│   └── proxy.ts       # Next.js proxy / middleware entry
├── docs/              # Product and ops documentation
├── scripts/           # One-off generators and DB tools
├── public/            # Static assets / PWA
└── biome.jsonc        # Lint/format config
```

## Documentation

Index: [`docs/README.md`](docs/README.md)

Notable topics: API, notifications, puzzle generation, production deployment, third-party pictograms.

## License

MIT — see the [root LICENSE](../../LICENSE).
