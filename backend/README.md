# OpenCPR backend

Node 24, Express, Drizzle ORM on MySQL, a BullMQ email worker on Redis, and a
results card rendered with satori + resvg.

## Local setup

```bash
cp .env.example .env   # then set BOOTSTRAP_ADMIN_EMAIL to your address
pnpm install
docker compose up -d   # MySQL, Redis and Mailpit
pnpm db:migrate        # applies src/db/migrations
pnpm db:seed           # local only: resets the database, then seeds an example location and the bootstrap admin
pnpm dev
```

## Email

Magic links, access request notices and results cards go out over SMTP through
Nodemailer (`src/services/email/transport.ts`), so any provider works:
SendGrid, Postmark, Amazon SES, Mailgun or your own server.

- `SMTP_HOST` (required) and `SMTP_PORT` (default `587`).
- `SMTP_SECURE`: `true` for implicit TLS on port 465; leave `false` (default)
  for 587, which upgrades with STARTTLS when the server offers it.
- `SMTP_USER` and `SMTP_PASSWORD`: both or neither. Production needs them; the
  local Mailpit takes none.
- `EMAIL_FROM_ADDRESS`: the sender address of every email.

Locally, `docker compose up -d` starts Mailpit, which accepts any message on
`localhost:1025` and shows it at http://localhost:8025, so no email account is
needed; `.env.example` already points there. The results card and the logo are
attached inline and referenced from the HTML as `cid:challenge-results` and
`cid:logo`.

## Migrations

`src/db/migrations` holds the drizzle-kit history, starting from a single
baseline generated from the models. After changing a model, run
`pnpm db:migrate:generate --name <change>` to add a migration and
`pnpm db:migrate` to apply it. Never edit an applied migration: drizzle tracks
them by hash in its journal.

## Naming: users vs participants

- `users` are the people who sign in to the admin portal (the login side:
  `users`, `auth_sessions`, `magic_links`, `passkeys`, `auth_challenges`).
  Each has a `role`: `admin` or `viewer`.
- `participants` are the people who try the challenge at a booth (formerly the
  `users` table); `cpr_sessions.participant_id` and
  `session_claims.participant_id` point at them.
- The kiosk-facing JSON carries no participant data: `POST /cpr-sessions`
  answers with the run's ranking only, `/locations` lists locations, and the
  heartbeat answers `{ "received": true }`. Admin-only endpoints use
  `participant`.
- "Admin" names the admin portal and its API namespace (`/api/admin/*`, `ADMIN_APP_URL`,
  `ADMIN_RP_ID`), never a person.

## Kiosk API

