<!-- cspell:ignore Mailpit -->

# Changelog

All notable changes to OpenCPR are listed here. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the project uses [Semantic Versioning](https://semver.org).

## [1.0.0] - 2026-11-04

First public release.

### Added

- Kiosk app: QR registration on the visitor's phone with a consent checkbox, step-by-step instructions, a 30-compression run with live depth, rate and recoil feedback and a metronome, and an on-screen results card.
- API: stores runs and participants, scores every run, renders the results card and emails it over any SMTP provider, monitors booths and raises alerts during opening hours.
- Admin portal: dashboard, statistics, kiosks, sessions, participants, locations and users, with magic-link and passkey sign-in, admin and viewer roles, CSV export and participant deletion.
- Firmware for an Arduino Uno R3 (or Mega 2560) and a VL53L4CD time-of-flight sensor, measurement-only with self-checking calibration, and a 3D-printable case.
- Booth computer setup for Ubuntu 24.04 and macOS, including a firmware updater.
- Docker Compose for the whole stack with Mailpit for local email, a production override for a single server, CI, and documentation from planning a booth to running it.

[1.0.0]: https://github.com/Light-it-labs/opencpr/releases/tag/v1.0.0
