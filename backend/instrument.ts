/**
 * Loaded before anything else so Sentry can patch express, http and mysql before
 * those modules are imported.
 *
 * This has to be its own module rather than a call at the top of index.ts: ESM
 * hoists every import above the module body, so a function call there would run
 * *after* the app had already been loaded. Import order between modules is
 * preserved, so importing this first does work.
 */
import "dotenv/config";

import { initializeSentry } from "./src/config/sentry";

initializeSentry();
