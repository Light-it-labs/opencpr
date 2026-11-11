import { and, count, desc, eq, isNotNull, isNull, max } from "drizzle-orm";

import { KioskHeartbeat } from "@/schemas";

import { cprSessions, db, kioskAlerts, kiosks, type DbExecutor } from "../db";

export const KiosksRepository = {
  // deletedAt is cleared so a retired booth returns once it is paired again.
  pair: async (
    {
      kioskId,
      locationId,
      tokenHash,
    }: { kioskId: string; locationId: string; tokenHash: string },
    executor: DbExecutor = db,
  ) => {
    const now = new Date();
    const pairing = { locationId, tokenHash, pairedAt: now };

    await executor
      .insert(kiosks)
      .values({ kioskId, ...pairing })
      .onDuplicateKeyUpdate({
        set: { ...pairing, deletedAt: null, updatedAt: now },
      });
  },

  getByTokenHash: async (tokenHash: string) =>
    await db.query.kiosks.findFirst({
      where: and(eq(kiosks.tokenHash, tokenHash), isNull(kiosks.deletedAt)),
    }),

  /** One row per kiosk, overwritten each heartbeat: a status board, not history. */
  recordHeartbeat: async (kioskId: string, data: KioskHeartbeat) => {
    await db
      .update(kiosks)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(kiosks.kioskId, kioskId));
  },

  // An alert state left behind by no kiosk would block the move, so it is dropped first.
  rekey: async (fromKioskId: string, toKioskId: string) =>
    await db.transaction(async (tx) => {
      const [taken] = await tx
        .select({ kioskId: kiosks.kioskId })
        .from(kiosks)
        .where(eq(kiosks.kioskId, toKioskId))
        .for("update");

      if (taken) {
        return false;
      }

      await tx.delete(kioskAlerts).where(eq(kioskAlerts.kioskId, toKioskId));
      await tx
        .update(kiosks)
        .set({ kioskId: toKioskId })
        .where(eq(kiosks.kioskId, fromKioskId));
      await tx
        .update(kioskAlerts)
        .set({ kioskId: toKioskId })
        .where(eq(kioskAlerts.kioskId, fromKioskId));
      await tx
        .update(cprSessions)
        .set({ kioskId: toKioskId })
        .where(eq(cprSessions.kioskId, fromKioskId));

      return true;
    }),

  // Leaves updatedAt alone: it is the kiosk's last-seen time.
  revokePairing: async (kioskId: string) => {
    const [result] = await db
      .update(kiosks)
      .set({ tokenHash: null, pairedAt: null })
      .where(and(eq(kiosks.kioskId, kioskId), isNull(kiosks.deletedAt)));

    return result.affectedRows > 0;
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