`GET /locations` backs the kiosk setup screen and lists current and upcoming
locations only: disabled ones and those whose `endDate` (a calendar day in the
location's `timezone`) is already past are left out; a location with no
`endDate` is always listed. The admin list (`GET /admin/locations`) is not
filtered this way.

A booth must be paired before it can report or save runs. An admin creates a
one-time code for a location in the portal (`POST /admin/kiosk-pairing-codes`);
the kiosk's setup screen sends it with `POST /kiosks/pair { code, kioskId }`.
The code is 8 characters, valid for 15 minutes and single-use; case, spaces and
dashes are ignored. A valid code answers 200 with `{ token, location: { id,
name, city } }` and pairs the kiosk with the code's location, creating it or
replacing its earlier token. An unknown, used or expired code answers 400 with
the same body. The endpoint allows 10 requests a minute per IP. Only the
sha256 of codes and tokens is stored.

The heartbeat (`POST /kiosks/:kioskId/heartbeat`) and the run save (`POST
/cpr-sessions`) need `Authorization: Bearer <token>` and answer 401 without a
token of a paired kiosk. Both take the kiosk and its location from the
pairing: a `locationId` or `kioskId` in the body is ignored, and a heartbeat
never creates a kiosk. A heartbeat under another id moves the paired kiosk to
that id (the kiosk adopting its board's id), with its alert state and runs,
and answers 409 if another kiosk already has it; pairing again under that id
resolves it. The claim endpoints stay public.

`POST /cpr-sessions` stores a run and answers 201 with where it placed among
today's runs at that location (today in the location's `timezone`), and nothing
else: `{ publicId, position, percentile, participantsToday }`. `position` is its
rank; the kiosk's results screen and the emailed results card show all three,
and the kiosk uses `publicId` to match the answer to the run on screen.
`participantsToday` counts today's runs at the location, not distinct people.
Sending a `publicId` that is already stored saves nothing new and answers the
same shape for the stored run.

`GET /cpr-sessions/:id` is public and the ids are sequential, so it answers
with the run's scores only: `id`, `locationId`, `score`, `totalCompressions`,
`totalFullCompressions`, `totalFullRebounds`, `averageCompressionEndDepthMm`,
`compressionsOnBpmRange`, `averageBpm`, `durationMs`, `createdAt` and
`position`. It never returns `publicId`, `registrationId` or who played. An
unknown id answers 404.

`POST /cpr-sessions/:registrationId/claim` is the phone form. First and last
name take letters, spaces, apostrophes, hyphens and periods. The first claim on
a registration wins: a claim with another email answers 409, and the same email
again is accepted without sending the results twice. An email that already
belongs to a participant keeps that participant's stored name.

## Admin auth

Access to the admin portal is by invite: only emails in the `users` table can sign
in, with a magic link emailed to them, or with a passkey once enrolled.

Env (see `.env.example`):

- `ADMIN_APP_URL`: origin the admin portal is served from. Magic links point at
  `${ADMIN_APP_URL}/login?token=...` and it is the only origin a passkey
  ceremony is accepted from.
- `ADMIN_RP_ID`: WebAuthn relying party id, required, `localhost` for local
  development. In production it must be the admin portal's registrable domain (for example
  `example.com` for `admin.example.com`), with no scheme, port or path.
  Passkeys are bound to it: changing it later orphans every enrolled passkey.

- `BOOTSTRAP_ADMIN_EMAIL`: the first portal admin. It is created on boot if no
  row, revoked ones included, has its email, so a deployment needs no seed
  command; further users are invited from the portal. `pnpm db:seed` also
  creates it, but resets the whole database first and is for local use only.

Flow: `POST /api/auth/magic-link` answers 202 whether or not the email belongs to a
user, and sends a single-use link only when it is. `POST
/api/auth/magic-link/verify` spends the token and sets the `sid` session
cookie. A signed-in user can enrol passkeys under `/api/auth/passkeys`, after
which `/api/auth/passkeys/login/*` signs in without an email.

Known and accepted: an unknown email answers slightly faster than an invited
one (one lookup versus a token and two small writes). The send itself is not
awaited and the endpoint allows 5 requests a minute per IP, which is enough for
an internal tool.

Deployment: set `APP_ENV=production` (allowed values: `local`, `development`, `staging`,
`production`). The admin portal and the API must be same-site (share a registrable
domain, for example `admin.example.com` and `api.example.com`), because the
session cookie is `SameSite=Lax`
and would not be sent on cross-site requests. Express
trusts one proxy hop (`trust proxy` is 1) whenever `APP_ENV` is not `local`, so
the per-IP rate limits see the client address rather than the proxy's. The
number must match the hops in front of the API: change it in `src/app.ts` if
the proxy setup changes.

Rate limits are per IP and per minute. A booth's own calls (heartbeat, the poll
for its pending registration, the run save) share a budget of 240, apart from
everything else (phones, the portal), which gets 120. The
magic link, passkey and kiosk pairing endpoints add their own tighter limits
on top.

## Admin API

Everything under `/api/admin` sits behind the session cookie (`sid`) and answers
401 without it. Responses are `{ "data": ... }`; dates are ISO 8601 strings.

