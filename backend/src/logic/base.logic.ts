import { milliseconds } from "date-fns";

import { logger } from "@/config";

import { db } from "../db";
import { emailQueue } from "../services/queue/queue.service";

const REDIS_PROBE_TIMEOUT_MS = milliseconds({ seconds: 2 });

type EntityHealth = {
  connected: boolean;
};

export const BaseLogic = {
  healthCheck: async () => {
    const [database, redis] = await Promise.all([
      checkDbHealth(),
      checkRedisHealth(),
    ]);

    const allSystemsUp = [database, redis].every(({ connected }) => connected);

    return {
      allSystemsUp,
      status: allSystemsUp ? "All systems operational" : "Impaired systems",
      db: database,
      redis,
    };
  },
};

const withTimeout = <T>(promise: Promise<T>, ms: number) => {
  let timer: NodeJS.Timeout | undefined;
  const timeout = new Promise<never>((_resolve, reject) => {
    timer = setTimeout(() => reject(new Error(`Timed out after ${ms}ms`)), ms);
  });

  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
};

const checkDbHealth = async (): Promise<EntityHealth> => {
  try {
    await db.execute("SELECT 1");
    return { connected: true };
  } catch (error) {
    logger.error({ action: "health_check_failed", dependency: "db", error });
    return { connected: false };
  }
};

/**
 * Probes through the email queue's own client so a health probe never opens a
 * Redis connection of its own. The timeout matters: while Redis is down the
 * client queues commands instead of failing them.
 */
const checkRedisHealth = async (): Promise<EntityHealth> => {
  try {
    await withTimeout(
      emailQueue.client.then((client) => client.info()),
      REDIS_PROBE_TIMEOUT_MS,
    );
    return { connected: true };
  } catch (error) {
    logger.error({ action: "health_check_failed", dependency: "redis", error });
    return { connected: false };
  }
};
