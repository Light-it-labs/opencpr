# OpenCPR admin portal

The admin portal of the OpenCPR training booths. The people who run booths use it to watch the fleet, read sessions and statistics, manage locations and participants, and invite other users. It talks only to the backend API, under `/api/admin`, and signs in with email magic links or passkeys (cookie session).

`users` are the people who sign in to this portal; `participants` are the people who use the booths.

Built with React 19, Vite, TanStack Router, TanStack Query, TanStack Table, React Hook Form + Zod, Zustand and Tailwind CSS 4 with Tailwind Variants.

## Pages

| Route | What it does |
| --- | --- |
| `/login` | Sign in with a magic link sent by email, or with a passkey |
| `/secure-access` | Shown after a magic-link sign-in to a user with no passkey yet: offers to add one on this device |
| `/` | Dashboard: sessions, participants, average score and kiosks online for a date range and location, with sessions-per-day, score-per-day and per-location charts |
| `/kiosks` | Admins only. Fleet status, sensor state and last heartbeat of each kiosk |
| `/sessions` | Filterable list of sessions; `/sessions/$sessionId` shows one session with its compression chart |
| `/locations` | Create, edit and disable locations |
| `/participants` | The people who used a booth. Admins can export them as CSV and delete them one at a time |
| `/statistics` | Performance for a date range and location: headline figures, score bands, depth and rate distributions, compression quality, the effect of repeat attempts, the registration funnel, sessions by hour and the top sessions |
| `/users` | Admins only. Invite, revoke and re-invite users, change their role (`admin` or `viewer`), limit a viewer to some locations, and approve or reject access requests |
| `/security` | Manage your own passkeys, from the user menu in the header |

## Local setup

```sh
nvm use                 # Node version from .nvmrc
corepack enable         # pnpm version from package.json
pnpm install
cp .env.example .env
pnpm dev
```

`VITE_API_URL` must point at a running OpenCPR backend; see the [backend README](../backend/README.md). Every variable is described in [`.env.example`](.env.example). `VITE_*` variables are baked into the bundle at build time, so after changing one, build again.

## Checks

```sh
pnpm type-check
pnpm lint
pnpm format:check
pnpm spell-check
pnpm build
```

## Recommended VS Code extensions

Listed in `.vscode/extensions.json`: Tailwind CSS IntelliSense, ESLint, Prettier and Code Spell Checker.