Users have a `role`. `viewer` is read-only: every `POST`, `PATCH` and `DELETE`
below, plus the participants CSV export, answers 403 unless the caller is an
`admin`. `GET /auth/me` and the login responses include the role. Users created
before roles existed are admins; the bootstrap user is always an admin.

A viewer can be limited to one or more locations (`user_locations`). `GET
/auth/me` and the login responses include `locationIds`: `null` reads every
location (admins always, and viewers with no locations set), otherwise the ids
the user is limited to. For a limited viewer every read below covers only those
locations: a `locationId` outside them answers 403, and leaving it out reads all
of theirs. That covers sessions, stats, performance stats, participants (only
those with a run at one of their locations, with figures and `locations` over
those runs only) and `GET /admin/locations`. A session at another location
answers 404. `GET /kiosks` is admin only; each kiosk carries `pairedAt`
(`null` when unpaired or revoked), never its token.

Asking for a magic link with an email that has no active user still answers
202 with the same body and sends nothing, but files an access request. A new
email, or one approved before whose user was since revoked, becomes `pending`; a
pending one stays pending, but its 15-day cleanup starts again; a rejected one
is left as is. A request never signs anyone in: it lives
in `access_requests`, apart from `users`, until an admin approves it. When a
request becomes `pending`, every active `admin` is emailed through the
`email-queue` worker with a "Review request" link to `ADMIN_APP_URL/users`;
asking again while it is pending sends nothing more, and a delivery failure is
only logged.

Paginated lists take `page` (>= 1, default 1) and `limit` (1 to 100, default
20) and answer `{ "data": [...], "pagination": { "page", "limit", "total",
"totalPages" } }`. `dateFrom` and `dateTo` are `YYYY-MM-DD` in UTC, `dateTo`
inclusive.

Paginated lists also take `sort`: a field name for ascending, `-field` for
descending (`sort=-score`), one field per request. An unknown field answers 400.
With the default sort ties fall back to the row id.

- Sessions: `createdAt` (default `-createdAt`), `score`, `totalCompressions`,
  `averageBpm`, `averageCompressionEndDepthMm`, `location` (name), `participant`
  (last name, then first name).
- Participants: `lastName` (then first name), `firstName`, `email`,
  `sessionsCount`, `bestScore`, `lastPlayedAt` (default `-lastPlayedAt`),
  `createdAt`. `bestScore` and `lastPlayedAt` list participants who never played
  last.

