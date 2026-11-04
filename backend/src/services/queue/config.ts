import { ConnectionOptions } from "bullmq";

import { env } from "@/config";

export const queueConnection: ConnectionOptions = {
  host: env.REDIS_HOST,
  port: env.REDIS_PORT,
  lazyConnect: true,
  showFriendlyErrorStack: true,
};

export const EMAIL_QUEUE_NAME = "email-queue";
