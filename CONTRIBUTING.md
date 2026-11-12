# Contributing to OpenCPR

Thanks for helping. OpenCPR is a CPR training kiosk: firmware, a kiosk app, an API and an admin portal in one repository. This page covers how to set up, make a change and get it merged.

By taking part you agree to the [Code of Conduct](CODE_OF_CONDUCT.md). Security problems go to the address in [SECURITY.md](SECURITY.md), not to a public issue.

## Before you start

- **Questions and booth help:** open an issue with the "Booth or setup help" template, or write to support@opencpr.org.
- **Bugs:** open an issue with the bug template. Include what you expected, what happened, and the version or commit.
- **New features:** open an issue first so the change can be discussed before you write it. Small fixes and documentation improvements can go straight to a pull request.

## Set up

Read [How it fits together](docs/architecture.md) for the layout. Each application folder (`frontend/`, `backend/`, `admin-portal/`) is its own pnpm project with its own Node version (`.nvmrc`), lockfile and README. The quickest way to run everything is [Try it on your laptop](README.md#try-it-on-your-laptop).

You need Node 24 and pnpm. Run `nvm use` inside each folder to pick up its `.nvmrc`, and run `corepack enable` once so pnpm follows the version each folder pins in the `packageManager` field of its `package.json`.

```sh
corepack enable       # once: pnpm version from each package.json
pnpm install          # at the repository root: installs the git hooks
cd backend && nvm use && pnpm install && pnpm dev
```

## Make a change

1. Branch off `main`: `feat/<short-name>`, `fix/<short-name>` or `docs/<short-name>`.
2. Commit with [Conventional Commits](https://www.conventionalcommits.org) (`feat:`, `fix:`, `docs:`, `chore:` and so on). The commit hook rejects other messages, and the pre-commit hook lints and formats the staged files.
3. Keep each pull request to one change. Large changes are easier to review split into steps.
4. Update the docs in `docs/` when you change how something is built, configured or used.
5. If you change a backend model, add a migration with `pnpm db:migrate:generate --name <change>`; never edit an applied one.

## Checks

CI runs these for every pull request; run them in the folder you changed before you push:

```sh
pnpm type-check
pnpm lint
pnpm format:check
pnpm spell-check
pnpm build
pnpm test   # frontend only
```

## Changes that need extra care

- **Scoring:** the kiosk (`frontend/src/utils/session-scoring.ts`) and the API (`backend/src/utils/session-scoring.ts`) both score runs. Change both together.
- **Serial protocol:** the firmware and the kiosk parse the same frames. Change `hardware/arduino.ino` and `frontend/src/utils/cpr-protocol.ts` together and keep new fields optional.
- **Personal data:** anything that stores or sends visitor data needs a note in the pull request on what is collected and for how long.

## Review

A code owner reviews every pull request. Once the checks pass and the review is approved, the pull request is squash-merged into `main`. Notable changes are added to [CHANGELOG.md](CHANGELOG.md).

## License

OpenCPR is released under the [Apache License 2.0](LICENSE). By submitting a pull request you agree that your contribution is licensed under the same terms.
