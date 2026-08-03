# Rebuzzle

Daily rebus puzzle game — decode visual word puzzles with limited attempts, progressive hints, and streak tracking.

**Live:** [rebuzzle.byronwade.com](https://rebuzzle.byronwade.com)

## Monorepo

| Path | Package | Description |
|------|---------|-------------|
| `apps/web` | `@rebuzzle/web` | Next.js web app (primary product) |
| `apps/desktop` | `@rebuzzle/desktop` | Electron desktop client |
| `apps/mobile` | `@rebuzzle/mobile` | Expo mobile client |
| `packages/config` | `@rebuzzle/config` | Shared config, constants, theme |
| `packages/game-logic` | `@rebuzzle/game-logic` | Scoring, fuzzy match, achievements |
| `packages/ui` | `@rebuzzle/ui` | Shared React UI primitives |

Managed with [pnpm](https://pnpm.io) workspaces and [Turborepo](https://turbo.build).

## Requirements

- Node.js **24.x**
- pnpm **9.15+** (see `packageManager` in root `package.json`)
- MongoDB (for full local gameplay / admin flows)

## Quick start

```bash
git clone https://github.com/byronwade/rebuzzle.byronwade.com.git
cd rebuzzle.byronwade.com
pnpm install
cp .env.example .env.local
# Fill in at least NEXT_PUBLIC_APP_URL and a MongoDB URI (see .env.example)

pnpm dev:web
# → http://localhost:3000
```

Other apps:

```bash
pnpm dev:desktop
pnpm dev:mobile
```

## Scripts

| Command | Description |
|---------|-------------|
| `pnpm dev` | Run all package `dev` tasks via Turbo |
| `pnpm dev:web` | Next.js web app |
| `pnpm build` | Build all packages |
| `pnpm build:web` | Build web only |
| `pnpm lint` | Lint (Biome via Turbo) |
| `pnpm typecheck` | TypeScript check across the workspace |
| `pnpm test` | Unit tests |
| `pnpm format` | Format with Biome (`apps/web`) |
| `pnpm check` | Lint + typecheck |

Web-specific utilities (`pnpm --filter @rebuzzle/web <script>`): puzzle generation, DB setup, Playwright e2e, knip, doctor suites. See [`apps/web/README.md`](apps/web/README.md).

## Environment

Copy [`.env.example`](.env.example) to `.env.local` and configure:

- **Required for production:** `NEXT_PUBLIC_APP_URL`, MongoDB URI (`REBUZZLE_MONGODB_URI` / `MONGODB_URI` / `DATABASE_URL`), `AUTH_SECRET`
- **AI features:** provider keys (`AI_GATEWAY_API_KEY`, `GOOGLE_AI_API_KEY`, etc.) and `AI_PROVIDER`
- **Email / cron / push:** Resend, cron secrets, VAPID keys as needed

Validation lives in `apps/web/src/lib/env.ts`.

## Architecture notes

- Web app source: `apps/web/src` (App Router under `src/app`)
- Shared game rules: `packages/game-logic`
- Deploy target: Vercel (`vercel.json` builds `@rebuzzle/web`)

Deeper product docs: [`apps/web/docs/`](apps/web/docs/).

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md). Please follow the [Code of Conduct](CODE_OF_CONDUCT.md).

Security reports: [SECURITY.md](SECURITY.md).

## License

[MIT](LICENSE) © Byron Wade

Third-party pictogram licensing notes: [`apps/web/docs/THIRD_PARTY_PICTOGRAMS.md`](apps/web/docs/THIRD_PARTY_PICTOGRAMS.md).
