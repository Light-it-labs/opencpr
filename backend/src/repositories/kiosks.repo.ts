import { and, count, desc, eq, isNotNull, isNull, max } from "drizzle-orm";

import { KioskHeartbeat } from "@/schemas";

import { cprSessions, db, kiosks, type DbExecutor } from "../db";

export const KiosksRepository = {
  /** One row per kiosk, overwritten each heartbeat: a status board, not history. */
  upsert: async (kioskId: string, data: KioskHeartbeat) => {
    const values = { ...data, kioskId };

    await db
      .insert(kiosks)
      .values(values)
      // deletedAt is cleared so a retired booth returns once it reports again.
      .onDuplicateKeyUpdate({
        set: { ...data, deletedAt: null, updatedAt: new Date() },
      });
  },

  list: async () =>
    await db.query.kiosks.findMany({
      where: isNull(kiosks.deletedAt),
      orderBy: [desc(kiosks.updatedAt)],
    }),

  get: async (kioskId: string, executor: DbExecutor = db) =>
    await executor.query.kiosks.findFirst({
      where: and(eq(kiosks.kioskId, kioskId), isNull(kiosks.deletedAt)),
    }),

  /**
   * Locks the kiosk's row until the transaction ends. The row always exists by
   * the time a kiosk is judged, unlike its kiosk_alerts row, so locking it
   * (rather than a missing row's index gap, which MySQL lets transactions
   * share) is what makes two evaluations of the same kiosk run one at a time.
   * Locked by primary key alone so a retired kiosk is locked too; it is then
   * reported as missing, like get does.
   */
  getForUpdate: async (kioskId: string, executor: DbExecutor) => {
    const [kiosk] = await executor
      .select()
      .from(kiosks)
      .where(eq(kiosks.kioskId, kioskId))
      .for("update");

    return kiosk && !kiosk.deletedAt ? kiosk : undefined;
  },

  /**
   * Runs recorded per kiosk and when the latest one happened. Read from the
   * sessions themselves rather than reported by the booth, so they cannot
   * drift from what was actually stored. Runs predating cpr_sessions.kiosk_id
   * are unattributable and count for nobody.
   */
  getSessionStatsByKiosk: async () => {
    const rows = await db
      .select({
        kioskId: cprSessions.kioskId,
        completions: count(),
        lastVisitAt: max(cprSessions.createdAt),
      })
      .from(cprSessions)
      .where(isNotNull(cprSessions.kioskId))
      .groupBy(cprSessions.kioskId);

    return new Map(rows.map(({ kioskId, ...stats }) => [kioskId, stats]));
  },
};