| Method and path                                               | Purpose                                                                                                |
| ------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| `GET /admin/locations?includeDisabled=true`                   | All locations; disabled ones only with the flag.                                                       |
| `POST /admin/locations`                                       | Admin only. Create: `name`, `country`, `city`, `address`, `startDate`, optional `endDate`, `opensAt`, `closesAt` (`HH:mm`, set together), `timezone` (IANA, default `UTC`), `alertsEnabled` (default `true`). 201. |
| `PATCH /admin/locations/:id`                                  | Admin only. Partial update; `endDate: null` clears the end; `opensAt` and `closesAt` both `null` clear the hours. 404 if missing or disabled. |
| `DELETE /admin/locations/:id`                                 | Admin only. Disable (soft delete); kiosk setup stops offering it. 204.                                             |
| `GET /admin/sessions?page&limit&locationId&dateFrom&dateTo&search&sort` | Paginated, newest first, with `location` and `participant`. `search` matches first name, last name or email. |
| `GET /admin/sessions/:id`                                     | One session plus its `compressions`.                                                                   |
| `GET /admin/participants?page&limit&locationId&search&sort`         | Paginated participants with `sessionsCount`, `bestScore`, `lastPlayedAt` and `locations` (`id`, `name`; where they played, most recent first, disabled venues included). With `locationId`, only participants with a run there, with figures and `locations` over those runs only. |
| `GET /admin/participants/export?locationId&dateFrom&dateTo`   | Admin only. CSV (UTF-8 BOM) of the participants who played matching sessions, with their figures over those sessions. |
| `DELETE /admin/participants/:id`                              | Admin only. Hard delete; their sessions, compressions and claims cascade. 204.                         |
| `GET /admin/stats?dateFrom&dateTo&locationId`                 | Totals, `sessionsPerDay` (gaps filled with 0) and `perLocation`. No `dateFrom` = all time from the first session; explicit ranges are capped at 366 days. Days and bounds are calendar days in each session's location timezone, not UTC. |
| `GET /admin/stats/performance?dateFrom&dateTo&locationId`     | Aggregate performance metrics for the Statistics page. Every filter is optional and the range has no cap: missing dates mean all time. |
| `GET /admin/users`                                            | Admin only. Every portal user, revoked ones included (`deletedAt`), with `locationIds` (empty = every location). |
| `POST /admin/users`                                           | Admin only. Invite `{ email, name?, role, locationIds? }`. 409 if active; re-invites a revoked user with that role and those locations. 400 for an unknown location or locations on an admin. No email is sent. 201. |
| `PATCH /admin/users/:id`                                      | Admin only. `{ role?, locationIds? }`, at least one, changes another user's role or locations; `locationIds` replaces the list. Becoming an admin clears it. 400 for yourself, an unknown location or locations on an admin. 200. |
| `DELETE /admin/users/:id`                                    | Admin only. Revoke and end their sessions. 400 for yourself. 204.                                      |
| `POST /admin/kiosk-pairing-codes`                             | Admin only. `{ locationId }` answers 201 with `{ code, expiresAt }`, shown once, valid 15 minutes. 404 for an unknown or disabled location, 400 for one past its end date. |
| `DELETE /admin/kiosks/:kioskId/pairing`                       | Admin only. Revoke the kiosk's token; its heartbeats and run saves answer 401 until it pairs again. 404 if missing. 204. |
| `GET /admin/access-requests`                                  | Admin only. Pending access requests, newest first: `id`, `email`, `status`, `createdAt`.                           |
| `POST /admin/access-requests/:id/approve`                     | Admin only. `{ role, locationIds? }` invites the email with that role and locations (409 if already active; 400 as for an invite) and emails a magic link. 409 unless pending. 200. |
| `POST /admin/access-requests/:id/reject`                      | Admin only. 409 unless pending; later sign-in attempts from that email are not queued again. 200.      |

`GET /admin/stats/performance` answers one object with these keys:

- `range`: the filters as applied (`dateFrom`, `dateTo`, `locationId`, each
  `null` when absent).
- `totals`: sessions, participants, registrations, compressions,
  `handsOnSeconds` (sum of each run's stored `durationMs`; runs without one
  count 0), `averageScore`, `repeaters`.
- `retry`: repeaters, `improved` / `slipped` / `level` (last attempt against
  the first), first and last attempt averages, and `byAttempt` (rows for attempts
  1, 2 and 3, then a last row whose `attempt` is the number 4, covering the
  fourth attempt and every later one).
- `funnel`: registrations against claimed and unclaimed sessions, with average
  score and depth for each side.
- `depth` and `rate`: session counts per bucket around the guideline range and
  the share inside it.
- `scoreBands`: sessions scoring high (80 % of the maximum or more), medium
  (50 % or more) or low.
- `quality`: compression-weighted shares of full depth, full recoil and on-rate
  compressions.
- `byHour`: 24 rows of sessions and average score, in each session's location
  timezone.
- `topSessions`: the ten best runs, one per linked participant, with the
  participant's display name. Unclaimed and anonymous runs are not ranked.

Scores are 0 to 1000; shares are 0 to 1; averages and shares are `null` when
there is nothing to average.

## Kiosk alerts

A BullMQ job (`kiosk-health`, scheduler id `kiosk-health-check`) runs every 5
minutes (`*/5 * * * *`, server timezone) inside the API process, next to the
email worker. Every PM2 instance calls `upsertJobScheduler` with the same id, so
the schedule is registered once; `SIGTERM` and `SIGINT` close the workers before
exiting. The worker starts before the schedule is registered, and registration
is tried up to 5 times, waiting 2, 4, 6 and 8 s between attempts; if it still
fails the process logs to Sentry and exits so PM2 restarts it rather than
running with alerting off. The queue allows one run at a time across
processes. A failed run is tried up to 3 times in all, with exponential backoff
from 5 s.

