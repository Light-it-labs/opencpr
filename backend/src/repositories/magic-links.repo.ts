import { subDays } from "date-fns";
import { and, eq, gt, isNull, lt, or } from "drizzle-orm";

import { db, magicLinks, NewMagicLink } from "../db";

export const MagicLinksRepository = {
  /**
   * A fresh link supersedes earlier ones, so only the latest email works. One
   * transaction, so a failed insert cannot leave the user with no working link.
   */
  issue: async (data: NewMagicLink) => {
    await db.transaction(async (tx) => {
      await tx
        .update(magicLinks)
        .set({ usedAt: new Date(), updatedAt: new Date() })
        .where(
          and(eq(magicLinks.userId, data.userId), isNull(magicLinks.usedAt)),
        );
      await tx.insert(magicLinks).values(data);
    });
  },

  /**
   * Links are dead once used or expired; the day of grace keeps them around
   * long enough to look into a sign-in complaint.
   */
  deleteExpired: async () => {
    const cutoff = subDays(new Date(), 1);

    await db
      .delete(magicLinks)
      .where(
        or(lt(magicLinks.expiresAt, cutoff), lt(magicLinks.usedAt, cutoff)),
      );
  },

  /**
   * Spends a link and returns whose it was, or null when it is unknown, used
   * or expired. The row is locked between the check and the update, so two
   * simultaneous requests cannot both spend the same link.
   */
  consume: async (tokenHash: string) =>
    await db.transaction(async (tx) => {
      const [link] = await tx
        .select({ id: magicLinks.id, userId: magicLinks.userId })
        .from(magicLinks)
        .where(
          and(
            eq(magicLinks.tokenHash, tokenHash),
            isNull(magicLinks.usedAt),
            gt(magicLinks.expiresAt, new Date()),
          ),
        )
        .for("update");

      if (!link) return null;

      await tx
        .update(magicLinks)
        .set({ usedAt: new Date(), updatedAt: new Date() })
        .where(eq(magicLinks.id, link.id));

      return link.userId;
    }),
};
