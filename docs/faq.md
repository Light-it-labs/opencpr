<!-- cspell:ignore manikin EEPROM udev dialout ModemManager recalibrates Postmark Mailgun Mailpit FQBN -->

# Frequently asked questions

Part of: [Getting started](getting-started.md) › Reference

Short answers to common questions, grouped in the order of the guides, each with a link to the page that has the full story.

1. [About OpenCPR](#about-opencpr)
2. [Planning and buying](#planning-and-buying)
3. [Hardware and the sensor](#hardware-and-the-sensor)
4. [Hosting the software](#hosting-the-software)
5. [The booth computer](#the-booth-computer)
6. [Running a booth](#running-a-booth)
7. [Developing OpenCPR](#developing-opencpr)

## About OpenCPR

The overview is in [Getting started](getting-started.md).

### What is OpenCPR and who is it for?

A hands-only CPR practice kiosk. A visitor does 30 compressions on a training manikin with a distance sensor inside, sees live feedback on depth, rate and recoil, gets a score on the spot and a results card by email. It is for organizations that want a self-service booth in a public space, such as cities, schools, hospitals and nonprofits, and have someone to set it up and answer its alerts. See [Is this for you](getting-started.md#is-this-for-you).

### Is it free, and what license is it under?

Yes, the software is free and open source. OpenCPR is released under the [Apache License 2.0](../LICENSE); attribution notices are in [NOTICE](../NOTICE). OpenCPR is a training tool, not a medical device or a certification course.


### Does it certify people or replace a CPR course?

No. It gives practice and feedback on chest compressions only, issues no certificate, and does not cover the rest of a CPR course. Point visitors who want a qualification to an accredited course near them.

### Is it a medical device?

No. OpenCPR is a training tool. It measures compressions on a manikin, never on a person, and in an emergency the local emergency number comes first.

### Which languages does the kiosk support, and can I translate it?

English only. The kiosk's texts are in `frontend/src/i18n/locales/en.json` and the locale is fixed in `frontend/src/i18n/index.tsx`; there is no language switcher. To translate, add a locale file next to `en.json`, register it in `frontend/src/i18n/`, and change the fixed locale. The admin portal has no translation layer, and the email texts live in the backend.

### Can I change the texts, colors or logo?

Yes, as a code change; there are no branding settings. The kiosk's texts are in `frontend/src/i18n/locales/en.json`, its colors are the CSS variables in `frontend/src/styles.css`, and its logo is `frontend/src/components/logo.tsx` plus `frontend/public/favicon.svg`. The email and results-card templates are in `backend/public/`. Rebuild and deploy after the change. See [Where to change what](architecture.md#where-to-change-what).

## Planning and buying

The full guide is [Getting started](getting-started.md).

### What does a booth cost, roughly?

The repository gives no prices. The manikin is the largest single cost and a new touchscreen the second; a refurbished mini PC is modest, and the sensor kit is the cheapest part. Add the running costs of hosting and an email provider. The full list is in [What to buy](getting-started.md#what-to-buy).

### Can I use any manikin, and does it need a depth clicker?

It needs an adult CPR manikin with a hinged chest plate and room in the chest cavity for the sensor to see the base. A depth clicker is recommended rather than required: calibration measures the sensor's travel at the click, so without one you need another way to compress to a known depth. See [Mounting the sensor](hardware.md#mounting-the-sensor) and [Calibrating for your manikin](hardware.md#calibrating-for-your-manikin).

### Can I run several kiosks at one location, or kiosks at several locations?

Yes, both. Each kiosk picks its location on its setup screen, and the code sets no limit on kiosks per location or on locations. A kiosk is identified by its board's ID, and ranks are counted per location per day. See [Identity and data](architecture.md#identity-and-data).

### How much space and power does a booth need?

The project has no drawings or exact dimensions. Plan for a sturdy table at kneeling height, or a simple wooden cabinet as in [The booth cabinet](hardware.md#the-booth-cabinet), with a mat and room for a visitor to kneel beside the manikin with the touchscreen in view. Power goes to the computer and the touchscreen through a power strip; the Arduino is powered over USB. The booth also needs Ethernet or reliable Wi-Fi.

### How long does one visit take?

The run itself is a 5 s countdown and 30 compressions at 110 bpm, about 20 s. Registration (or the skip button after 20 s) and the tap-through instructions take most of the rest, so a visit typically lasts one to three minutes; that is an estimate, not a measured figure. See [Daily operation](booth-operations.md#daily-operation).

## Hardware and the sensor

The full guide is [Build the sensor](hardware.md).

### Every compression reads uniformly too deep or too shallow

The scale between sensor travel and chest depth is off for your mount. The sensor rides the hinged chest plate further from the hinge than the sternum, so it travels further than the chest does, and the board's depth scale encodes that ratio (1.3 by default; 1.0 for a sensor fixed inside the chest at the compression point). Measure it with a serial monitor as described in [Calibrating for your manikin](hardware.md#calibrating-for-your-manikin) and store it on the board with the `S` command, for example `S1.0`; there is nothing to flash again.

### Scores look wrong for everyone since this morning. What is a bad baseline, and how do I force a fresh one?

The baseline is the resting distance the board samples at boot and on each recalibration; every depth is measured from it. If someone leaned on the chest while the board sampled, the baseline is too low and every stroke reads shallow. The board refuses a sample whose spread or drop against the last trusted baseline is too large, and the kiosk recalibrates on its own 30 s after a run once the chest is still and every 30 minutes while idle, so leaving the manikin alone for half a minute usually fixes it. To force a fresh baseline with no reference to check against, power-cycle the board: unplug the USB cable and plug it back in with nobody touching the chest. See [Baselines](hardware.md#calibrating-for-your-manikin).

### Why does the kiosk ID come from the board, and what happens when I replace the board?

The board mints a random UUID on first boot and keeps it in EEPROM, which survives power loss and firmware uploads, and the kiosk adopts it as its kiosk ID when the `ready` frame arrives. A browser-side ID would change with every new computer, browser profile or domain, which made the same booth show up as several kiosks. The flip side is that a new board is a new kiosk: it appears as a new row in the admin portal, and the old row keeps the old history, because there is no merge tool. Until a board speaks, including in manual mode, the kiosk uses an ID it minted itself. See [Identity and data](architecture.md#identity-and-data).

### Can I use another Arduino or a different distance sensor?

The Arduino Uno R3 is the reference board and a Mega 2560 runs the same sketch; no other board is documented or tested. The only tested sensor is the VL53L4CD; the first prototype used a VL53L0X and moved off it. Another sensor works if the firmware keeps the same serial protocol, as described in [Using a different sensor](sensor.md#using-a-different-sensor).

### Can I try the sensor before building a booth?

Yes. The prototype is an Arduino and the sensor breakout joined by a plug-in JST cable, flashed and read by the kiosk in Chrome on your own laptop, with no manikin, case or booth computer. Move a hand or a card toward the sensor to watch the depth change, or tape it to a manikin's chest plate for a first calibration. See [Prototype on your desk](hardware.md#prototype-on-your-desk).

### Do I need to solder?

Not for the prototype: the sensor's JST connector takes a JST-to-male-pin cable that plugs straight into the Arduino's headers. For the full booth, only four joints: the bare ends of the short JST lead are soldered to one 4-core cable that runs to the case. The breakout itself is never soldered, and the board end never needs solder either; it goes into a screw-terminal shield with crimped ferrules, which hold better than solder-tinned ends. See [Prototype on your desk](hardware.md#prototype-on-your-desk) and [Wiring for the booth](hardware.md#wiring-for-the-booth).

### Do I need a 3D printer for the case?

The documented case is printed, and `base.stl` and `lid.stl` are ready to print, so a print service works if you have no printer. The repository documents no other enclosure. See [The case](hardware.md#the-case).

## Hosting the software

The full guide is [Host the software](hosting.md).

### Do I need to host anything, or can I use only the kiosk?

You need the API. The kiosk's setup screen loads its locations from it and does not leave setup without one, and saving runs, phone registration, emails and the admin portal all go through it. There is no kiosk-only mode. See [What runs where](hosting.md#what-runs-where).

### Can I run it without Docker?

Yes. Build the kiosk and the admin portal as static sites, and run the API as a Node 24 service with MySQL 8 and Redis 7. See [Path B](hosting.md#path-b-static-hosts-plus-a-node-service).

### Can I use my own email provider?

Yes. The API sends every email over SMTP, so any provider works: SendGrid, Postmark, Amazon SES, Mailgun or your own mail server. Set `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASSWORD` and `EMAIL_FROM_ADDRESS`, with a sender the provider lets you send from. On a laptop, the Docker setup catches every email in Mailpit, so no account is needed. See [Settings that have to agree](hosting.md#settings-that-have-to-agree).

### Can I run the whole thing on one small server?

Yes. A virtual server with 2 GB of RAM runs the root `docker-compose.yml` as is: MySQL, Redis, the API and the two static sites. Put a TLS reverse proxy in front with three host names, one each for the kiosk, the admin portal and the API, and keep the container ports closed to the internet. The exact steps are in [Host the software, Path A](hosting.md#path-a-one-small-vps).

### Why does the kiosk have to be served over HTTPS?

The kiosk reads the sensor through Web Serial, which browsers expose only in a secure context, so the kiosk origin must be HTTPS. Passkeys in the admin portal have the same requirement, and the QR code sends visitors' phones to the kiosk's public origin, which a venue-only address cannot serve. `http://localhost` is the one exception, which is why the Docker quickstart works on a laptop without certificates. See [Why HTTPS is not optional](hosting.md#why-https-is-not-optional).

### The magic link opens the admin portal, but I am not signed in. Why?

The session cookie is being dropped. With `APP_ENV` set to anything other than `local`, the API marks the cookie `Secure`, so it never survives a plain `http://` deployment; keep `APP_ENV=local` only while everything runs on `http://localhost`. The cookie is also `SameSite=Lax` and is sent only to the exact origin in `ADMIN_APP_URL`, so the admin portal and the API must share a registrable domain and `ADMIN_APP_URL` must match the address in the browser, scheme and port included. The variables that have to agree are listed in [Settings that have to agree](hosting.md#settings-that-have-to-agree).

### Can I change `ADMIN_RP_ID` after people have enrolled passkeys?

Not without losing them. `ADMIN_RP_ID` is the WebAuthn relying party id, and every passkey is bound to it for life, so a change orphans every enrolled passkey; users fall back to magic links and enroll again. That is also why it has no default: a deployment quietly falling back to `localhost` would enroll credentials that can never be used. Set it once to the admin portal's registrable domain, `example.org` for `admin.example.org`, with no scheme, port or path. See the [backend README](../backend/README.md#admin-auth).

### I changed `VITE_API_URL` in `.env`, but the kiosk still calls the old API

Every `VITE_*` variable is baked into the JavaScript bundle when the front end is built; nothing reads it at runtime. Change the value, then rebuild: `docker compose up --build` for the Docker setup, or `pnpm build` again for a static deployment. The same applies to `VITE_PUBLIC_URL`, which the QR code is generated from. See [Why HTTPS is not optional](hosting.md#why-https-is-not-optional).

### Do I have to set up Sentry?

No. Leave `SENTRY_DSN` and the `VITE_SENTRY_DSN` variables empty and the events are dropped. Without it, the Kiosks page of the admin portal is the only place to see a booth's state, and nobody is notified when one goes down: alert routing lives in Sentry alert rules, not in OpenCPR. The states and when they fire are in [Run a booth, Alerts](booth-operations.md#alerts).

### Does the booth need internet?

Yes, for setup, phone registration, saving runs, the rank, the results email, heartbeats and software updates. Scoring happens on the kiosk, so a run still works offline and waits in the browser until the API has it. What a network drop does during the day is answered under [Running a booth](#what-happens-when-the-venue-network-drops-in-the-middle-of-the-day).

## The booth computer

The full guide is [Booth computer](../scripts/booth/README.md).

### Which computer can run the booth? Is Windows supported?

An x86-64 mini PC with Ubuntu 24.04 (recommended) or a Mac. Windows is not supported: the setup scripts cover Ubuntu and macOS only, including the Chrome serial policy and the autostart. See [Choosing the computer](../scripts/booth/README.md#choosing-the-computer).

### Which browsers work?

On the booth, Google Chrome or Microsoft Edge, the only browsers with Web Serial; the setup scripts install Chrome, and the setup screen warns when Web Serial is missing. Visitors' phones only open a registration form, so a current mobile browser is enough.

### Can the kiosk run without the sensor?

Yes, in manual mode: pick it on the setup screen, and the spacebar or a tap counts a compression. It shows every screen but saves nothing; see [Are manual (spacebar) runs saved?](#are-manual-spacebar-runs-saved).

### Why Google Chrome, and not the Chromium that Ubuntu ships?

Web Serial exists only in Chrome and Edge, and on Ubuntu the stock Chromium is a snap, whose confinement blocks access to the serial device and ignores the managed policy directory the installer writes to. The installer puts Google Chrome's `.deb` build in place instead. See the [booth computer guide](../scripts/booth/README.md).

### Chrome asks for the serial port every time the board is plugged back in

Three things have to be in place for an unattended reconnect: the Chrome policy `SerialAllowUsbDevicesForUrls` for the exact `KIOSK_URL` (check `chrome://policy`), the udev rule that makes Arduino ports writable by `dialout` and keeps ModemManager off them, and the `kiosk` user being in `dialout`, which takes a re-login. On Ubuntu, `install-booth.sh` sets all three; there is no installer on macOS, where only the Chrome serial policy applies, set by `install-chrome-serial-policy.command`. A clone board with a non-Arduino USB chip is outside the policy and the rule: grant it once by hand from `/setup`, and set both `ARDUINO_FQBN` and `SERIAL_PORT` in `booth.env` so the firmware updater can find it; the updater refuses `SERIAL_PORT` without `ARDUINO_FQBN`. See [Troubleshooting](booth-operations.md#troubleshooting).

### How do software and firmware updates reach a sealed booth?

A new web build needs nobody at the booth: the kiosk polls `version.json` every 5 minutes and reloads itself, only from the attract screen, so a deploy never interrupts a run. Firmware is flashed from the booth computer over ssh with `update-firmware.sh` (`update-firmware.command` on a Mac), which pulls the repository, compiles first, parks the kiosk on `/maintenance` so alerts stay quiet, uploads and brings the kiosk back; the board keeps its device ID. See [Maintenance mode](booth-operations.md#maintenance-mode).

## Running a booth

The full guide is [Run a booth](booth-operations.md).

### What data is stored about visitors, and how do I delete someone?

Each participant's first name, last name and email, and each run's score, metrics, compressions, kiosk and location. The results email job also carries the participant's name and email in Redis until the job is cleaned up: up to 1 day after the email is sent, or up to 7 days after it fails. An admin deletes a participant from the admin portal, which removes their runs, compressions and registrations with them. See [Data and privacy](booth-operations.md#data-and-privacy).

### What happens when the venue network drops in the middle of the day?

Finished runs are not lost. The kiosk writes each run to the browser's localStorage before the first send and retries on a backoff, and as soon as the browser is back online, until the API has it; the API accepts a repeated run without duplicating it. What does need the network is the registration step, since the phone form reaches the kiosk through the API, so visitors use the skip button that appears after 20 s; the rank and the results email arrive once the run is saved. See [Running unattended](booth-operations.md#running-unattended).

### A booth was down all night and nobody was told, while another one paged me at 3 am. Why?

Opening hours. A kiosk is judged only while its location should be up: between its start and end dates and inside `opensAt` and `closesAt` in the location's timezone. Outside that window the stored state is frozen rather than muted, so a booth still down ten minutes after opening raises exactly one alert, and switching it off at closing raises none. A location with no hours set is monitored around the clock, which is the 3 am page: set its hours and timezone in the admin portal. See [Alerts](booth-operations.md#alerts).

### Can visitors skip registration and still do a run?

Yes. A skip button appears after 20 s on the QR screen. A skipped run is scored, saved and counted in the day's rank. The results screen has no QR code, so registering after the run only works if the visitor's phone already opened the QR link before the skip: a form sent from that page later is still linked to the run, and the email goes out then. Otherwise the run has no email address and is never emailed. See [Daily operation](booth-operations.md#daily-operation).

### How do I add another admin or a viewer?

An admin invites them from the Users page of the admin portal by email, with the role `admin` or `viewer`; new users start as viewers. A viewer is read-only and can be limited to some locations. Inviting sends no email: share the admin portal's address with the person, and they sign in there with their email, receive a magic link and can then add a passkey. See the [backend README](../backend/README.md#admin-auth).

### How do I see if a booth is down?

The Kiosks page of the admin portal shows each kiosk's state and its last heartbeat. With Sentry configured, a booth that goes silent during opening hours also raises an alert that your Sentry rules route to email or chat. See [Alerts](booth-operations.md#alerts).

### Does a repeat run ask the visitor to scan the QR code again?

No. The Repeat button on the results screen starts a new run under the same registration, so the second attempt lands on the same person's email without another scan. The registration is cleared only when the kiosk returns to the attract screen, through Finish or the 3-minute inactivity reset, so a stranger who taps Repeat on a results screen somebody walked away from inherits that person's identity. Staff who see this happen can tap Finish first. See [Daily operation](booth-operations.md#daily-operation).

### The same person appears twice in Participants

Participants are matched by email address, so a typo or a second address makes a second participant; the name is updated from the most recent registration, but two addresses are never merged. There is no merge tool. An admin can delete the stray participant, which removes their runs, compressions and registrations with them. See [Data and privacy](booth-operations.md#data-and-privacy).

## Developing OpenCPR

The full guide is [How it fits together](architecture.md).

### How do I run it locally?

With Docker, `docker compose up --build` at the repository root brings up the whole stack, emails included; see [Try it on your laptop](../README.md#try-it-on-your-laptop). To work on one application, run `pnpm install && pnpm dev` in its folder, starting with the backend; each folder's README lists its setup.

### Where do I start in the code?

[How it fits together](architecture.md) follows one run through the four components, and its [Where to change what](architecture.md#where-to-change-what) table maps common changes to files.

### How do I contribute?

Open a pull request. Commit messages follow Conventional Commits, which the git hooks from the root `pnpm install` check, and CI runs type-check, lint, format, spell-check and build for every folder, plus the tests for the kiosk (`frontend/`). See [Development](../README.md#development).

### `pnpm install` at the repository root installed almost nothing. Is that right?

Yes. The root `package.json` only installs the git hooks: Conventional Commit messages are checked, and staged files are linted and formatted with each folder's own ESLint and Prettier. There is no pnpm workspace on purpose; `backend/`, `frontend/` and `admin-portal/` each keep their own lockfile, pnpm version and Node version (`.nvmrc`), so run `pnpm install` inside each folder you work on. See the [root README](../README.md#development).

### Why does `drizzle-kit` ask for unrelated variables just to generate a migration?

`drizzle.config.ts` imports the backend's env module, which validates every required variable on load, even though `generate` never connects to a database. Give each one a placeholder value, in `.env` or inline on the command. The CI job `backend migrations` in `.github/workflows/ci.yml` shows a complete set of placeholders that works. See the [backend README](../backend/README.md#migrations).

### How do I add a migration, and why can I not just edit the last one?

Change the model under `backend/src/db/models/`, run `pnpm db:migrate:generate --name <change>` to write a new SQL file and snapshot under `src/db/migrations/`, then `pnpm db:migrate` to apply it. Drizzle records each applied migration by hash in its journal, so editing a file that has already been applied anywhere puts every database that ran it out of step with the journal; add a new migration instead. CI regenerates the migrations and fails the pull request when a model changed without one. See the [backend README](../backend/README.md#migrations).

### `docker compose up` fails because port 3306 or 6379 is already in use

A MySQL or Redis installed natively on your machine owns the port. Set `MYSQL_HOST_PORT` or `REDIS_HOST_PORT` in the root `.env` to a free port, for example `MYSQL_HOST_PORT=3307`, and point the backend's `MYSQL_PORT` or `REDIS_PORT` at the new host port when you run it outside Docker. The containers keep talking to each other on the default ports. See the [root README](../README.md#try-it-on-your-laptop). On a server, the production override (`docker-compose.prod.yml`) publishes neither port, so this does not apply there.

### The kiosk says Web Serial is unavailable in development

Web Serial exists only in Chrome and Edge, and only in a secure context: `http://localhost` counts, a LAN address such as `http://192.168.x.x` over plain HTTP does not. Open the dev server on `localhost` in Chrome. Without a board, pick manual mode on `/setup` and the spacebar simulates compressions. See the [frontend README](../frontend/README.md#local-setup).

### Are manual (spacebar) runs saved?

No. A manual run is a demo of the screens, not a measurement, so it is never sent to the API: it does not appear in the statistics, does not count toward a rank, and sends no email. Only runs in Arduino mode are saved.

### Why do both the kiosk and the backend have a scoring module?

The kiosk needs the score the instant the 30th compression lands, with no network, so `frontend/src/utils/session-scoring.ts` computes it for the screen. The API stores the raw compressions and recomputes the score with `backend/src/utils/session-scoring.ts` when a run is saved, so the database never depends on which kiosk build sent it, and the admin statistics share the guideline constants in `backend/src/utils/cpr-guideline.ts`. A change to the depth band, the rate band or the recoil rule goes into both copies in the same change. See [Where to change what](architecture.md#where-to-change-what).

### I changed the serial protocol in the firmware. What else has to change?

The kiosk parses every frame against the schemas in `frontend/src/utils/cpr-protocol.ts`, so a new or renamed field needs a matching change there, and the two ship together: the firmware updater flashes `hardware/arduino.ino` from the same `main` the kiosk is built from. Keep new fields optional, as `deviceId` and `baselineOk` are, so a booth whose board still runs the previous firmware keeps working. The protocol is documented in the [hardware README](../hardware/README.md#serial-protocol).
