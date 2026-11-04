import { and, asc, count, eq } from "drizzle-orm";

import { db, NewPasskey, passkeys } from "../db";

export const PasskeysRepository = {
  listByUser: async (userId: string) =>
    await db.query.passkeys.findMany({
      where: eq(passkeys.userId, userId),
      orderBy: [asc(passkeys.createdAt)],
    }),

  countByUser: async (userId: string) => {
    const [row] = await db
      .select({ total: count() })
      .from(passkeys)
      .where(eq(passkeys.userId, userId));

    return row?.total ?? 0;
  },

  getByCredentialId: async (credentialId: string) =>
    await db.query.passkeys.findFirst({
      where: eq(passkeys.credentialId, credentialId),
    }),

  create: async (data: NewPasskey) => {
    const [inserted] = await db.insert(passkeys).values(data).$returningId();

    if (!inserted) {
      throw new Error("Passkey insert returned no id");
    }

    const created = await db.query.passkeys.findFirst({
      where: eq(passkeys.id, inserted.id),
    });

    if (!created) {
      throw new Error("Passkey was not found after insert");
    }

    return created;
  },

  /**
   * Compare-and-swap on the counter: two logins replaying the same assertion
   * both verify against the old value, but only one can advance it. False
   * means this one lost.
   */
  updateAfterLogin: async (
    id: number,
    previousCounter: number,
    newCounter: number,
  ) => {
    const [result] = await db
      .update(passkeys)
      .set({
        counter: newCounter,
        lastUsedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(and(eq(passkeys.id, id), eq(passkeys.counter, previousCounter)));

    return result.affectedRows > 0;
  },

  /** Scoped to the owner, so one user cannot delete another's passkey. */
  deleteOwned: async (userId: string, id: number) => {
    const [result] = await db
      .delete(passkeys)
      .where(and(eq(passkeys.id, id), eq(passkeys.userId, userId)));

    return result.affectedRows > 0;
  },
};
