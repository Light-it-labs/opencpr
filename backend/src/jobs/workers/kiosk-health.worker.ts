import { Worker } from "bullmq";

import { KioskHealthLogic } from "@/logic";

import { Sentry } from "../../config/sentry";
import { queueConnection } from "../../services/queue/config";
import { JOB_QUEUE_NAMES, JOB_SCHEDULES } from "../config";

/**
 * One at a time within this process. BullMQ hands each scheduler tick to a
 * single worker across all processes, and the queue's global concurrency keeps
 * a slow run from overlapping the next tick: two overlapping runs could both
 * see the same change and each report it.
 */
export const createKioskHealthWorker = () =>
  new Worker(
    JOB_QUEUE_NAMES.KIOSK_HEALTH,
    async () => {
      await Sentry.withMonitor(
        "kiosk-health-check",
        async () => {
          await KioskHealthLogic.run();
        },
        {
          schedule: { type: "crontab", value: JOB_SCHEDULES.KIOSK_HEALTH },
          checkinMargin: 2,
          maxRuntime: 5,
          timezone: "UTC",
        },
      );
    },
    { connection: queueConnection, concurrency: 1 },
  );
