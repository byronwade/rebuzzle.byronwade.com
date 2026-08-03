# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html)
for published packages when applicable. The monorepo itself tracks progress on
`main` via GitHub releases and pull requests.

## [Unreleased]

### Added

- Root open-source project documentation (`README`, `LICENSE`, contributing,
  security, code of conduct, changelog)
- GitHub Actions CI for install, lint, typecheck, and unit tests
- Expanded `.env.example` covering web runtime configuration

### Fixed

- `.gitignore` no longer excludes `pnpm-lock.yaml`; TypeScript build info files
  are ignored instead of tracked

## [0.1.0] - 2024-01-01

### Added

- Initial Rebuzzle monorepo: Next.js web app, shared packages, desktop and
  mobile clients
