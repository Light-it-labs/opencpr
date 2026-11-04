import { JobsOptions } from "bullmq";
import { milliseconds } from "date-fns";
import { secondsInDay, secondsInWeek } from "date-fns/constants";

export const JOB_QUEUE_NAMES = {
  KIOSK_HEALTH: "kiosk-health",
  AUTH_CLEANUP: "auth-cleanup",
} as const;

/** Fixed, so every process registers the same schedule instead of adding one. */
export const JOB_SCHEDULER_IDS = {
  KIOSK_HEALTH: "kiosk-health-check",
  AUTH_CLEANUP: "auth-cleanup-daily",
} as const;

export const JOB_NAMES = {
  KIOSK_HEALTH: "check-kiosk-health",
  AUTH_CLEANUP: "clean-auth-tables",
} as const;

/** Cron patterns, evaluated in the server's timezone. */
export const JOB_SCHEDULES = {
  KIOSK_HEALTH: "*/5 * * * *",
  AUTH_CLEANUP: "0 3 * * *",
} as const;

export const JOB_SETTINGS: JobsOptions = {
  attempts: 3,
  backoff: { type: "exponential", delay: milliseconds({ seconds: 5 }) },
  removeOnComplete: { age: secondsInDay, count: 100 },
  removeOnFail: { age: secondsInWeek, count: 500 },
};