Only kiosks that should be up are checked. A kiosk is skipped, with no state
write and no event, when its location is missing or disabled, when the location
has `alertsEnabled` off (a test or demo venue), when today is before the
location's `startDate` or after its `endDate` (calendar dates in the location's
`timezone`), or when the location has opening hours and the local
time is outside `[opensAt, closesAt)`. A window where `closesAt` is earlier than
`opensAt` runs through midnight. A location with no hours is monitored 24/7.
Skipping freezes the stored state instead of muting alerts, so a booth that is
still down 10 minutes after opening raises exactly one alert, and nothing fires
when it is switched off at closing. Hours are set per location through the admin
API (`opensAt`, `closesAt`, `timezone`). The `kiosk_health_checked` log line
reports `kiosks`, `skipped`, `evaluated` and `changes`.

A kiosk in maintenance is skipped the same way: while its last heartbeat
reported the `maintenance` serial status, for up to 20 minutes from that
heartbeat. Besides the schedule, every heartbeat triggers an immediate check of
its kiosk. That check is skipped when the kiosk's state changed less than 60 s
ago, because a flapping booth, or anyone holding its token, could otherwise
flip a state back and forth; the scheduled check catches up within minutes.

Each kiosk is reduced to one state, using the thresholds of `GET /kiosks`:

- `offline`: no heartbeat in the last 5 minutes.
- `sensor`: reporting, but the sensor has been silent for over 30 minutes or its
  serial status is not `reading`.
- `ok`: neither.

The last state is kept in `kiosk_alerts`. Only a change between up (`ok`) and
down (`offline` or `sensor`) is reported to Sentry, never the same state again
on the next run. A change between `offline` and `sensor` is recorded without an
event:

| Change                        | Sentry event                                       |
| ----------------------------- | -------------------------------------------------- |
| `ok` to `offline` or `sensor` | `warning`                                          |
| `offline` to `sensor`, back   | recorded, no event                                 |
| First seen, not `ok`          | `warning`                                          |
| `offline` or `sensor` to `ok` | `info` (recovered)                                 |
| First seen, `ok`              | recorded, no event                                 |

Each reported change is one `captureMessage`, for example
`Kiosk <location> (<kioskId>) is offline`, `… has a sensor problem` or
`… recovered`, tagged `kioskId`, `locationId`, `locationName`, `from` and `to`.
The fingerprint includes the kiosk, the new state and the time of the run, so
every transition is its own Sentry issue instead of being folded into an older
one that may be resolved or ignored.

Sentry alert rules decide who is told and how (Slack, email, and so on), so
recipients are managed there, not in this API. Without `SENTRY_DSN`, as in local
development, the events are dropped. The state is stored after the events are
captured, so a failed run is retried with the same changes.

Both jobs report to Sentry Cron Monitors, created on their first check-in:
`kiosk-health-check` (`*/5 * * * *`) and `auth-cleanup-daily` (`0 3 * * *`), each
with a 2 minute check-in margin, a 5 minute maximum runtime and the `UTC`
timezone. A missed or failed run raises a monitor issue.

## Auth cleanup

A second BullMQ job (`auth-cleanup`, scheduler id `auth-cleanup-daily`) runs
daily at 03:00 (`0 3 * * *`, server timezone) and deletes rows that can never
be used again: expired `auth_sessions`, expired `auth_challenges`, and
`magic_links` used or expired more than a day ago, and `access_requests` still
pending 15 days after they were last filed (rejected ones stay, so a rejection
sticks). Sign-in never depends on it,
because expiry is checked when a session, link or challenge is read. It is
registered the same way as the kiosk health job.
