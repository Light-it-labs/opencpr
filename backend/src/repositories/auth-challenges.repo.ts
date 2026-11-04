import { isFuture } from "date-fns";
import { and, desc, eq, lt } from "drizzle-orm";

import { AuthChallengeKind, authChallenges, db, NewAuthChallenge } from "../db";

export const AuthChallengesRepository = {
  create: async (data: Omit<NewAuthChallenge, "id">) => {
    const [inserted] = await db
      .insert(authChallenges)
      .values(data)
      .$returningId();

    if (!inserted) {
      throw new Error("Auth challenge insert returned no id");
    }

    return inserted.id;
  },

  /**
   * Reads a challenge and destroys it in one step, so it answers at most one
   * ceremony. An expired one is destroyed too and reads as missing.
   */
  pull: async (id: string) =>
    await db.transaction(async (tx) => {
      const [challenge] = await tx
        .select()
        .from(authChallenges)
        .where(eq(authChallenges.id, id))
        .for("update");

      if (!challenge) return null;

      await tx.delete(authChallenges).where(eq(authChallenges.id, id));

      return isFuture(challenge.expiresAt) ? challenge : null;
    }),

  /**
   * Registration responses carry no challenge id, so the outstanding one is
   * found by owner. Enrolment replaces the previous challenge, leaving at most
   * one per user to pull.
   */
  pullForUserKind: async (userId: string, kind: AuthChallengeKind) =>
    await db.transaction(async (tx) => {
      const [challenge] = await tx
        .select()
        .from(authChallenges)
        .where(
          and(eq(authChallenges.userId, userId), eq(authChallenges.kind, kind)),
        )
        .orderBy(desc(authChallenges.createdAt))
        .limit(1)
        .for("update");

      if (!challenge) return null;

      await tx
        .delete(authChallenges)
        .where(eq(authChallenges.id, challenge.id));

      return isFuture(challenge.expiresAt) ? challenge : null;
    }),

  /** Abandoned ceremonies are never pulled, so they would only accumulate. */
  deleteExpired: async () => {
    await db
      .delete(authChallenges)
      .where(lt(authChallenges.expiresAt, new Date()));
  },

  deleteForUserKind: async (userId: string, kind: AuthChallengeKind) => {
    await db
      .delete(authChallenges)
      .where(
        and(eq(authChallenges.userId, userId), eq(authChallenges.kind, kind)),
      );
  },
};
