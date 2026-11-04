import { Worker } from "bullmq";

import { logger } from "@/config";
import {
  AccessRequestsRepository,
  AuthChallengesRepository,
  AuthSessionsRepository,
  MagicLinksRepository,
} from "@/repositories";

import { Sentry } from "../../config/sentry";
import { queueConnection } from "../../services/queue/config";
import { JOB_QUEUE_NAMES, JOB_SCHEDULES } from "../config";

/**
 * Expiry is enforced at read time, so nothing here affects who can sign in: it
 * only stops rows that can never be used again from piling up.
 */
export const createAuthCleanupWorker = () =>
  new Worker(
    JOB_QUEUE_NAMES.AUTH_CLEANUP,
    async () => {
      await Sentry.withMonitor(
        "auth-cleanup-daily",
        async () => {
          await Promise.all([
            AuthSessionsRepository.deleteExpired(),
            MagicLinksRepository.deleteExpired(),
            AuthChallengesRepository.deleteExpired(),
            AccessRequestsRepository.deleteStalePending(),
          ]);
        },
        {
          schedule: { type: "crontab", value: JOB_SCHEDULES.AUTH_CLEANUP },
          checkinMargin: 2,
          maxRuntime: 5,
          timezone: "UTC",
        },
      );

      logger.info({ action: "auth_cleanup_done" });
    },
    { connection: queueConnection, concurrency: 1 },
  );
