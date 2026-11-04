# OpenCPR documentation

Guides for people who build and run an OpenCPR booth, and for contributors. Read them in this order; [Getting started](getting-started.md) is the roadmap that ties them together.

| Document | Its one job |
| --- | --- |
| [Getting started](getting-started.md) | Decide whether OpenCPR fits, plan the booth, buy the parts, and see the path to a running booth |
| [Build the sensor](hardware.md) | Wire, mount, flash and calibrate the compression sensor, with how the board measures and its serial protocol |
| [The compression sensor](sensor.md) | Why a time-of-flight sensor, how it works, what was tried before it, alternatives, and how to use a different one |
| [Host the software](hosting.md) | Run the API, the kiosk app and the admin portal: the settings that must agree, one-server and managed hosting, backups |
| [Booth computer](../scripts/booth/README.md) | Turn a mini PC or a Mac into a booth: Chrome in kiosk mode, the serial-port policy and the firmware updater |
| [Run a booth](booth-operations.md) | The first day, what visitors see, what the booth does unattended, alerts, maintenance, troubleshooting, data and privacy |
| [How it fits together](architecture.md) | The four components, the life of a run, identity and data, and where to change what |
| [FAQ](faq.md) | Short answers to common questions, grouped in the same order, each pointing at the page with the full story |

## Component READMEs

- [`README.md`](../README.md): the repository, the Docker quickstart and development setup.
- [`frontend/README.md`](../frontend/README.md): the kiosk app, its screens, environment and hosting.
- [`backend/README.md`](../backend/README.md): the API, migrations, auth, the admin API, kiosk alerts and jobs.
- [`admin-portal/README.md`](../admin-portal/README.md): the admin portal and its pages.
- [`hardware/README.md`](../hardware/README.md): the firmware, the serial protocol and the case files.
- [`scripts/booth/ubuntu/README.md`](../scripts/booth/ubuntu/README.md) and [`scripts/booth/macos/README.md`](../scripts/booth/macos/README.md): the per-platform booth setup.
