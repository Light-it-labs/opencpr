import { eq, lt } from "drizzle-orm";

import { authSessions, db, NewAuthSession, users } from "../db";

export const AuthSessionsRepository = {
  create: async (data: Omit<NewAuthSession, "id">) => {
    const [inserted] = await db
      .insert(authSessions)
      .values(data)
      .$returningId();

    if (!inserted) {
      throw new Error("Auth session insert returned no id");
    }

    return inserted.id;
  },

  /** The session with its owner, so the guard needs a single round trip. */
  get: async (id: string) => {
    const [row] = await db
      .select({
        id: authSessions.id,
        expiresAt: authSessions.expiresAt,
        user: {
          id: users.id,
          email: users.email,
          name: users.name,
          role: users.role,
          lastSeenAt: users.lastSeenAt,
          deletedAt: users.deletedAt,
        },
      })
      .from(authSessions)
      .innerJoin(users, eq(users.id, authSessions.userId))
      .where(eq(authSessions.id, id));

    return row;
  },

  delete: async (id: string) => {
    await db.delete(authSessions).where(eq(authSessions.id, id));
  },

  deleteExpired: async () => {
    await db.delete(authSessions).where(lt(authSessions.expiresAt, new Date()));
  },
};
