import { eq } from "drizzle-orm";

import { db, kioskAlerts, NewKioskAlert, type DbExecutor } from "../db";

type KioskAlertRow = Pick<NewKioskAlert, "kioskId" | "state">;

export const KioskAlertsRepository = {
  /**
   * Meant to run after KiosksRepository.getForUpdate, which is what serializes
   * evaluations of the same kiosk. Read for update anyway so it always sees the
   * latest committed state rather than the transaction's snapshot. The row is
   * only written on a change, so its timestamps date the last transition.
   */
  getForUpdate: async (kioskId: string, executor: DbExecutor) => {
    const [row] = await executor
      .select({
        state: kioskAlerts.state,
        createdAt: kioskAlerts.createdAt,
        updatedAt: kioskAlerts.updatedAt,
      })
      .from(kioskAlerts)
      .where(eq(kioskAlerts.kioskId, kioskId))
      .for("update");

    return row ?? null;
  },

  upsert: async (
    { kioskId, state }: KioskAlertRow,
    executor: DbExecutor = db,
  ) => {
    await executor
      .insert(kioskAlerts)
      .values({ kioskId, state })
      .onDuplicateKeyUpdate({ set: { state, updatedAt: new Date() } });
  },
};
