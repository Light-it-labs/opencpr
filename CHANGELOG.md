<!-- cspell:ignore Mailpit -->

# Changelog

All notable changes to OpenCPR are listed here. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the project uses [Semantic Versioning](https://semver.org).

## [Unreleased]

### Added

- Spanish translation of the kiosk and the phone registration form. Each kiosk picks its language on the setup screen and keeps it per browser; a visitor's phone follows the phone's language and falls back to English.

### Security

- Saving a run now ignores any field the server owns (row id, timestamps, scores), caps a run at 60 compressions with bounded timing and depth values, and limits API request bodies to 16 kB.
- Sign-in links are limited per user (one a minute, five an hour), so nobody can flood a staff inbox or keep canceling the real link, and admins get at most ten new access-request emails an hour; requests over that are still listed on the users page.

## [1.0.1] - 2026-11-05

### Security

- The API and the kiosk now tell Sentry explicitly to collect no user info, cookies, IP addresses, request bodies or query parameters (newer Sentry SDKs collect them by default). The API no longer sends the admin session cookie with error reports.
- Development dependencies affected by the `minimatch` and `glob` denial-of-service advisories are pinned to patched versions in all three apps.

### Changed

- Dependencies updated across the apps, including BullMQ 6 (with `ioredis` 5 as a direct dependency), Express Rate Limit 8, Sentry 11, Vite 8, ESLint 10, TypeScript 6, React i18next 17, React Day Picker 10, Tailwind Variants 4 and satori 0.63 for the results card.
- Dependabot sends one grouped update PR per app each week and groups security fixes into one PR; TypeScript, `ioredis` and `@types/node` major updates are held until the toolchain supports them.

### Removed

- Unused frontend dependencies (`web-vitals`, the table component and `@tanstack/react-table`).

## [1.0.0] - 2026-11-04

First public release.

### Added

- Kiosk app: QR registration on the visitor's phone with a consent checkbox, step-by-step instructions, a 30-compression run with live depth, rate and recoil feedback and a metronome, and an on-screen results card.
- API: stores runs and participants, scores every run, renders the results card and emails it over any SMTP provider, monitors booths and raises alerts during opening hours.
- Admin portal: dashboard, statistics, kiosks, sessions, participants, locations and users, with magic-link and passkey sign-in, admin and viewer roles, CSV export and participant deletion.
- Firmware for an Arduino Uno R3 (or Mega 2560) and a VL53L4CD time-of-flight sensor, measurement-only with self-checking calibration, and a 3D-printable case.
- Booth computer setup for Ubuntu 24.04 and macOS, including a firmware updater.
- Docker Compose for the whole stack with Mailpit for local email, a production override for a single server, CI, and documentation from planning a booth to running it.

[1.0.1]: https://github.com/Light-it-labs/opencpr/compare/v1.0.0...v1.0.1
[1.0.0]: https://github.com/Light-it-labs/opencpr/releases/tag/v1.0.0
