# Security policy

OpenCPR stores personal data about booth visitors (name, email and their runs) and lets administrators sign in to a portal, so security reports are taken seriously.

## Reporting a vulnerability

Do not open a public issue. Report it privately with GitHub's [Report a vulnerability](https://github.com/Light-it-labs/opencpr/security/advisories/new) form, or email support@opencpr.org, with:

- what the problem is and where it is (folder, file or endpoint);
- how to reproduce it, or a proof of concept;
- the version or commit you tested.

You will get an acknowledgment within a few working days. Please give the maintainers reasonable time to release a fix before you disclose the issue publicly.

## Supported versions

Security fixes go into the latest release on `main`. Older versions are not patched.

## Known limitations

The endpoints a booth and a visitor's phone call are unauthenticated by design: a booth has no account to sign in with, and visitors register without one. They cover saving a run (`POST /api/cpr-sessions`), the registration a phone files and the kiosk polls (`GET` and `POST /api/cpr-sessions/:publicId/claim`) and the kiosk heartbeat (`POST /api/kiosks/:kioskId/heartbeat`). The location and kiosk ids in these requests are whatever the caller sends. Anyone who can reach the API can therefore post made-up runs for any location, which skews its statistics, send heartbeats that make a kiosk look online, offline or in maintenance, and file registrations. Rate limits are per IP address, so they slow a single client down but do not stop it.

Operators should keep the API behind the TLS reverse proxy as described in [Host the software](docs/hosting.md#what-the-api-leaves-open) and watch the admin portal for runs or kiosks they do not expect. Reports of ways around the checks these endpoints do make, such as claiming someone else's registration, are in scope.

## Scope

In scope: the kiosk app, the API, the admin portal, the firmware and the booth scripts in this repository. Out of scope: how an organization hosts and operates its own deployment (servers, TLS, email provider, network), which is the operator's responsibility.
