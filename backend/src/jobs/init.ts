import { setTimeout as sleep } from "node:timers/promises";
import { Queue, Worker } from "bullmq";
import { milliseconds } from "date-fns";

import { logger } from "@/config";

import { Sentry } from "../config/sentry";
import { emailWorker } from "../services/email";
import { queueConnection } from "../services/queue/config";
import { emailQueue } from "../services/queue/queue.service";
import {
  JOB_NAMES,
  JOB_QUEUE_NAMES,
  JOB_SCHEDULER_IDS,
  JOB_SCHEDULES,
  JOB_SETTINGS,
} from "./config";
import { createAuthCleanupWorker } from "./workers/auth-cleanup.worker";
import { createKioskHealthWorker } from "./workers/kiosk-health.worker";

type ScheduledJob = {
  queueName: string;
  schedulerId: string;
  jobName: string;
  pattern: string;
  createWorker: () => Worker;
};

const SCHEDULED_JOBS: ScheduledJob[] = [
  {
    queueName: JOB_QUEUE_NAMES.KIOSK_HEALTH,
    schedulerId: JOB_SCHEDULER_IDS.KIOSK_HEALTH,
    jobName: JOB_NAMES.KIOSK_HEALTH,
    pattern: JOB_SCHEDULES.KIOSK_HEALTH,
    createWorker: createKioskHealthWorker,
  },
  {
    queueName: JOB_QUEUE_NAMES.AUTH_CLEANUP,
    schedulerId: JOB_SCHEDULER_IDS.AUTH_CLEANUP,
    jobName: JOB_NAMES.AUTH_CLEANUP,
    pattern: JOB_SCHEDULES.AUTH_CLEANUP,
    createWorker: createAuthCleanupWorker,
  },
];

const REGISTRATION_ATTEMPTS = 5;
const REGISTRATION_BACKOFF_SECONDS = 2;

const queues: Queue[] = [];
const workers: Worker[] = [];

const messageOf = (error: unknown) =>
  error instanceof Error ? error.message : "unknown";

/**
 * Redis can still be coming up when the API boots, so a first failure is worth
 * retrying before giving up.
 */
const registerScheduler = async (queue: Queue, job: ScheduledJob) => {
  for (let attempt = 1; ; attempt++) {
    try {
      // One run at a time across every process, so a slow run cannot overlap
      // the next tick.
      await queue.setGlobalConcurrency(1);
      await queue.upsertJobScheduler(
        job.schedulerId,
        { pattern: job.pattern },
        { name: job.jobName },
      );

      return;
    } catch (error) {
      if (attempt >= REGISTRATION_ATTEMPTS) {
        throw error;
      }

      logger.warn({
        action: "job_scheduler_retry",
        queue: job.queueName,
        attempt,
        error: messageOf(error),
      });
      await sleep(
        milliseconds({ seconds: REGISTRATION_BACKOFF_SECONDS * attempt }),
      );
    }
  }
};

const startJob = async (job: ScheduledJob) => {
  const queue = new Queue(job.queueName, {
    connection: queueConnection,
    defaultJobOptions: JOB_SETTINGS,
  });
  queue.on("error", (error) => {
    logger.error({
      action: "job_queue_error",
      queue: job.queueName,
      error: error.message,
    });
  });
  queues.push(queue);

  // Before the schedule exists, so the first tick always has a consumer.
  const worker = job.createWorker();
  worker.on("failed", (failedJob, error) => {
    logger.error({
      action: "job_failed",
      queue: job.queueName,
      jobId: failedJob?.id,
      error,
    });

    // The cron monitors flag the missed check-in, but carry no stack.
    if (failedJob && failedJob.attemptsMade >= (failedJob.opts.attempts ?? 1)) {
      Sentry.captureException(error, { tags: { queue: job.queueName } });
    }
  });
  worker.on("error", (error) => {
    logger.error({
      action: "job_worker_error",
      queue: job.queueName,
      error: error.message,
    });
  });
  workers.push(worker);

  try {
    await registerScheduler(queue, job);
  } catch (error) {
    // Running on would leave alerting silently off, so die and let Docker restart it.
    logger.error({
      action: "job_scheduler_failed",
      queue: job.queueName,
      error: messageOf(error),
    });
    Sentry.captureException(error);
    await Sentry.flush(milliseconds({ seconds: 2 }));
    process.exit(1);
  }
};

/**
 * Safe to run from every process: the scheduler ids are fixed, so several API
 * processes upsert the same schedules instead of multiplying them. Each
 * instance still runs workers, and BullMQ hands a given job to only one of
 * them.
 */
export const initializeJobs = async () => {
  for (const job of SCHEDULED_JOBS) {
    await startJob(job);
  }

  logger.info({ action: "jobs_initialized" });
};

/**
 * Closing waits for a run in progress, so a deploy cannot cut a health check
 * between sending the email and recording that it was sent, or a participant
 * email halfway through. The email worker and queue are created on import, so
 * they are closed here too.
 */
export const registerJobsShutdown = () => {
  const shutdown = async () => {
    await Promise.allSettled([
      ...[...workers, emailWorker].map((worker) => worker.close()),
      ...[...queues, emailQueue].map((queue) => queue.close()),
    ]);
    process.exit(0);
  };

  process.once("SIGTERM", () => void shutdown());
  process.once("SIGINT", () => void shutdown());
};
