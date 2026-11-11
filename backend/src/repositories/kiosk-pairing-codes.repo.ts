import { and, eq, isNull } from "drizzle-orm";

import {
  db,
  kioskPairingCodes,
  NewKioskPairingCode,
  type DbExecutor,
} from "../db";

export const KioskPairingCodesRepository = {
  create: async (data: NewKioskPairingCode) => {
    await db.insert(kioskPairingCodes).values(data);
  },

  /**
   * Locks the code's row until the transaction ends, so two booths typing the
   * same code at once are judged one after the other.
   */
  getForUpdate: async (codeHash: string, executor: DbExecutor) => {
    const [code] = await executor
      .select()
      .from(kioskPairingCodes)
      .where(eq(kioskPairingCodes.codeHash, codeHash))
      .for("update");

    return code;
  },

  /** False when the code was already spent, so it can never pair twice. */
  markUsed: async (id: string, executor: DbExecutor) => {
    const [result] = await executor
      .update(kioskPairingCodes)
      .set({ usedAt: new Date(), updatedAt: new Date() })
      .where(
        and(eq(kioskPairingCodes.id, id), isNull(kioskPairingCodes.usedAt)),
      );

    return result.affectedRows > 0;
  },
};
