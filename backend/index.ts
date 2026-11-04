// Must stay first: it initializes Sentry and loads env before anything below.
import "./instrument";

import { logger } from "@/config";
import { UsersRepository } from "@/repositories";

import { initServer } from "./src/app";
import { Sentry } from "./src/config/sentry";
import { db } from "./src/db";
import { initializeJobs } from "./src/jobs";

(async () => {
  try {
    initServer();
  } catch (err) {
    Sentry.captureException(err);
    logger.error(`Error initializing server: ${String(err)}`);
    return process.exit(1);
  }

  try {
    await db.execute("SELECT 1");
    await UsersRepository.ensureBootstrap();
  } catch (error) {
    // Boot-time failures are handled here rather than thrown, so nothing else
    // would report them.
    Sentry.captureException(error);
    logger.warn("Error initializing databases");
    logger.error({ error });
  }

  // After the check, but not gated on it: a database blip at boot must not
  // leave the schedule unregistered until the next restart. A failing run is
  // retried by the job itself.
  try {
    await initializeJobs();
  } catch (error) {
    Sentry.captureException(error);
    logger.error(`Error initializing jobs: ${String(error)}`);
  }
})();
